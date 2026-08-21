import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction, TransactionStatus } from '../transactions/entities/transaction.entity';
import { Beneficiary } from '../beneficiaries/entities/beneficiary.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { User, AccountStatus } from '../users/entities/user.entity';

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Beneficiary)
    private readonly beneficiaryRepository: Repository<Beneficiary>,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, createTransferDto: CreateTransferDto, idempotencyKey: string) {
    // 1. We should ideally check idempotency first using Redis.
    // For now, let's implement the core atomic transfer logic.
    const { beneficiaryId, sourceWalletId, sendAmount, destinationCurrency } = createTransferDto;

    if (sendAmount <= 0) {
      throw new BadRequestException('Send amount must be greater than zero');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Fetch user to validate account status
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user || user.accountStatus === AccountStatus.SUSPENDED || user.accountStatus === AccountStatus.CLOSED) {
        throw new BadRequestException('Account is suspended or closed');
      }

      // Fetch wallet with pessimistic write lock
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: sourceWalletId, user: { id: userId } },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new BadRequestException('Invalid source wallet');
      }

      // Fetch beneficiary
      const beneficiary = await queryRunner.manager.findOne(Beneficiary, {
        where: { id: beneficiaryId, user: { id: userId } },
      });

      if (!beneficiary) {
        throw new BadRequestException('Invalid beneficiary');
      }

      // UPI Validation
      if (beneficiary.payoutMethod === 'upi') {
        if (destinationCurrency !== 'INR') {
          throw new BadRequestException('UPI transfers must be in INR');
        }
      }

      // Get Exchange Rate
      // We are simulating an async call to an exchange rate service here.
      // We will need to implement the actual logic in ExchangeRatesService.
      // const rate = await this.exchangeRatesService.getRate(wallet.currency, destinationCurrency);
      const rate = 1; // Temporary placeholder

      const fee = 25.00; // 25 units of source wallet currency
      const totalDeduction = sendAmount + fee;

      if (wallet.balance < totalDeduction) {
         throw new BadRequestException('Insufficient balance');
      }

      const recipientAmount = sendAmount * rate;

      // Deduct balance
      wallet.balance -= totalDeduction;
      await queryRunner.manager.save(wallet);

      // Create Transaction
      const transaction = new Transaction();
      transaction.user = user;
      transaction.reference = `WP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`; // Simple unique ref logic for now
      transaction.recipient = beneficiary.name;
      transaction.amount = sendAmount; // Original requested send amount
      transaction.currency = wallet.currency;
      transaction.senderAmount = sendAmount;
      transaction.senderCurrency = wallet.currency;
      transaction.recipientAmount = recipientAmount;
      transaction.recipientCurrency = destinationCurrency as any; // Cast as enum in actual impl
      transaction.fee = fee;
      transaction.exchangeRate = rate;
      transaction.status = TransactionStatus.PENDING;

      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Here you could optionally emit an event or add to a BullMQ queue for processing to update status to COMPLETED

      return transaction;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Transfer failed: ${error.message}`, error.stack);
      throw error; // Re-throw so the controller can handle it (e.g., return 400 Bad Request)
    } finally {
      await queryRunner.release();
    }
  }
}
