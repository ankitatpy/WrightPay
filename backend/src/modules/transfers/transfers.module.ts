import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Beneficiary } from '../beneficiaries/entities/beneficiary.entity';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction, Beneficiary]),
    ExchangeRatesModule,
  ],
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
