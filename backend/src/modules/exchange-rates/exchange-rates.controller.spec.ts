import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';
import { Currency } from '../../core/enums/currency.enum';

describe('ExchangeRatesController', () => {
  let controller: ExchangeRatesController;
  let exchangeRatesService: jest.Mocked<Partial<ExchangeRatesService>>;

  const mockRates = [
    { fromCurrency: Currency.EUR, toCurrency: Currency.USD, rate: 1.08 },
  ];

  const mockQuote = {
    fromCurrency: Currency.EUR,
    toCurrency: Currency.USD,
    sourceAmount: 100,
    targetAmount: 108,
    rate: 1.08,
    expiresAt: new Date(),
  };

  beforeEach(async () => {
    exchangeRatesService = {
      getAllRates: jest.fn().mockResolvedValue(mockRates as any),
      getQuote: jest.fn().mockResolvedValue(mockQuote as any),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExchangeRatesController],
      providers: [
        {
          provide: ExchangeRatesService,
          useValue: exchangeRatesService,
        },
      ],
    }).compile();

    controller = module.get<ExchangeRatesController>(ExchangeRatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getAllRates to exchangeRatesService.getAllRates', async () => {
    const result = await controller.getAllRates();
    expect(exchangeRatesService.getAllRates).toHaveBeenCalled();
    expect(result).toEqual(mockRates);
  });

  it('should delegate getQuote to exchangeRatesService.getQuote with query parameters', async () => {
    const query = { from: Currency.EUR, to: Currency.USD, amount: 100 };
    const result = await controller.getQuote(query);
    expect(exchangeRatesService.getQuote).toHaveBeenCalledWith(Currency.EUR, Currency.USD, 100);
    expect(result).toEqual(mockQuote);
  });
});
