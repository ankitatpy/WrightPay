import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { CreateBeneficiaryRequest } from './types';

export class BeneficiariesApi extends BaseApi {
  async getMyBeneficiaries(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('beneficiaries', { headers });
  }

  async createBeneficiary(data: CreateBeneficiaryRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('beneficiaries', { data, headers });
  }

  async deleteBeneficiary(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.delete(`beneficiaries/${id}`, { headers });
  }
}
