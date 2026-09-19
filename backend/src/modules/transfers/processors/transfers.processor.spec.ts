import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { TransfersProcessor } from './transfers.processor';
import { Transaction, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { PROCESS_TRANSFER_JOB } from '../constants/transfers.constants';
import { Currency } from '../../../core/enums/currency.enum';

describe('TransfersProcessor', () => {
  let processor: TransfersProcessor;
  let mockTransactionRepository: any;

  const mockTransaction: Partial<Transaction> = {
    id: 'tx-123',
    userId: 'user-1',
    reference: 'WP-20260821-00000001',
    amount: 100.0,
    currency: Currency.EUR,
    fee: 25.0,
    status: TransactionStatus.PENDING,
    recipient: 'Maria Rossi',
  };

  const createMockJob = (data: { transactionId: string }, attemptsMade = 0, maxAttempts = 3): Partial<Job> => ({
    id: 'job-1',
    name: PROCESS_TRANSFER_JOB,
    data,
    attemptsMade,
    opts: {
      attempts: maxAttempts,
    },
  });

  beforeEach(async () => {
    mockTransactionRepository = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn(),
      insert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransfersProcessor,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
      ],
    }).compile();

    processor = module.get<TransfersProcessor>(TransfersProcessor);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process transfer job', () => {
    it('TEST W1: should transition PENDING transaction to PROCESSING and then COMPLETED', async () => {
      const tx = { ...mockTransaction, status: TransactionStatus.PENDING };
      mockTransactionRepository.findOne.mockResolvedValue(tx);

      const job = createMockJob({ transactionId: 'tx-123' }) as Job;
      const result = await processor.process(job);

      expect(result).toEqual({ status: TransactionStatus.COMPLETED, transactionId: 'tx-123' });

      // First update: PENDING -> PROCESSING
      expect(mockTransactionRepository.update).toHaveBeenNthCalledWith(
        1,
        { id: 'tx-123', status: TransactionStatus.PENDING },
        { status: TransactionStatus.PROCESSING },
      );

      // Second update: PROCESSING -> COMPLETED
      expect(mockTransactionRepository.update).toHaveBeenNthCalledWith(
        2,
        { id: 'tx-123' },
        { status: TransactionStatus.COMPLETED },
      );
    });

    it('TEST W2: should safely ignore COMPLETED transaction when job is redelivered', async () => {
      const tx = { ...mockTransaction, status: TransactionStatus.COMPLETED };
      mockTransactionRepository.findOne.mockResolvedValue(tx);

      const job = createMockJob({ transactionId: 'tx-123' }) as Job;
      const result = await processor.process(job);

      expect(result).toEqual({ status: TransactionStatus.COMPLETED, transactionId: 'tx-123' });
      expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    });

    it('TEST W3: should safely handle PROCESSING transaction without restarting incorrectly', async () => {
      const tx = { ...mockTransaction, status: TransactionStatus.PROCESSING };
      mockTransactionRepository.findOne.mockResolvedValue(tx);

      const job = createMockJob({ transactionId: 'tx-123' }) as Job;
      const result = await processor.process(job);

      expect(result).toEqual({ status: TransactionStatus.COMPLETED, transactionId: 'tx-123' });
      // Should not attempt conditional PENDING -> PROCESSING update
      expect(mockTransactionRepository.update).toHaveBeenCalledTimes(1);
      expect(mockTransactionRepository.update).toHaveBeenCalledWith(
        { id: 'tx-123' },
        { status: TransactionStatus.COMPLETED },
      );
    });

    it('TEST W4: should not process FAILED transaction again', async () => {
      const tx = { ...mockTransaction, status: TransactionStatus.FAILED };
      mockTransactionRepository.findOne.mockResolvedValue(tx);

      const job = createMockJob({ transactionId: 'tx-123' }) as Job;
      const result = await processor.process(job);

      expect(result).toEqual({ status: TransactionStatus.FAILED, transactionId: 'tx-123' });
      expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    });

    it('TEST W5: should not process SUSPICIOUS transaction again', async () => {
      const tx = { ...mockTransaction, status: TransactionStatus.SUSPICIOUS };
      mockTransactionRepository.findOne.mockResolvedValue(tx);

      const job = createMockJob({ transactionId: 'tx-123' }) as Job;
      const result = await processor.process(job);

      expect(result).toEqual({ status: TransactionStatus.SUSPICIOUS, transactionId: 'tx-123' });
      expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    });

    it('TEST W6: should throw error if transaction is not found in database', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      const job = createMockJob({ transactionId: 'non-existent-id' }) as Job;
      await expect(processor.process(job)).rejects.toThrow('Transaction non-existent-id not found');

      expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    });

    it('TEST W7: should NOT mutate any wallet balance (no wallet repository injected or called)', async () => {
      const tx = { ...mockTransaction, status: TransactionStatus.PENDING };
      mockTransactionRepository.findOne.mockResolvedValue(tx);

      const job = createMockJob({ transactionId: 'tx-123' }) as Job;
      await processor.process(job);

      // Verify processor contains no wallet repository operations
      expect((processor as any).walletRepository).toBeUndefined();
    });

    it('TEST W8: should NOT create another transaction record (no insert/save called)', async () => {
      const tx = { ...mockTransaction, status: TransactionStatus.PENDING };
      mockTransactionRepository.findOne.mockResolvedValue(tx);

      const job = createMockJob({ transactionId: 'tx-123' }) as Job;
      await processor.process(job);

      expect(mockTransactionRepository.insert).not.toHaveBeenCalled();
      expect(mockTransactionRepository.save).not.toHaveBeenCalled();
    });

    it('TEST W9: should safely handle race condition when concurrent worker already completed transaction', async () => {
      const tx = { ...mockTransaction, status: TransactionStatus.PENDING };
      // First findOne returns PENDING
      mockTransactionRepository.findOne
        .mockResolvedValueOnce(tx)
        // Conditional update returns affected: 0 (lost race)
        // Second findOne returns COMPLETED (won by other worker)
        .mockResolvedValueOnce({ ...tx, status: TransactionStatus.COMPLETED });

      mockTransactionRepository.update.mockResolvedValueOnce({ affected: 0 });

      const job = createMockJob({ transactionId: 'tx-123' }) as Job;
      const result = await processor.process(job);

      expect(result).toEqual({ status: TransactionStatus.COMPLETED, transactionId: 'tx-123' });
    });

    it('TEST W10: should mark transaction as FAILED on final retry attempt if processing throws an error', async () => {
      const tx = { ...mockTransaction, recipient: 'SIMULATE_FAILURE Recipient', status: TransactionStatus.PENDING };
      mockTransactionRepository.findOne.mockResolvedValue(tx);

      // Last attempt (attempt 2 out of 3, 0-indexed)
      const job = createMockJob({ transactionId: 'tx-123' }, 2, 3) as Job;

      await expect(processor.process(job)).rejects.toThrow('Simulated banking settlement failure');

      expect(mockTransactionRepository.update).toHaveBeenCalledWith(
        { id: 'tx-123' },
        {
          status: TransactionStatus.FAILED,
          failureReason: 'Simulated banking settlement failure',
        },
      );
    });
  });
});
