/**
 * Profile service — self-service profile of the authenticated user.
 * Verified against backend user.controller.ts:
 *  - GET /users/me → { success, data: MyProfile }
 *  - PUT /users/me → { success, data: MyProfile }
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

export interface MyProfile {
  id: string
  name: string
  email: string
  phone: string | null
  jobTitle: string | null
  avatarUrl: string | null
  roleCode: string | null
  roleName: string | null
  companyId: string | null
  companyName: string | null
  lastLoginAt: string | null
  createdAt: string
}

export interface UpdateMyProfilePayload {
  name?: string
  phone?: string | null
  jobTitle?: string | null
  avatarUrl?: string | null
}

export const profileService = {
  async get(): Promise<MyProfile> {
    const response = await httpClient.get<ApiSuccess<MyProfile>>('/users/me')
    return response.data.data
  },

  async update(payload: UpdateMyProfilePayload): Promise<MyProfile> {
    const response = await httpClient.put<ApiSuccess<MyProfile>>('/users/me', payload)
    return response.data.data
  },
}
