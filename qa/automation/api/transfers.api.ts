import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { CreateTransferRequest } from './types';

export class TransfersApi extends BaseApi {
  /**
   * Initiate a transfer.
   * Callers must explicitly supply the idempotencyKey so tests can deliberately test duplicate keys.
   */
  async createTransfer(
    data: CreateTransferRequest,
    idempotencyKey?: string,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    const mergedHeaders: Record<string, string> = { ...headers };
    if (idempotencyKey !== undefined) {
      mergedHeaders['Idempotency-Key'] = idempotencyKey;
    }
    return this.post('transfers', { data, headers: mergedHeaders });
  }
}
