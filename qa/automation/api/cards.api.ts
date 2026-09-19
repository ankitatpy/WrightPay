import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { CreateCardRequest } from './types';

export class CardsApi extends BaseApi {
  async getMyCards(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('cards', { headers });
  }

  async createCard(data: CreateCardRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('cards', { data, headers });
  }

  async freezeCard(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post(`cards/${id}/freeze`, { headers });
  }

  async unfreezeCard(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post(`cards/${id}/unfreeze`, { headers });
  }

  async deactivateCard(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post(`cards/${id}/deactivate`, { headers });
  }

  async deleteCard(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.delete(`cards/${id}`, { headers });
  }
}
