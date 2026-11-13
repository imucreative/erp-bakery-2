/**
 * UOM dimension reference service.
 *
 * Dimensions are global reference data: each row defines a physical dimension
 * (e.g. WEIGHT, LENGTH) and its canonical unit — the smallest unit factors are
 * measured against. Creating a dimension also creates its canonical factor-1
 * UOM for the caller's company, so a dimension always has an anchor unit before
 * other units are added.
 *
 *  - GET    /uom-dimensions?includeInactive=true → { success, data: UomDimensionDefinition[] }
 *  - POST   /uom-dimensions                      → { code, name, canonicalUnitName, canonicalUnitSymbol, isActive? }
 *  - PUT    /uom-dimensions/:code                → { name?, isActive? } (code/canonical immutable)
 *  - DELETE /uom-dimensions/:code                → hard-delete (409 when used by UOMs)
 */
import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  data: T
}

export interface UomDimensionDefinition {
  code: string
  name: string
  canonicalUnitName: string
  canonicalUnitSymbol: string
  isActive: boolean
}

export interface UomDimensionListParams {
  includeInactive?: boolean
}

export interface CreateUomDimensionPayload {
  code: string
  name: string
  canonicalUnitName: string
  canonicalUnitSymbol: string
  isActive?: boolean
}

export interface UpdateUomDimensionPayload {
  name?: string
  isActive?: boolean
}

export const uomDimensionService = {
  async list(params: UomDimensionListParams = {}): Promise<UomDimensionDefinition[]> {
    const response = await httpClient.get<ApiSuccess<UomDimensionDefinition[]>>('/uom-dimensions', {
      params: params.includeInactive ? { includeInactive: 'true' } : undefined,
    })
    return response.data.data
  },

  async create(payload: CreateUomDimensionPayload): Promise<UomDimensionDefinition> {
    const response = await httpClient.post<ApiSuccess<UomDimensionDefinition>>(
      '/uom-dimensions',
      payload,
    )
    return response.data.data
  },

  async update(code: string, payload: UpdateUomDimensionPayload): Promise<UomDimensionDefinition> {
    const response = await httpClient.put<ApiSuccess<UomDimensionDefinition>>(
      `/uom-dimensions/${encodeURIComponent(code)}`,
      payload,
    )
    return response.data.data
  },

  async remove(code: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/uom-dimensions/${encodeURIComponent(code)}`)
  },
}
