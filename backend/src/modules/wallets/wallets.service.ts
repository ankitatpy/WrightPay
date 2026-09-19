import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Currency } from '../../core/enums/currency.enum';

export interface WalletResponse {
  id: string;
  currency: Currency;
  balance: number;
  isDefault: boolean;
  equivalents: Record<string, number>;
}

@Injectable()
export class WalletsService {
  private readonly supportedCurrencies: Currency[] = [
    Currency.EUR,
    Currency.GBP,
    Currency.USD,
    Currency.AED,
    Currency.PLN,
    Currency.INR,
  ];

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async getWalletByUserId(userId: string): Promise<WalletResponse> {
    const wallet =
      (await this.walletRepository.findOne({
        where: { userId, isDefault: true },
      })) ||
      (await this.walletRepository.findOne({
        where: { userId },
      }));

    if (!wallet) {
      throw new NotFoundException('Wallet not found for user');
    }

    const numericBalance = Number(wallet.balance) || 0;
    const equivalents: Record<string, number> = {};

    for (const targetCurrency of this.supportedCurrencies) {
      if (targetCurrency === wallet.currency) {
        equivalents[targetCurrency] = Math.round((numericBalance + Number.EPSILON) * 100) / 100;
      } else {
        try {
          const rate = await this.exchangeRatesService.getRate(
            wallet.currency,
            targetCurrency,
          );
          equivalents[targetCurrency] = Math.round((numericBalance * rate + Number.EPSILON) * 100) / 100;
        } catch {
          equivalents[targetCurrency] = 0;
        }
      }
    }

    return {
      id: wallet.id,
      currency: wallet.currency,
      balance: Math.round((numericBalance + Number.EPSILON) * 100) / 100,
      isDefault: wallet.isDefault,
      equivalents,
    };
  }
}

