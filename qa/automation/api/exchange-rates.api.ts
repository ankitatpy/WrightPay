import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { GetQuoteQuery } from './types';

export class ExchangeRatesApi extends BaseApi {
  async getAllRates(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('exchange-rates', { headers });
  }

  async getQuote(params: GetQuoteQuery, headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('exchange-rates/quote', { params, headers });
  }
}
