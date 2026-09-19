import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Currency } from '../../../core/enums/currency.enum';

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SUSPICIOUS = 'SUSPICIOUS',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 100, unique: true })
  reference: string;

  @CreateDateColumn()
  date: Date;

  @Column({ type: 'varchar', length: 255 })
  recipient: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  senderAmount: number;

  @Column({ type: 'enum', enum: Currency, nullable: true })
  senderCurrency: Currency;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  recipientAmount: number;

  @Column({ type: 'enum', enum: Currency, nullable: true })
  recipientCurrency: Currency;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  exchangeRate: number;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;
}
