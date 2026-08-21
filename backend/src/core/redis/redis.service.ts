import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.client = new Redis(redisUrl);
    } else {
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = Number(this.configService.get<number>('REDIS_PORT', 6379));
      this.client = new Redis({ host, port });
    }

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, mode?: 'EX', duration?: number, flag?: 'NX'): Promise<'OK' | null> {
    if (mode === 'EX' && duration && flag === 'NX') {
      return this.client.set(key, value, 'EX', duration, 'NX');
    }
    if (mode === 'EX' && duration) {
      return this.client.set(key, value, 'EX', duration);
    }
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
