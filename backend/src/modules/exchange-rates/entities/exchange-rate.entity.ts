import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Currency } from '../../../core/enums/currency.enum';

@Entity('exchange_rates')
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Currency, default: Currency.EUR })
  from: Currency;

  @Column({ type: 'enum', enum: Currency, default: Currency.USD })
  to: Currency;

  @Column({ type: 'decimal', precision: 15, scale: 6 })
  rate: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;
}
