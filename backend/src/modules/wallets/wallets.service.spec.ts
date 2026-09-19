import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { Wallet } from './entities/wallet.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Currency } from '../../core/enums/currency.enum';

describe('WalletsService', () => {
  let service: WalletsService;

  const mockWallet: Partial<Wallet> = {
    id: 'wallet-uuid-1',
    userId: 'user-uuid-1',
    currency: Currency.EUR,
    balance: 2500.0,
    isDefault: true,
  };

  const mockWalletRepository = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.userId === 'user-uuid-1') {
        return Promise.resolve(mockWallet);
      }
      return Promise.resolve(null);
    }),
  };

  const mockExchangeRatesService = {
    getRate: jest.fn().mockImplementation((from: Currency, to: Currency) => {
      if (from === to) return Promise.resolve(1.0);
      const rates: Record<string, number> = {
        'EUR-USD': 1.08,
        'EUR-GBP': 0.85,
        'EUR-AED': 3.96,
        'EUR-PLN': 4.3,
        'EUR-INR': 89.5,
      };
      return Promise.resolve(rates[`${from}-${to}`] || 1.0);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockWalletRepository,
        },
        {
          provide: ExchangeRatesService,
          useValue: mockExchangeRatesService,
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWalletByUserId', () => {
    it('should retrieve wallet and calculate currency equivalents for all supported currencies', async () => {
      const result = await service.getWalletByUserId('user-uuid-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('wallet-uuid-1');
      expect(result.currency).toBe(Currency.EUR);
      expect(result.balance).toBe(2500.0);
      expect(result.isDefault).toBe(true);

      expect(result.equivalents).toEqual({
        EUR: 2500.0,
        USD: 2700.0, // 2500 * 1.08
        GBP: 2125.0, // 2500 * 0.85
        AED: 9900.0, // 2500 * 3.96
        PLN: 10750.0, // 2500 * 4.30
        INR: 223750.0, // 2500 * 89.50
      });
    });

    it('should handle PostgreSQL numeric string balance safely', async () => {
      mockWalletRepository.findOne.mockResolvedValueOnce({
        id: 'wallet-uuid-2',
        userId: 'user-uuid-1',
        currency: Currency.EUR,
        balance: '1000.50' as any, // Simulate string from PostgreSQL decimal column
        isDefault: true,
      });

      const result = await service.getWalletByUserId('user-uuid-1');
      expect(result.balance).toBe(1000.5);
      expect(result.equivalents.USD).toBe(1080.54); // 1000.50 * 1.08
    });

    it('should throw NotFoundException if no wallet is found for the user', async () => {
      await expect(service.getWalletByUserId('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
