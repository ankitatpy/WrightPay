import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction, TransactionStatus } from '../transactions/entities/transaction.entity';
import { Beneficiary, BeneficiaryPayoutMethod } from '../beneficiaries/entities/beneficiary.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { IdempotencyService } from './services/idempotency.service';
import { User, AccountStatus } from '../users/entities/user.entity';
import { Currency } from '../../core/enums/currency.enum';

export const TRANSFER_FEE = 25.0; // 25 units fixed transfer fee

export interface TransferResult {
  id: string;
  reference: string;
  status: TransactionStatus;
  recipient: string;
  sendAmount: number;
  sourceCurrency: Currency;
  recipientAmount: number;
  destinationCurrency: Currency;
  fee: number;
  exchangeRate: number;
  date: Date;
  createdAt: Date;
}

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  generateReference(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `WP-${dateStr}-${randomHex}`;
  }

  async create(
    userId: string,
    dto: CreateTransferDto,
    idempotencyKey?: string,
  ): Promise<TransferResult> {
    return this.idempotencyService.executeWithIdempotency(
      userId,
      idempotencyKey,
      dto,
      () => this.executeTransferTransaction(userId, dto),
    );
  }

  async executeTransferTransaction(
    userId: string,
    dto: CreateTransferDto,
  ): Promise<TransferResult> {
    const { beneficiaryId, sourceWalletId, sendAmount, destinationCurrency } = dto;

    if (sendAmount <= 0) {
      throw new BadRequestException('Send amount must be greater than zero');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verify user status
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (
        user.accountStatus === AccountStatus.SUSPENDED ||
        user.accountStatus === AccountStatus.CLOSED
      ) {
        throw new ForbiddenException('Account is suspended or closed');
      }

      // 2. Verify beneficiary ownership (soft-deleted beneficiaries are excluded)
      const beneficiary = await queryRunner.manager.findOne(Beneficiary, {
        where: { id: beneficiaryId, userId },
      });

      if (!beneficiary) {
        throw new NotFoundException('Beneficiary not found');
      }

      // If beneficiary payout method is UPI, destination currency must be INR
      if (beneficiary.payoutMethod === BeneficiaryPayoutMethod.UPI) {
        if (destinationCurrency !== Currency.INR) {
          throw new BadRequestException('UPI transfers must be in INR');
        }
      }

      // 3. Acquire source wallet with pessimistic write lock (FOR UPDATE)
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: sourceWalletId, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Source wallet not found');
      }

      // 4. Resolve exchange rate using ExchangeRatesService
      const rate = await this.exchangeRatesService.getRate(
        wallet.currency,
        destinationCurrency,
      );

      // 5. Calculate fee, total deduction, and balance check
      const fee = TRANSFER_FEE;
      const currentBalance = Number(wallet.balance) || 0;
      const sendAmountNum = Math.round((Number(sendAmount) + Number.EPSILON) * 100) / 100;
      const totalDeduction = Math.round((sendAmountNum + fee + Number.EPSILON) * 100) / 100;

      if (currentBalance < totalDeduction) {
        throw new BadRequestException(
          `Insufficient wallet balance. Required: ${totalDeduction} ${wallet.currency} (Amount: ${sendAmountNum} + Fee: ${fee}), Available: ${currentBalance} ${wallet.currency}`,
        );
      }

      const recipientAmount = Math.round((sendAmountNum * rate + Number.EPSILON) * 100) / 100;

      // 6. Deduct balance from source wallet
      const newBalance = Math.round((currentBalance - totalDeduction + Number.EPSILON) * 100) / 100;
      wallet.balance = newBalance;
      await queryRunner.manager.save(wallet);

      // 7. Create transaction ledger record
      const reference = this.generateReference();
      const transaction = queryRunner.manager.create(Transaction, {
        userId,
        reference,
        recipient: beneficiary.name,
        amount: sendAmountNum,
        currency: wallet.currency,
        senderAmount: sendAmountNum,
        senderCurrency: wallet.currency,
        recipientAmount,
        recipientCurrency: destinationCurrency,
        fee,
        exchangeRate: Number(rate.toFixed(6)),
        status: TransactionStatus.PENDING,
        date: new Date(),
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      // 8. Commit atomic transaction
      await queryRunner.commitTransaction();

      return {
        id: savedTransaction.id,
        reference: savedTransaction.reference,
        status: savedTransaction.status,
        recipient: savedTransaction.recipient,
        sendAmount: Number(savedTransaction.senderAmount),
        sourceCurrency: savedTransaction.senderCurrency,
        recipientAmount: Number(savedTransaction.recipientAmount),
        destinationCurrency: savedTransaction.recipientCurrency,
        fee: Number(savedTransaction.fee),
        exchangeRate: Number(savedTransaction.exchangeRate),
        date: savedTransaction.date,
        createdAt: savedTransaction.createdAt,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.error(`Transfer transaction failed: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
