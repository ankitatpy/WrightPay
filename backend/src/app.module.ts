import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from './core/redis/redis.module';
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
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        const dbSsl = configService.get<string>('DATABASE_SSL');
        const isSsl =
          dbSsl === 'true' ||
          (dbUrl && (dbUrl.includes('sslmode=require') || dbUrl.includes('ssl=true')));

        return {
          type: 'postgres',
          url: dbUrl,
          autoLoadEntities: true,
          synchronize: true, // For development & initial provisioning. In strict production, use migrations.
          ssl: isSsl ? { rejectUnauthorized: false } : false,
        };
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          const isTls = redisUrl.startsWith('rediss://');
          return {
            connection: {
              url: redisUrl,
              tls: isTls ? { rejectUnauthorized: false } : undefined,
            },
          };
        }
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: Number(configService.get<number>('REDIS_PORT', 6379)),
          },
        };
      },
      inject: [ConfigService],
    }),


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
