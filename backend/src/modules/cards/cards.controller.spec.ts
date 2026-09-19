import { Test, TestingModule } from '@nestjs/testing';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CardType, CardStatus } from './entities/card.entity';

describe('CardsController', () => {
  let controller: CardsController;
  let cardsService: jest.Mocked<Partial<CardsService>>;

  const mockCard = {
    id: 'card-1',
    userId: 'user-1',
    cardholderName: 'ALEX WRIGHT',
    cardType: CardType.DEBIT,
    status: CardStatus.ACTIVE,
  };

  beforeEach(async () => {
    cardsService = {
      getCardsByUserId: jest.fn().mockResolvedValue([mockCard]),
      create: jest.fn().mockResolvedValue(mockCard),
      freezeCard: jest.fn().mockResolvedValue({ ...mockCard, status: CardStatus.FROZEN }),
      unfreezeCard: jest.fn().mockResolvedValue({ ...mockCard, status: CardStatus.ACTIVE }),
      deactivateCard: jest.fn().mockResolvedValue({ ...mockCard, status: CardStatus.DEACTIVATED }),
      deleteCard: jest.fn().mockResolvedValue({ success: true, message: 'Card deleted successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardsController],
      providers: [
        {
          provide: CardsService,
          useValue: cardsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CardsController>(CardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getMyCards to cardsService.getCardsByUserId', async () => {
    const result = await controller.getMyCards({ id: 'user-1' });
    expect(cardsService.getCardsByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([mockCard]);
  });

  it('should delegate create to cardsService.create', async () => {
    const dto = { cardholderName: 'ALEX WRIGHT', cardType: CardType.DEBIT };
    const result = await controller.createCard({ id: 'user-1' }, dto as any);
    expect(cardsService.create).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual(mockCard);
  });

  it('should delegate freezeCard to cardsService.freezeCard', async () => {
    const result = await controller.freezeCard({ id: 'user-1' }, 'card-1');
    expect(cardsService.freezeCard).toHaveBeenCalledWith('user-1', 'card-1');
    expect(result.status).toBe(CardStatus.FROZEN);
  });

  it('should delegate unfreezeCard to cardsService.unfreezeCard', async () => {
    const result = await controller.unfreezeCard({ id: 'user-1' }, 'card-1');
    expect(cardsService.unfreezeCard).toHaveBeenCalledWith('user-1', 'card-1');
    expect(result.status).toBe(CardStatus.ACTIVE);
  });

  it('should delegate deactivateCard to cardsService.deactivateCard', async () => {
    const result = await controller.deactivateCard({ id: 'user-1' }, 'card-1');
    expect(cardsService.deactivateCard).toHaveBeenCalledWith('user-1', 'card-1');
    expect(result.status).toBe(CardStatus.DEACTIVATED);
  });

  it('should delegate deleteCard to cardsService.deleteCard', async () => {
    const result = await controller.deleteCard({ id: 'user-1' }, 'card-1');
    expect(cardsService.deleteCard).toHaveBeenCalledWith('user-1', 'card-1');
    expect(result).toEqual({ success: true, message: 'Card deleted successfully' });
  });
});
