import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card, CardStatus, CardType } from './entities/card.entity';
import { CreateCardDto } from './dto/create-card.dto';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
  ) {}

  async getCardsByUserId(userId: string): Promise<Card[]> {
    return this.cardRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(userId: string, dto: CreateCardDto): Promise<Card> {
    const rawNumber = dto.cardNumber || dto.lastFourDigits || '';
    const cleanNumber = rawNumber.replace(/\s+/g, '');
    const lastFour = cleanNumber.slice(-4) || '0000';

    const card = this.cardRepository.create({
      userId,
      cardholderName: dto.cardholderName.trim().toUpperCase(),
      lastFourDigits: lastFour,
      expiryDate: dto.expiryDate.trim(),
      type: dto.type || CardType.DEBIT,
      status: CardStatus.ACTIVE,
    });

    return this.cardRepository.save(card);
  }

  async freezeCard(userId: string, id: string): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id, userId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    if (card.status === CardStatus.DEACTIVATED) {
      throw new BadRequestException('Deactivated card cannot be modified');
    }

    if (card.status === CardStatus.FROZEN) {
      throw new BadRequestException('Card is already frozen');
    }

    card.status = CardStatus.FROZEN;
    return this.cardRepository.save(card);
  }

  async unfreezeCard(userId: string, id: string): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id, userId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    if (card.status === CardStatus.DEACTIVATED) {
      throw new BadRequestException('Deactivated card cannot be modified');
    }

    if (card.status === CardStatus.ACTIVE) {
      throw new BadRequestException('Card is already active');
    }

    if (card.status !== CardStatus.FROZEN) {
      throw new BadRequestException('Only a frozen card can be unfrozen');
    }

    card.status = CardStatus.ACTIVE;
    return this.cardRepository.save(card);
  }

  async deactivateCard(userId: string, id: string): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id, userId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    if (card.status === CardStatus.DEACTIVATED) {
      throw new BadRequestException('Card is already deactivated');
    }

    card.status = CardStatus.DEACTIVATED;
    return this.cardRepository.save(card);
  }

  async deleteCard(userId: string, id: string): Promise<{ message: string; id: string }> {
    const card = await this.cardRepository.findOne({
      where: { id, userId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    await this.cardRepository.delete({ id, userId });

    return {
      message: 'Card successfully deleted',
      id,
    };
  }
}
