import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { IdempotencyService } from './services/idempotency.service';
import { TransfersProcessor } from './processors/transfers.processor';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Beneficiary } from '../beneficiaries/entities/beneficiary.entity';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { TRANSFERS_QUEUE } from './constants/transfers.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction, Beneficiary]),
    BullModule.registerQueue({
      name: TRANSFERS_QUEUE,
    }),
    ExchangeRatesModule,
  ],
  controllers: [TransfersController],
  providers: [TransfersService, IdempotencyService, TransfersProcessor],
  exports: [TransfersService, IdempotencyService],
})
export class TransfersModule {}



