import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdempotencyService } from './idempotency.service';
import { RedisService } from '../../../core/redis/redis.service';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { Currency } from '../../../core/enums/currency.enum';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  const mockRedisStorage: Map<string, string> = new Map();

  const mockRedisService = {
    set: jest.fn().mockImplementation(async (key: string, value: string, mode?: string, duration?: number, flag?: string) => {
      if (flag === 'NX') {
        if (mockRedisStorage.has(key)) {
          return null;
        }
        mockRedisStorage.set(key, value);
        return 'OK';
      }
      mockRedisStorage.set(key, value);
      return 'OK';
    }),
    get: jest.fn().mockImplementation(async (key: string) => {
      return mockRedisStorage.get(key) || null;
    }),
    del: jest.fn().mockImplementation(async (key: string) => {
      const existed = mockRedisStorage.has(key);
      mockRedisStorage.delete(key);
      return existed ? 1 : 0;
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue: any) => defaultValue),
  };

  const sampleDto: CreateTransferDto = {
    sourceWalletId: 'wallet-uuid-1',
    beneficiaryId: 'ben-uuid-1',
    sendAmount: 100.0,
    destinationCurrency: Currency.INR,
  };

  beforeEach(async () => {
    mockRedisStorage.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeWithIdempotency', () => {
    it('should throw BadRequestException if idempotencyKey is missing or empty', async () => {
      const executeFn = jest.fn();

      await expect(
        service.executeWithIdempotency('user-1', '', sampleDto, executeFn),
      ).rejects.toThrow(BadRequestException);

      expect(executeFn).not.toHaveBeenCalled();
    });

    it('should execute transfer on first request and store COMPLETED record in Redis', async () => {
      const mockResult = { id: 'tx-1', reference: 'WP-001', amount: 100 };
      const executeFn = jest.fn().mockResolvedValue(mockResult);

      const result = await service.executeWithIdempotency(
        'user-1',
        'key-001',
        sampleDto,
        executeFn,
      );

      expect(result).toEqual(mockResult);
      expect(executeFn).toHaveBeenCalledTimes(1);

      const redisKey = service.generateKey('user-1', 'key-001');
      const stored = JSON.parse(mockRedisStorage.get(redisKey)!);
      expect(stored.status).toBe('COMPLETED');
      expect(stored.response).toEqual(mockResult);
    });

    it('should return cached response on second identical request without re-executing transfer', async () => {
      const mockResult = { id: 'tx-1', reference: 'WP-001', amount: 100 };
      const executeFn = jest.fn().mockResolvedValue(mockResult);

      // First call
      const res1 = await service.executeWithIdempotency(
        'user-1',
        'key-001',
        sampleDto,
        executeFn,
      );

      // Second call with same key and payload
      const res2 = await service.executeWithIdempotency(
        'user-1',
        'key-001',
        sampleDto,
        executeFn,
      );

      expect(res1).toEqual(mockResult);
      expect(res2).toEqual(mockResult);
      expect(executeFn).toHaveBeenCalledTimes(1); // executed exactly once!
    });

    it('should reject request if same idempotency key is used with a different payload (ConflictException)', async () => {
      const mockResult = { id: 'tx-1', reference: 'WP-001', amount: 100 };
      const executeFn = jest.fn().mockResolvedValue(mockResult);

      // First request (sendAmount: 100)
      await service.executeWithIdempotency(
        'user-1',
        'key-001',
        sampleDto,
        executeFn,
      );

      // Second request with same key but sendAmount: 500
      const conflictingDto: CreateTransferDto = {
        ...sampleDto,
        sendAmount: 500.0,
      };

      await expect(
        service.executeWithIdempotency(
          'user-1',
          'key-001',
          conflictingDto,
          executeFn,
        ),
      ).rejects.toThrow(ConflictException);

      expect(executeFn).toHaveBeenCalledTimes(1);
    });

    it('should isolate idempotency keys by user (different users with same key do not collide)', async () => {
      const resultUser1 = { id: 'tx-1', reference: 'WP-001', userId: 'user-1' };
      const resultUser2 = { id: 'tx-2', reference: 'WP-002', userId: 'user-2' };

      const exec1 = jest.fn().mockResolvedValue(resultUser1);
      const exec2 = jest.fn().mockResolvedValue(resultUser2);

      const res1 = await service.executeWithIdempotency(
        'user-1',
        'common-key',
        sampleDto,
        exec1,
      );

      const res2 = await service.executeWithIdempotency(
        'user-2',
        'common-key',
        sampleDto,
        exec2,
      );

      expect(res1).toEqual(resultUser1);
      expect(res2).toEqual(resultUser2);
      expect(exec1).toHaveBeenCalledTimes(1);
      expect(exec2).toHaveBeenCalledTimes(1);
    });

    it('should delete Redis key if execution fails so that subsequent retry is possible', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('PostgreSQL deadlock error'));

      await expect(
        service.executeWithIdempotency(
          'user-1',
          'retry-key',
          sampleDto,
          failingFn,
        ),
      ).rejects.toThrow('PostgreSQL deadlock error');

      const redisKey = service.generateKey('user-1', 'retry-key');
      expect(mockRedisStorage.has(redisKey)).toBe(false);

      // Subsequent attempt now succeeds
      const successFn = jest.fn().mockResolvedValue({ id: 'tx-success' });
      const result = await service.executeWithIdempotency(
        'user-1',
        'retry-key',
        sampleDto,
        successFn,
      );

      expect(result).toEqual({ id: 'tx-success' });
      expect(successFn).toHaveBeenCalledTimes(1);
    });
  });
});
