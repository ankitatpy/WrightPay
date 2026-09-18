import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { SignupRequest, LoginRequest, VerifyEmailRequest } from './types';

export class AuthApi extends BaseApi {
  async signup(data: SignupRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('auth/signup', { data, headers });
  }

  async login(data: LoginRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('auth/login', { data, headers });
  }

  async verifyEmail(data: VerifyEmailRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('auth/verify-email', { data, headers });
  }

  async logout(headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('auth/logout', { headers });
  }
}
