import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { Currency } from '../../core/enums/currency.enum';

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService;

  const mockRates: Partial<ExchangeRate>[] = [
    { from: Currency.EUR, to: Currency.USD, rate: 1.08 },
    { from: Currency.EUR, to: Currency.GBP, rate: 0.85 },
    { from: Currency.EUR, to: Currency.AED, rate: 3.96 },
    { from: Currency.EUR, to: Currency.PLN, rate: 4.3 },
    { from: Currency.EUR, to: Currency.INR, rate: 89.5 },
  ];

  const mockRepository = {
    find: jest.fn().mockResolvedValue(mockRates),
    findOne: jest.fn().mockImplementation(({ where }) => {
      const found = mockRates.find(
        (r) => r.from === where.from && r.to === where.to,
      );
      return Promise.resolve(found || null);
    }),
  };

  beforeEach(async () => {
    mockRepository.findOne.mockImplementation(({ where }) => {
      const found = mockRates.find(
        (r) => r.from === where.from && r.to === where.to,
      );
      return Promise.resolve(found || null);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        {
          provide: getRepositoryToken(ExchangeRate),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ExchangeRatesService>(ExchangeRatesService);
  });


  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRate', () => {
    it('should return 1.0 for same-currency conversion', async () => {
      const rate = await service.getRate(Currency.EUR, Currency.EUR);
      expect(rate).toBe(1.0);
    });

    it('should calculate direct rate correctly (EUR -> USD)', async () => {
      const rate = await service.getRate(Currency.EUR, Currency.USD);
      expect(rate).toBe(1.08);
    });

    it('should calculate inverse rate correctly (USD -> EUR)', async () => {
      const rate = await service.getRate(Currency.USD, Currency.EUR);
      // 1 / 1.08 = 0.925926
      expect(rate).toBe(0.925926);
    });

    it('should calculate triangular rate correctly (USD -> INR via EUR)', async () => {
      const rate = await service.getRate(Currency.USD, Currency.INR);
      // USD -> EUR (1 / 1.08) * (EUR -> INR 89.5) = 89.5 / 1.08 = 82.87037
      expect(rate).toBe(82.87037);
    });

    it('should throw NotFoundException for unsupported currency pair without conversion path', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(
        service.getRate('XYZ' as Currency, 'ABC' as Currency),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getQuote', () => {
    it('should return a valid quote with converted amount for EUR -> INR', async () => {
      const quote = await service.getQuote(Currency.EUR, Currency.INR, 100);
      expect(quote).toEqual({
        from: Currency.EUR,
        to: Currency.INR,
        amount: 100,
        rate: 89.5,
        convertedAmount: 8950.0,
      });
    });

    it('should handle decimal amounts and precision rounding', async () => {
      const quote = await service.getQuote(Currency.EUR, Currency.GBP, 125.5);
      // 125.5 * 0.85 = 106.675 -> 106.68
      expect(quote.convertedAmount).toBe(106.68);
      expect(quote.amount).toBe(125.5);
    });

    it('should throw BadRequestException for non-positive amounts', async () => {
      await expect(
        service.getQuote(Currency.EUR, Currency.USD, 0),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.getQuote(Currency.EUR, Currency.USD, -10),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllRates', () => {
    it('should return all rates from the repository', async () => {
      const rates = await service.getAllRates();
      expect(rates).toEqual(mockRates);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });
});
