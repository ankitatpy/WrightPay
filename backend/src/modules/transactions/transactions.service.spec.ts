import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { Currency } from '../../core/enums/currency.enum';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockTransactionAnna: Partial<Transaction> = {
    id: 'tx-anna-1',
    userId: 'user-anna-id',
    reference: 'WP-20260816-001',
    recipient: 'Rajesh Sharma',
    amount: 500.0,
    currency: Currency.EUR,
    senderAmount: 500.0,
    senderCurrency: Currency.EUR,
    recipientAmount: 45250.0,
    recipientCurrency: Currency.INR,
    fee: 25.0,
    exchangeRate: 90.5,
    status: TransactionStatus.COMPLETED,
    failureReason: null,
    date: new Date('2026-08-16T10:00:00Z'),
    createdAt: new Date('2026-08-16T10:00:00Z'),
  };

  const mockTransactionAnna2: Partial<Transaction> = {
    id: 'tx-anna-2',
    userId: 'user-anna-id',
    reference: 'WP-20260815-002',
    recipient: 'Priya Patel',
    amount: 250.0,
    currency: Currency.EUR,
    senderAmount: 250.0,
    senderCurrency: Currency.EUR,
    recipientAmount: 22625.0,
    recipientCurrency: Currency.INR,
    fee: 25.0,
    exchangeRate: 90.5,
    status: TransactionStatus.PROCESSING,
    failureReason: null,
    date: new Date('2026-08-15T10:00:00Z'),
    createdAt: new Date('2026-08-15T10:00:00Z'),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTransactions', () => {
    it('should return authenticated user transactions with default pagination', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([
        [mockTransactionAnna, mockTransactionAnna2],
        2,
      ]);

      const result = await service.getTransactions('user-anna-id', {});

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(result.items[0].id).toBe('tx-anna-1');
      expect(result.items[0].amount).toBe(500);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('tx.userId = :userId', {
        userId: 'user-anna-id',
      });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should return empty items array when user has no transactions', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([[], 0]);

      const result = await service.getTransactions('user-empty-id', {});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter by transaction status', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([[mockTransactionAnna], 1]);

      const result = await service.getTransactions('user-anna-id', {
        status: TransactionStatus.COMPLETED,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe(TransactionStatus.COMPLETED);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('tx.status = :status', {
        status: TransactionStatus.COMPLETED,
      });
    });

    it('should filter by reference / recipient search term', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([[mockTransactionAnna], 1]);

      const result = await service.getTransactions('user-anna-id', {
        reference: 'WP-20260816',
      });

      expect(result.items).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(tx.reference ILIKE :ref OR tx.recipient ILIKE :ref)',
        { ref: '%WP-20260816%' },
      );
    });

    it('should apply custom pagination parameters (limit and offset)', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([[mockTransactionAnna2], 2]);

      const result = await service.getTransactions('user-anna-id', {
        limit: 1,
        offset: 1,
      });

      expect(result.items).toHaveLength(1);
      expect(result.limit).toBe(1);
      expect(result.offset).toBe(1);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(1);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(1);
    });

    it('should safely convert PostgreSQL numeric string types to numbers', async () => {
      const stringDecimalTx = {
        ...mockTransactionAnna,
        amount: '500.00' as any,
        senderAmount: '500.00' as any,
        recipientAmount: '45250.00' as any,
        fee: '25.00' as any,
        exchangeRate: '90.5000' as any,
      };

      mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([[stringDecimalTx], 1]);

      const result = await service.getTransactions('user-anna-id', {});
      expect(result.items[0].amount).toBe(500);
      expect(result.items[0].senderAmount).toBe(500);
      expect(result.items[0].recipientAmount).toBe(45250);
      expect(result.items[0].fee).toBe(25);
      expect(result.items[0].exchangeRate).toBe(90.5);
    });
  });

  describe('getTransactionById', () => {
    it('should return the user transaction by ID', async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockTransactionAnna);

      const result = await service.getTransactionById('user-anna-id', 'tx-anna-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('tx-anna-1');
      expect(result.reference).toBe('WP-20260816-001');
      expect(result.amount).toBe(500);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tx-anna-1', userId: 'user-anna-id' },
      });
    });

    it('should throw NotFoundException (404) if transaction belongs to another user', async () => {
      // findOne returns null when querying with other user ID
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.getTransactionById('user-tariq-id', 'tx-anna-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException (404) if transaction does not exist', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.getTransactionById('user-anna-id', 'non-existent-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
