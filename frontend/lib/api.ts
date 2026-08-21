/**
 * Central API Client for WrightPay Frontend
 * Provides standardized request handling, token attachment, error normalization, and method helpers.
 */

export const ACCESS_TOKEN_STORAGE_KEY = 'wrightpay_access_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.error('Failed to save access token in localStorage', err);
  }
}

export function removeStoredToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to remove access token from localStorage', err);
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  params?: Record<string, string | number | boolean | undefined | null>;
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
).replace(/\/$/, '');

export async function request<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { idempotencyKey, params, headers = {}, ...customConfig } = options;

  let url = `${API_BASE_URL}/${endpoint.replace(/^\//, '')}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  const token = getStoredToken();
  if (token && !reqHeaders['Authorization']) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (idempotencyKey && !reqHeaders['Idempotency-Key']) {
    reqHeaders['Idempotency-Key'] = idempotencyKey;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: reqHeaders,
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (netErr: unknown) {
    const message =
      netErr instanceof Error
        ? netErr.message
        : 'Network error. Please verify backend connectivity.';
    throw new ApiError(0, message, netErr);
  }

  let data: unknown = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = text ? { message: text } : null;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      removeStoredToken();
    }

    let errorMessage = 'An unexpected error occurred';
    if (data && typeof data === 'object') {
      const resObj = data as Record<string, unknown>;
      if (Array.isArray(resObj.message)) {
        errorMessage = resObj.message.join(', ');
      } else if (typeof resObj.message === 'string') {
        errorMessage = resObj.message;
      } else if (typeof resObj.error === 'string') {
        errorMessage = resObj.error;
      }
    } else if (response.statusText) {
      errorMessage = response.statusText;
    }

    throw new ApiError(response.status, errorMessage, data);
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
