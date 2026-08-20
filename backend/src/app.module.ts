import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module';
import { BeneficiariesModule } from './modules/beneficiaries/beneficiaries.module';
import { CardsModule } from './modules/cards/cards.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { TransfersModule } from './modules/transfers/transfers.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    WalletsModule,
    ExchangeRatesModule,
    BeneficiariesModule,
    CardsModule,
    TransactionsModule,
    TransfersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
