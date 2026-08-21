import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Currency } from '../../../core/enums/currency.enum';

@Entity('exchange_rates')
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Currency })
  from: Currency;

  @Column({ type: 'enum', enum: Currency })
  to: Currency;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  rate: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;
}
