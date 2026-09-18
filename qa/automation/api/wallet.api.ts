import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';

export class WalletApi extends BaseApi {
  async getMyWallet(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('wallets/me', { headers });
  }
}
