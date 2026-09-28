/**
 * Axios HTTP client for the Bakery ERP API.
 *
 * Responsibilities (ADR doc 45 §4):
 *  - Base URL `/api/v1`.
 *  - Request interceptor: attach `Authorization: Bearer <accessToken>` and
 *    `X-Company-Id` when available.
 *  - Response interceptor: unwrap the success envelope so callers receive
 *    `data` directly, and normalize backend error envelopes into `ApiClientError`.
 *  - Refresh-on-401: on a 401 (other than the refresh call itself), call
 *    `PUT /auth/refresh` once, update the access token, and retry the original
 *    request. Concurrent 401s share a single in-flight refresh.
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiError } from '@/types/api';
import {
  clearTokens,
  getAccessToken,
  getCompanyId,
  getRefreshToken,
  setAccessToken,
} from '@/lib/token-storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/** Normalized error thrown to callers, carrying field-level details. */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly fieldErrors: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    status: number,
    fieldErrors: Array<{ field?: string; message: string }> = [],
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Invoked when refresh fails or no refresh token exists (forces re-login). */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  const companyId = getCompanyId();
  if (companyId) {
    config.headers.set('X-Company-Id', companyId);
  }
  return config;
});

/** Shared in-flight refresh promise so concurrent 401s trigger one refresh. */
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new ApiClientError('Session expired', 401);
  }

  // Bare axios call to avoid the interceptor loop.
  const response = await axios.put<{ success: boolean; data: { accessToken: string } }>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  const accessToken = response.data?.data?.accessToken;
  if (!accessToken) {
    throw new ApiClientError('Session expired', 401);
  }
  setAccessToken(accessToken);
  return accessToken;
}

function toApiClientError(error: AxiosError<ApiError>): ApiClientError {
  const status = error.response?.status ?? 0;
  const payload = error.response?.data;
  if (payload && typeof payload === 'object' && 'message' in payload) {
    return new ApiClientError(payload.message, status, payload.errors ?? []);
  }
  return new ApiClientError(error.message || 'Network error', status);
}

httpClient.interceptors.response.use(
  // Unwrap the success envelope: return `response.data` (which is `{ success, data, meta? }`).
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiError>) => {
    const originalConfig = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isRefreshCall = originalConfig?.url?.includes('/auth/refresh');

    if (status === 401 && originalConfig && !originalConfig._retry && !isRefreshCall) {
      originalConfig._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        originalConfig.headers.set('Authorization', `Bearer ${newToken}`);
        return httpClient.request(originalConfig);
      } catch {
        clearTokens();
        onUnauthorized?.();
        return Promise.reject(new ApiClientError('Session expired', 401));
      }
    }

    if (status === 401) {
      clearTokens();
      onUnauthorized?.();
    }

    return Promise.reject(toApiClientError(error));
  },
);
