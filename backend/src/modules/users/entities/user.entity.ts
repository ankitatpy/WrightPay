import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Currency } from '../../../core/enums/currency.enum';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Beneficiary } from '../../beneficiaries/entities/beneficiary.entity';
import { Card } from '../../cards/entities/card.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum AccountType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
}

export enum KycStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum AccountStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: AccountType, default: AccountType.INDIVIDUAL })
  accountType: AccountType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  countryOfResidence: string;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.NOT_STARTED })
  kycStatus: KycStatus;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.PENDING })
  accountStatus: AccountStatus;

  @Column({ type: 'enum', enum: Currency, default: Currency.EUR })
  defaultCurrency: Currency;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallets: Wallet[];

  @OneToMany(() => Beneficiary, (beneficiary) => beneficiary.user)
  beneficiaries: Beneficiary[];

  @OneToMany(() => Card, (card) => card.user)
  cards: Card[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];
}
