import { Test, TestingModule } from '@nestjs/testing';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { Currency } from '../../core/enums/currency.enum';

describe('WalletsController', () => {
  let controller: WalletsController;
  let walletsService: jest.Mocked<Partial<WalletsService>>;

  const mockWallet = {
    id: 'w-1',
    currency: Currency.EUR,
    balance: 500,
    isDefault: true,
    equivalents: { EUR: 500, USD: 540 },
  };

  beforeEach(async () => {
    walletsService = {
      getWalletByUserId: jest.fn().mockResolvedValue(mockWallet),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [
        {
          provide: WalletsService,
          useValue: walletsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WalletsController>(WalletsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getMyWallet to walletsService.getWalletByUserId', async () => {
    const result = await controller.getMyWallet({ id: 'user-1', email: 'test@example.com' });
    expect(walletsService.getWalletByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(mockWallet);
  });
});
