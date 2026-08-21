import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CardsService } from './cards.service';
import { Card, CardStatus, CardType } from './entities/card.entity';

describe('CardsService', () => {
  let service: CardsService;

  const mockCard: Card = {
    id: 'card-uuid-1',
    userId: 'user-uuid-1',
    cardholderName: 'ANNA KOWALSKI',
    lastFourDigits: '4242',
    expiryDate: '12/28',
    status: CardStatus.ACTIVE,
    type: CardType.DEBIT,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: null,
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'new-card-id', ...dto })),
    save: jest.fn().mockImplementation((card) => Promise.resolve({ ...card })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsService,
        {
          provide: getRepositoryToken(Card),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CardsService>(CardsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCardsByUserId', () => {
    it('should return list of user cards', async () => {
      mockRepository.find.mockResolvedValueOnce([mockCard]);
      const result = await service.getCardsByUserId('user-uuid-1');

      expect(result).toEqual([mockCard]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('create', () => {
    it('should tokenize and store only safe metadata (last 4 digits), discarding full PAN and CVV', async () => {
      const dto = {
        cardholderName: 'Anna Kowalski',
        cardNumber: '4242 1234 5678 9012',
        expiryDate: '12/28',
        type: CardType.DEBIT,
        cvv: '123', // should be discarded
      };

      const result = await service.create('user-uuid-1', dto);

      expect(result).toBeDefined();
      expect(result.lastFourDigits).toBe('9012');
      expect(result.cardholderName).toBe('ANNA KOWALSKI');
      expect(result.status).toBe(CardStatus.ACTIVE);
      expect((result as any).cardNumber).toBeUndefined();
      expect((result as any).cvv).toBeUndefined();
    });
  });

  describe('freezeCard', () => {
    it('should freeze an active card', async () => {
      mockRepository.findOne.mockResolvedValueOnce({ ...mockCard, status: CardStatus.ACTIVE });

      const result = await service.freezeCard('user-uuid-1', 'card-uuid-1');
      expect(result.status).toBe(CardStatus.FROZEN);
    });

    it('should reject freezing an already frozen card', async () => {
      mockRepository.findOne.mockResolvedValueOnce({ ...mockCard, status: CardStatus.FROZEN });

      await expect(service.freezeCard('user-uuid-1', 'card-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject freezing a deactivated card', async () => {
      mockRepository.findOne.mockResolvedValueOnce({ ...mockCard, status: CardStatus.DEACTIVATED });

      await expect(service.freezeCard('user-uuid-1', 'card-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if card not found for user', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.freezeCard('user-uuid-1', 'card-other')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unfreezeCard', () => {
    it('should unfreeze a frozen card', async () => {
      mockRepository.findOne.mockResolvedValueOnce({ ...mockCard, status: CardStatus.FROZEN });

      const result = await service.unfreezeCard('user-uuid-1', 'card-uuid-1');
      expect(result.status).toBe(CardStatus.ACTIVE);
    });

    it('should reject unfreezing an already active card', async () => {
      mockRepository.findOne.mockResolvedValueOnce({ ...mockCard, status: CardStatus.ACTIVE });

      await expect(service.unfreezeCard('user-uuid-1', 'card-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject unfreezing a deactivated card', async () => {
      mockRepository.findOne.mockResolvedValueOnce({ ...mockCard, status: CardStatus.DEACTIVATED });

      await expect(service.unfreezeCard('user-uuid-1', 'card-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deactivateCard', () => {
    it('should permanently deactivate a card', async () => {
      mockRepository.findOne.mockResolvedValueOnce({ ...mockCard, status: CardStatus.ACTIVE });

      const result = await service.deactivateCard('user-uuid-1', 'card-uuid-1');
      expect(result.status).toBe(CardStatus.DEACTIVATED);
    });

    it('should reject deactivating an already deactivated card', async () => {
      mockRepository.findOne.mockResolvedValueOnce({ ...mockCard, status: CardStatus.DEACTIVATED });

      await expect(service.deactivateCard('user-uuid-1', 'card-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteCard', () => {
    it('should delete user card', async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockCard);

      const result = await service.deleteCard('user-uuid-1', 'card-uuid-1');
      expect(result).toEqual({
        message: 'Card successfully deleted',
        id: 'card-uuid-1',
      });
    });

    it('should throw NotFoundException if card not found for user', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.deleteCard('user-uuid-1', 'card-other')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
