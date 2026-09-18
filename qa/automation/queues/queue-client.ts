import { Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/env.config';

export const TRANSFERS_QUEUE_NAME = 'transfers';
export const PROCESS_TRANSFER_JOB_NAME = 'process-transfer';

export interface TransferJobData {
  transactionId: string;
}

export class TransferQueueClient {
  private queue: Queue<TransferJobData>;
  private connection: IORedis;

  constructor(queueName: string = TRANSFERS_QUEUE_NAME, redisUrl?: string) {
    const url = redisUrl || config.redisUrl;

    // BullMQ requires maxRetriesPerRequest: null for blocking Redis operations
    this.connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    this.connection.on('error', (err) => {
      console.error('[TransferQueueClient] Redis connection error:', err.message);
    });

    this.queue = new Queue<TransferJobData>(queueName, {
      connection: this.connection,
    });
  }

  /**
   * Fetch a job by its unique jobId (e.g., "transfer-<transactionId>").
   */
  async getJob(jobId: string): Promise<Job<TransferJobData> | undefined> {
    return this.queue.getJob(jobId);
  }

  /**
   * Retrieve the current state of a job ('completed' | 'failed' | 'delayed' | 'active' | 'waiting' | 'unknown').
   */
  async getJobState(jobId: string): Promise<string | undefined> {
    const job = await this.getJob(jobId);
    if (!job) return undefined;
    return job.getState();
  }

  /**
   * Inspect job counts by status (active, completed, failed, delayed, waiting, paused).
   */
  async getJobCounts(): Promise<Record<string, number>> {
    return this.queue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting', 'paused');
  }

  /**
   * Poll and wait for a job to reach an expected status within a timeout window.
   * Useful in async integration tests where transfers process in background.
   */
  async waitForJobStatus(
    jobId: string,
    targetStatus: string | string[],
    timeoutMs: number = 10000,
    pollIntervalMs: number = 200,
  ): Promise<Job<TransferJobData> | undefined> {
    const targets = Array.isArray(targetStatus) ? targetStatus : [targetStatus];
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const job = await this.getJob(jobId);
      if (job) {
        const currentState = await job.getState();
        if (targets.includes(currentState)) {
          return job;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    const finalJob = await this.getJob(jobId);
    const finalState = finalJob ? await finalJob.getState() : 'not_found';
    throw new Error(
      `Job ${jobId} did not reach status [${targets.join(', ')}] within ${timeoutMs}ms. Current state: ${finalState}`,
    );
  }

  /**
   * Health check confirming that BullMQ can inspect the queue on Redis without mutating it.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const counts = await this.getJobCounts();
      return counts !== null && typeof counts === 'object';
    } catch (error) {
      console.error('[TransferQueueClient] Health check failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Graceful cleanup of BullMQ queue and its dedicated Redis connection.
   */
  async close(): Promise<void> {
    try {
      await this.queue.close();
    } finally {
      if (this.connection.status === 'ready' || this.connection.status === 'connecting') {
        await this.connection.quit();
      }
    }
  }

  /**
   * Access the underlying BullMQ Queue instance.
   */
  getQueue(): Queue<TransferJobData> {
    return this.queue;
  }
}

export const transferQueueClient = new TransferQueueClient();
export default transferQueueClient;
