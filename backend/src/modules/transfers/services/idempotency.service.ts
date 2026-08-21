import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RedisService } from '../../../core/redis/redis.service';
import { CreateTransferDto } from '../dto/create-transfer.dto';

export interface IdempotencyRecord<T = any> {
  status: 'PROCESSING' | 'COMPLETED';
  requestHash: string;
  response?: T;
  createdAt: string;
  completedAt?: string;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly defaultTtlSeconds: number;
  private readonly lockTtlSeconds: number = 60; // 60s for processing lock

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.defaultTtlSeconds = Number(
      this.configService.get<number>('IDEMPOTENCY_TTL_SECONDS', 86400),
    );
  }

  generateKey(userId: string, idempotencyKey: string): string {
    return `wrightpay:idempotency:transfer:${userId}:${idempotencyKey.trim()}`;
  }

  computePayloadHash(dto: CreateTransferDto): string {
    const canonicalPayload = {
      sourceWalletId: dto.sourceWalletId,
      beneficiaryId: dto.beneficiaryId,
      sendAmount: Number(dto.sendAmount),
      destinationCurrency: dto.destinationCurrency,
    };
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(canonicalPayload))
      .digest('hex');
  }

  async executeWithIdempotency<T>(
    userId: string,
    idempotencyKey: string | undefined,
    dto: CreateTransferDto,
    executeTransfer: () => Promise<T>,
  ): Promise<T> {
    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const key = this.generateKey(userId, idempotencyKey);
    const requestHash = this.computePayloadHash(dto);

    const initialRecord: IdempotencyRecord = {
      status: 'PROCESSING',
      requestHash,
      createdAt: new Date().toISOString(),
    };

    // Atomic SET NX with lock TTL
    const lockAcquired = await this.redisService.set(
      key,
      JSON.stringify(initialRecord),
      'EX',
      this.lockTtlSeconds,
      'NX',
    );

    if (lockAcquired === 'OK') {
      try {
        const result = await executeTransfer();
        const completedRecord: IdempotencyRecord<T> = {
          status: 'COMPLETED',
          requestHash,
          response: result,
          createdAt: initialRecord.createdAt,
          completedAt: new Date().toISOString(),
        };

        await this.redisService.set(
          key,
          JSON.stringify(completedRecord),
          'EX',
          this.defaultTtlSeconds,
        );

        return result;
      } catch (error) {
        // On failure, delete key so user can retry safely
        await this.redisService.del(key);
        throw error;
      }
    }

    // Key already exists in Redis — check for conflict or replay
    const raw = await this.redisService.get(key);
    if (!raw) {
      // Race condition recovery: lock expired right between SET NX and GET, retry execution
      return this.executeWithIdempotency(userId, idempotencyKey, dto, executeTransfer);
    }

    let existing: IdempotencyRecord<T>;
    try {
      existing = JSON.parse(raw);
    } catch {
      await this.redisService.del(key);
      return this.executeWithIdempotency(userId, idempotencyKey, dto, executeTransfer);
    }

    // Check payload consistency
    if (existing.requestHash !== requestHash) {
      throw new ConflictException(
        'Idempotency key was already used with a different request payload',
      );
    }

    // If completed, return original cached response
    if (existing.status === 'COMPLETED' && existing.response) {
      this.logger.log(`Idempotent replay served for key: ${idempotencyKey}`);
      return existing.response;
    }

    // If still PROCESSING, wait and poll briefly
    if (existing.status === 'PROCESSING') {
      const maxRetries = 25;
      const delayMs = 100;

      for (let i = 0; i < maxRetries; i++) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        const currentRaw = await this.redisService.get(key);
        if (currentRaw) {
          const currentRecord: IdempotencyRecord<T> = JSON.parse(currentRaw);
          if (currentRecord.status === 'COMPLETED' && currentRecord.response) {
            return currentRecord.response;
          }
        }
      }

      throw new ConflictException(
        'A transfer with this idempotency key is currently processing. Please retry shortly.',
      );
    }

    throw new ConflictException('Unable to resolve idempotency status');
  }
}
