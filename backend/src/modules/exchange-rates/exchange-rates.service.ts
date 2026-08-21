import { Injectable } from '@nestjs/common';

@Injectable()
export class ExchangeRatesService {
  async getRate(from: string, to: string): Promise<number> {
    // This is a mock implementation for now
    if (from === to) return 1.0;

    // Some hardcoded rates for demo
    const rates = {
      'EUR-INR': 90.5,
      'GBP-INR': 106.25,
      'USD-INR': 83.4,
      'EUR-GBP': 0.85,
      'EUR-USD': 1.09,
    };

    const key = `${from}-${to}`;
    if (rates[key]) return rates[key];

    const inverseKey = `${to}-${from}`;
    if (rates[inverseKey]) return 1 / rates[inverseKey];

    // Throw or return a default
    return 1.0;
  }
}
