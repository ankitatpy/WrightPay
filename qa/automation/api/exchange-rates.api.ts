import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { GetQuoteQuery } from './types';

export class ExchangeRatesApi extends BaseApi {
  async getAllRates(query?: Record<string, any>, headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('exchange-rates', { params: query, headers });
  }

  async getQuote(params?: GetQuoteQuery | Record<string, any>, headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('exchange-rates/quote', { params, headers });
  }
}
