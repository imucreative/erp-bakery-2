/**
 * Axios HTTP client for the Bakery ERP API (base `/api/v1`, proxied by Vite to
 * the backend on :3000). Verified contract in ADR doc 45 §4.
 *
 *  - Request: attach `Authorization: Bearer <accessToken>` + `X-Company-Id`.
 *  - Response: normalize backend error envelopes into `ApiClientError`.
 *  - Refresh-on-401: call `PUT /auth/refresh` once (single in-flight) and retry.
 */

import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import {
  clearTokens,
  getAccessToken,
  getCompanyId,
  getRefreshToken,
  setAccessToken,
} from '@/lib/tokenStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export interface ApiErrorItem {
  field?: string | null
  message: string
}

/** Normalized error thrown to callers. */
export class ApiClientError extends Error {
  public readonly status: number
  public readonly fieldErrors: ApiErrorItem[]

  constructor(message: string, status: number, fieldErrors: ApiErrorItem[] = []) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// NOTE: we intentionally do NOT set a global `Content-Type: application/json`.
// The backend runs on Fastify, which rejects a request that declares a JSON
// content-type but sends an empty body (e.g. `DELETE /uoms/:id`) with
// "Body cannot be empty when content-type is set to 'application/json'".
// Axios sets the JSON content-type automatically when a request has a `data`
// payload, so bodyless requests stay clean.
export const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
})

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  const companyId = getCompanyId()
  if (companyId) {
    config.headers.set('X-Company-Id', companyId)
  }
  return config
})

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new ApiClientError('Session expired', 401)
  }
  const response = await axios.put<{ success: boolean; data: { accessToken: string } }>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  )
  const accessToken = response.data?.data?.accessToken
  if (!accessToken) {
    throw new ApiClientError('Session expired', 401)
  }
  setAccessToken(accessToken)
  return accessToken
}

interface BackendErrorBody {
  message?: string
  errors?: ApiErrorItem[]
}

function toApiClientError(error: AxiosError<BackendErrorBody>): ApiClientError {
  const status = error.response?.status ?? 0
  const payload = error.response?.data
  if (payload && typeof payload === 'object' && 'message' in payload) {
    return new ApiClientError(payload.message ?? 'Request failed', status, payload.errors ?? [])
  }
  return new ApiClientError(error.message || 'Network error', status)
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<BackendErrorBody>) => {
    const originalConfig = error.config as RetriableConfig | undefined
    const status = error.response?.status
    const isRefreshCall = originalConfig?.url?.includes('/auth/refresh')

    if (status === 401 && originalConfig && !originalConfig._retry && !isRefreshCall) {
      originalConfig._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null
          })
        }
        const newToken = await refreshPromise
        originalConfig.headers.set('Authorization', `Bearer ${newToken}`)
        return httpClient.request(originalConfig)
      } catch {
        clearTokens()
        onUnauthorized?.()
        return Promise.reject(new ApiClientError('Session expired', 401))
      }
    }

    if (status === 401) {
      clearTokens()
      onUnauthorized?.()
    }

    return Promise.reject(toApiClientError(error))
  },
)
