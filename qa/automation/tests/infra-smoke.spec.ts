import { test, expect } from '@playwright/test';
import { dbClient } from '../database/db-client';
import { redisClient } from '../redis/redis-client';
import { transferQueueClient, TRANSFERS_QUEUE_NAME } from '../queues/queue-client';

test.describe('Infrastructure Helpers Smoke Test', () => {

  test('PostgreSQL connection works via DbClient', async () => {
    const isHealthy = await dbClient.healthCheck();
    expect(isHealthy).toBe(true);

    const result = await dbClient.queryOne<{ alive: number }>('SELECT 1 as alive');
    expect(result).not.toBeNull();
    expect(result?.alive).toBe(1);
  });

  test('Redis connection works via RedisClient', async () => {
    const isHealthy = await redisClient.healthCheck();
    expect(isHealthy).toBe(true);

    // Verify safe isolated key operation with cleanup
    const testKey = `wrightpay:qa:smoke:${Date.now()}`;
    await redisClient.set(testKey, 'ok', 10);
    const exists = await redisClient.exists(testKey);
    expect(exists).toBe(true);

    const val = await redisClient.get(testKey);
    expect(val).toBe('ok');

    await redisClient.del(testKey);
    const existsAfterDel = await redisClient.exists(testKey);
    expect(existsAfterDel).toBe(false);
  });

  test('BullMQ transfers queue can be inspected via TransferQueueClient', async () => {
    const isHealthy = await transferQueueClient.healthCheck();
    expect(isHealthy).toBe(true);

    const queue = transferQueueClient.getQueue();
    expect(queue.name).toBe(TRANSFERS_QUEUE_NAME);

    const counts = await transferQueueClient.getJobCounts();
    expect(counts).toBeDefined();
    expect(typeof counts.active).toBe('number');
    expect(typeof counts.completed).toBe('number');
    expect(typeof counts.failed).toBe('number');
  });
});
