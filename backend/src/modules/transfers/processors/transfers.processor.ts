import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Transaction, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { TRANSFERS_QUEUE, PROCESS_TRANSFER_JOB } from '../constants/transfers.constants';

export interface TransferJobData {
  transactionId: string;
}

@Injectable()
@Processor(TRANSFERS_QUEUE)
export class TransfersProcessor extends WorkerHost {
  private readonly logger = new Logger(TransfersProcessor.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {
    super();
  }

  async process(job: Job<TransferJobData>): Promise<any> {
    const { name, data, id: jobId } = job;

    if (name !== PROCESS_TRANSFER_JOB) {
      this.logger.warn(`Ignoring unknown job name "${name}" (jobId: ${jobId})`);
      return;
    }

    const { transactionId } = data;
    if (!transactionId) {
      this.logger.error(`Missing transactionId in job ${jobId}`);
      throw new Error(`Missing transactionId in job ${jobId}`);
    }

    this.logger.log(`Received job ${jobId} for transaction: ${transactionId}`);

    // 1. Fetch canonical transaction from PostgreSQL
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      this.logger.error(`Transaction ${transactionId} not found in database for job ${jobId}`);
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // 2. Idempotent check on transaction status
    if (transaction.status === TransactionStatus.COMPLETED) {
      this.logger.log(
        `Transaction ${transactionId} is already COMPLETED. Safely skipping execution for job ${jobId}.`,
      );
      return { status: TransactionStatus.COMPLETED, transactionId };
    }

    if (transaction.status === TransactionStatus.FAILED) {
      this.logger.warn(
        `Transaction ${transactionId} is already FAILED. Skipping execution for job ${jobId}.`,
      );
      return { status: TransactionStatus.FAILED, transactionId };
    }

    if (transaction.status === TransactionStatus.SUSPICIOUS) {
      this.logger.warn(
        `Transaction ${transactionId} is flagged SUSPICIOUS. Skipping execution for job ${jobId}.`,
      );
      return { status: TransactionStatus.SUSPICIOUS, transactionId };
    }

    // 3. Transition: PENDING -> PROCESSING using atomic conditional update
    if (transaction.status === TransactionStatus.PENDING) {
      const updateResult = await this.transactionRepository.update(
        { id: transactionId, status: TransactionStatus.PENDING },
        { status: TransactionStatus.PROCESSING },
      );

      if (updateResult.affected === 0) {
        // Race condition check: another worker moved the status concurrently
        const recheck = await this.transactionRepository.findOne({
          where: { id: transactionId },
        });
        if (recheck?.status === TransactionStatus.COMPLETED) {
          this.logger.log(
            `Transaction ${transactionId} completed by another worker. Skipping job ${jobId}.`,
          );
          return { status: TransactionStatus.COMPLETED, transactionId };
        }
      } else {
        this.logger.log(`Transitioned transaction ${transactionId}: PENDING -> PROCESSING`);
      }
    }

    // 4. Execute transfer processing logic
    try {
      await this.processTransfer(transaction);

      // 5. Transition: PROCESSING -> COMPLETED
      await this.transactionRepository.update(
        { id: transactionId },
        { status: TransactionStatus.COMPLETED },
      );

      this.logger.log(
        `Transitioned transaction ${transactionId}: PROCESSING -> COMPLETED (reference: ${transaction.reference})`,
      );

      return { status: TransactionStatus.COMPLETED, transactionId };
    } catch (error) {
      this.logger.error(
        `Processing failed for transaction ${transactionId}: ${error.message}`,
        error.stack,
      );

      // If attempts exhausted (or non-retryable simulated failure), mark as FAILED
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts || 3) - 1;
      if (isLastAttempt || error.message?.includes('NON_RETRYABLE')) {
        await this.transactionRepository.update(
          { id: transactionId },
          {
            status: TransactionStatus.FAILED,
            failureReason: error.message || 'Transfer processing failed',
          },
        );
        this.logger.warn(
          `Marked transaction ${transactionId} as FAILED (Reason: ${error.message})`,
        );
      }

      throw error;
    }
  }

  /**
   * Core processing method (simulates external banking / payment gateway settlement)
   */
  async processTransfer(transaction: Transaction): Promise<void> {
    // Check for simulated failure scenarios in test environments
    if (transaction.recipient?.includes('SIMULATE_FAILURE')) {
      throw new Error('Simulated banking settlement failure');
    }

    // Settlement simulation delay (50ms)
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
