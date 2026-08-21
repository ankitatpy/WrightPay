import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransfersService, TRANSFER_FEE } from './transfers.service';
import { IdempotencyService } from './services/idempotency.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction, TransactionStatus } from '../transactions/entities/transaction.entity';
import { Beneficiary, BeneficiaryPayoutMethod } from '../beneficiaries/entities/beneficiary.entity';
import { User, AccountStatus } from '../users/entities/user.entity';
import { Currency } from '../../core/enums/currency.enum';


describe('TransfersService', () => {
  let service: TransfersService;
  let exchangeRatesService: ExchangeRatesService;

  const mockUser: Partial<User> = {
    id: 'user-anna-id',
    email: 'anna.kowalski@example.com',
    accountStatus: AccountStatus.ACTIVE,
  };

  const mockWallet: Partial<Wallet> = {
    id: 'wallet-anna-id',
    userId: 'user-anna-id',
    currency: Currency.EUR,
    balance: 2500.0,
    isDefault: true,
  };

  const mockBeneficiary: Partial<Beneficiary> = {
    id: 'ben-rajesh-id',
    userId: 'user-anna-id',
    name: 'Rajesh Sharma',
    currency: Currency.INR,
    payoutMethod: BeneficiaryPayoutMethod.BANK_ACCOUNT,
    accountNumber: 'IN123456789',
    deletedAt: null,
  };

  const mockUpiBeneficiary: Partial<Beneficiary> = {
    id: 'ben-upi-id',
    userId: 'user-anna-id',
    name: 'Aarav Patel',
    currency: Currency.INR,
    payoutMethod: BeneficiaryPayoutMethod.UPI,
    upiId: 'aarav@upi',
    deletedAt: null,
  };

  let mockQueryRunner: any;

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      isTransactionActive: true,
      manager: {
        findOne: jest.fn(),
        create: jest.fn().mockImplementation((entityClass, data) => ({
          id: 'new-tx-id',
          ...data,
          createdAt: new Date(),
        })),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn(() => mockQueryRunner),
    };

    const mockExchangeRatesService = {
      getRate: jest.fn().mockResolvedValue(89.5),
    };

    const mockIdempotencyService = {
      executeWithIdempotency: jest.fn().mockImplementation((userId, key, dto, fn) => fn()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransfersService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ExchangeRatesService,
          useValue: mockExchangeRatesService,
        },
        {
          provide: IdempotencyService,
          useValue: mockIdempotencyService,
        },
      ],
    }).compile();

    service = module.get<TransfersService>(TransfersService);
    exchangeRatesService = module.get<ExchangeRatesService>(ExchangeRatesService);
    jest.clearAllMocks();
  });


  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create transfer', () => {
    it('should successfully execute atomic transfer, deduct wallet balance with fee, and create PENDING transaction', async () => {
      const walletInstance = { ...mockWallet, balance: 500.0 };
      mockQueryRunner.manager.findOne.mockImplementation((entityClass, options) => {
        if (entityClass === User) return Promise.resolve(mockUser);
        if (entityClass === Beneficiary) return Promise.resolve(mockBeneficiary);
        if (entityClass === Wallet) {
          expect(options.lock).toEqual({ mode: 'pessimistic_write' });
          return Promise.resolve(walletInstance);
        }
        return Promise.resolve(null);
      });

      const dto = {
        sourceWalletId: 'wallet-anna-id',
        beneficiaryId: 'ben-rajesh-id',
        sendAmount: 100.0,
        destinationCurrency: Currency.INR,
      };

      const result = await service.create('user-anna-id', dto);

      expect(result).toBeDefined();
      expect(result.sendAmount).toBe(100.0);
      expect(result.sourceCurrency).toBe(Currency.EUR);
      expect(result.destinationCurrency).toBe(Currency.INR);
      expect(result.fee).toBe(TRANSFER_FEE);
      expect(result.exchangeRate).toBe(89.5);
      expect(result.recipientAmount).toBe(8950.0);
      expect(result.status).toBe(TransactionStatus.PENDING);
      expect(result.reference).toMatch(/^WP-\d{8}-[A-F0-9]{8}$/);

      // Verify wallet balance: 500 - (100 + 25) = 375
      expect(walletInstance.balance).toBe(375.0);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should succeed when sending exact wallet balance minus fee (resulting in 0 balance)', async () => {
      const walletInstance = { ...mockWallet, balance: 125.0 };
      mockQueryRunner.manager.findOne.mockImplementation((entityClass) => {
        if (entityClass === User) return Promise.resolve(mockUser);
        if (entityClass === Beneficiary) return Promise.resolve(mockBeneficiary);
        if (entityClass === Wallet) return Promise.resolve(walletInstance);
        return Promise.resolve(null);
      });

      const dto = {
        sourceWalletId: 'wallet-anna-id',
        beneficiaryId: 'ben-rajesh-id',
        sendAmount: 100.0,
        destinationCurrency: Currency.INR,
      };

      const result = await service.create('user-anna-id', dto);

      expect(result).toBeDefined();
      expect(walletInstance.balance).toBe(0.0);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should reject transfer when amount is zero or negative', async () => {
      await expect(
        service.create('user-anna-id', {
          sourceWalletId: 'wallet-anna-id',
          beneficiaryId: 'ben-rajesh-id',
          sendAmount: 0,
          destinationCurrency: Currency.INR,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create('user-anna-id', {
          sourceWalletId: 'wallet-anna-id',
          beneficiaryId: 'ben-rajesh-id',
          sendAmount: -50,
          destinationCurrency: Currency.INR,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException and rollback if wallet balance is insufficient', async () => {
      const walletInstance = { ...mockWallet, balance: 100.0 }; // needs 100 + 25 = 125
      mockQueryRunner.manager.findOne.mockImplementation((entityClass) => {
        if (entityClass === User) return Promise.resolve(mockUser);
        if (entityClass === Beneficiary) return Promise.resolve(mockBeneficiary);
        if (entityClass === Wallet) return Promise.resolve(walletInstance);
        return Promise.resolve(null);
      });

      const dto = {
        sourceWalletId: 'wallet-anna-id',
        beneficiaryId: 'ben-rajesh-id',
        sendAmount: 100.0,
        destinationCurrency: Currency.INR,
      };

      await expect(service.create('user-anna-id', dto)).rejects.toThrow(
        BadRequestException,
      );

      // Wallet balance must not change
      expect(walletInstance.balance).toBe(100.0);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException (404) if source wallet does not belong to authenticated user', async () => {
      mockQueryRunner.manager.findOne.mockImplementation((entityClass) => {
        if (entityClass === User) return Promise.resolve(mockUser);
        if (entityClass === Beneficiary) return Promise.resolve(mockBeneficiary);
        if (entityClass === Wallet) return Promise.resolve(null); // wallet not found for this user
        return Promise.resolve(null);
      });

      const dto = {
        sourceWalletId: 'other-user-wallet',
        beneficiaryId: 'ben-rajesh-id',
        sendAmount: 50.0,
        destinationCurrency: Currency.INR,
      };

      await expect(service.create('user-anna-id', dto)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException (404) if beneficiary does not belong to authenticated user', async () => {
      mockQueryRunner.manager.findOne.mockImplementation((entityClass) => {
        if (entityClass === User) return Promise.resolve(mockUser);
        if (entityClass === Beneficiary) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const dto = {
        sourceWalletId: 'wallet-anna-id',
        beneficiaryId: 'other-user-beneficiary',
        sendAmount: 50.0,
        destinationCurrency: Currency.INR,
      };

      await expect(service.create('user-anna-id', dto)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException (403) if user account is suspended or closed', async () => {
      mockQueryRunner.manager.findOne.mockImplementation((entityClass) => {
        if (entityClass === User) {
          return Promise.resolve({ ...mockUser, accountStatus: AccountStatus.SUSPENDED });
        }
        return Promise.resolve(null);
      });

      const dto = {
        sourceWalletId: 'wallet-anna-id',
        beneficiaryId: 'ben-rajesh-id',
        sendAmount: 50.0,
        destinationCurrency: Currency.INR,
      };

      await expect(service.create('user-anna-id', dto)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should reject UPI transfer if destination currency is not INR', async () => {
      mockQueryRunner.manager.findOne.mockImplementation((entityClass) => {
        if (entityClass === User) return Promise.resolve(mockUser);
        if (entityClass === Beneficiary) return Promise.resolve(mockUpiBeneficiary);
        return Promise.resolve(null);
      });

      const dto = {
        sourceWalletId: 'wallet-anna-id',
        beneficiaryId: 'ben-upi-id',
        sendAmount: 50.0,
        destinationCurrency: Currency.USD,
      };

      await expect(service.create('user-anna-id', dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
