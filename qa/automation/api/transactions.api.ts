import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { GetTransactionsQuery } from './types';

export class TransactionsApi extends BaseApi {
  async getMyTransactions(
    params?: GetTransactionsQuery,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    return this.get('transactions', { params, headers });
  }

  async getTransactionById(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.get(`transactions/${id}`, { headers });
  }
}
