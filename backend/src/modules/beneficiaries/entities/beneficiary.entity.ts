import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Currency } from '../../../core/enums/currency.enum';

export enum BeneficiaryPayoutMethod {
  BANK_ACCOUNT = 'bank_account',
  UPI = 'upi',
}

@Entity('beneficiaries')
export class Beneficiary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.beneficiaries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: Currency, default: Currency.EUR })
  currency: Currency;

  @Column({ type: 'enum', enum: BeneficiaryPayoutMethod, nullable: true })
  payoutMethod: BeneficiaryPayoutMethod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  accountNumber: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankCode: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ifscCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  upiId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankName: string;

  @DeleteDateColumn()
  deletedAt: Date;
}
