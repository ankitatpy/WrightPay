import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { Currency } from '../../core/enums/currency.enum';

@Injectable()
export class ExchangeRatesService {
  constructor(
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepository: Repository<ExchangeRate>,
  ) {}

  async getAllRates(): Promise<ExchangeRate[]> {
    return this.exchangeRateRepository.find({
      order: { from: 'ASC', to: 'ASC' },
    });
  }

  async getRate(from: Currency | string, to: Currency | string): Promise<number> {
    if (from === to) {
      return 1.0;
    }

    const fromCurrency = from as Currency;
    const toCurrency = to as Currency;

    // 1. Direct rate
    const directRate = await this.exchangeRateRepository.findOne({
      where: { from: fromCurrency, to: toCurrency },
      order: { timestamp: 'DESC' },
    });

    if (directRate && Number(directRate.rate) > 0) {
      return Number(Number(directRate.rate).toFixed(6));
    }

    // 2. Inverse rate (e.g. USD -> EUR when EUR -> USD is in DB)
    const inverseRate = await this.exchangeRateRepository.findOne({
      where: { from: toCurrency, to: fromCurrency },
      order: { timestamp: 'DESC' },
    });

    if (inverseRate && Number(inverseRate.rate) > 0) {
      const calculated = 1 / Number(inverseRate.rate);
      return Number(calculated.toFixed(6));
    }

    // 3. Triangular conversion through EUR (Base currency)
    // E.g. USD -> INR = (USD -> EUR) * (EUR -> INR) = (1 / (EUR -> USD)) * (EUR -> INR)
    if (fromCurrency !== Currency.EUR && toCurrency !== Currency.EUR) {
      const eurToFrom = await this.exchangeRateRepository.findOne({
        where: { from: Currency.EUR, to: fromCurrency },
        order: { timestamp: 'DESC' },
      });

      const eurToTarget = await this.exchangeRateRepository.findOne({
        where: { from: Currency.EUR, to: toCurrency },
        order: { timestamp: 'DESC' },
      });

      if (eurToFrom && eurToTarget && Number(eurToFrom.rate) > 0 && Number(eurToTarget.rate) > 0) {
        const rateFromToEur = 1 / Number(eurToFrom.rate);
        const rateEurToTarget = Number(eurToTarget.rate);
        const triangularRate = rateFromToEur * rateEurToTarget;
        return Number(triangularRate.toFixed(6));
      }
    }

    throw new NotFoundException(`Exchange rate not found from ${from} to ${to}`);
  }

  async getQuote(from: Currency, to: Currency, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const rate = await this.getRate(from, to);
    const convertedAmount = Math.round((Number(amount) * rate + Number.EPSILON) * 100) / 100;

    return {
      from,
      to,
      amount: Math.round((Number(amount) + Number.EPSILON) * 100) / 100,
      rate: Number(rate.toFixed(6)),
      convertedAmount,
    };
  }

}
