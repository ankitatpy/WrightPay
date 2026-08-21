import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum CardStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  DEACTIVATED = 'deactivated',
  DECLINED = 'declined',
  PENDING = 'pending',
}

export enum CardType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 4 })
  lastFourDigits: string;

  @Column({ type: 'varchar', length: 255 })
  cardholderName: string;

  @Column({ type: 'varchar', length: 5 })
  expiryDate: string; // MM/YY

  @Column({ type: 'enum', enum: CardStatus, default: CardStatus.PENDING })
  status: CardStatus;

  @Column({ type: 'enum', enum: CardType, default: CardType.DEBIT })
  type: CardType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
