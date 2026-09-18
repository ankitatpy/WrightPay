import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { UpdateUserRequest } from './types';

export class UsersApi extends BaseApi {
  async getMe(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('users/me', { headers });
  }

  async updateMe(data: UpdateUserRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.patch('users/me', { data, headers });
  }
}
