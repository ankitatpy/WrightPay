import { APIRequestContext, APIResponse } from '@playwright/test';

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

export abstract class BaseApi {
  constructor(protected request: APIRequestContext) {}

  /**
   * Normalizes path to prevent leading slashes from stripping baseUrl subpaths like /api/v1/.
   */
  protected resolvePath(path: string): string {
    return path.startsWith('/') ? path.slice(1) : path;
  }

  protected async get(path: string, options?: RequestOptions): Promise<APIResponse> {
    return this.request.get(this.resolvePath(path), {
      headers: options?.headers,
      params: options?.params,
    });
  }

  protected async post(path: string, options?: RequestOptions): Promise<APIResponse> {
    return this.request.post(this.resolvePath(path), {
      headers: options?.headers,
      params: options?.params,
      data: options?.data,
    });
  }

  protected async patch(path: string, options?: RequestOptions): Promise<APIResponse> {
    return this.request.patch(this.resolvePath(path), {
      headers: options?.headers,
      params: options?.params,
      data: options?.data,
    });
  }

  protected async delete(path: string, options?: RequestOptions): Promise<APIResponse> {
    return this.request.delete(this.resolvePath(path), {
      headers: options?.headers,
      params: options?.params,
    });
  }
}
