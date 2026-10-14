/**
 * Recipe service — company-scoped Bill of Materials (BOM), a VERSIONED master
 * data document with a lighter lifecycle than PR/PO/GR (no submit/approve, no
 * comments/attachments). Verified against the backend contract
 * (recipe.controller.ts + DTOs + Recipe entity / RecipeRepositoryPostgres).
 *
 *  - GET    /production/recipes            → { success, data: Recipe[], meta }
 *      guard: recipe.read
 *      filters: page, limit, productId? (uuid), status? (DRAFT|ACTIVE|ARCHIVED),
 *               search? (name/recipeNumber)
 *      NOTE: the list DOES return each row with its `items` array (the
 *      repository loads items per header), so the list shares the full entity
 *      shape and the item count is shown directly.
 *  - GET    /production/recipes/:id        → { success, data: Recipe } (header + items)
 *  - POST   /production/recipes            → 201 DRAFT
 *      guard: recipe.manage
 *      body: { name, productId (uuid), yieldQty>0, yieldUomId (uuid),
 *              instructions?, items[>=1]{ ingredientProductId (uuid), qty>0,
 *                                         uomId (uuid), lossPercentage? 0..100 } }
 *  - PUT    /production/recipes/:id        → update (DRAFT only; same body)
 *      guard: recipe.manage
 *  - POST   /production/recipes/:id/activate → DRAFT → ACTIVE        guard: recipe.manage
 *      409 "Another active recipe exists for the product" when the product
 *      already has an ACTIVE recipe.
 *  - POST   /production/recipes/:id/archive  → DRAFT|ACTIVE → ARCHIVED guard: recipe.manage
 *  - DELETE /production/recipes/:id          → soft-delete (DRAFT only)   guard: recipe.manage
 *      Backend rejects ACTIVE/ARCHIVED with 400 RECIPE.ONLY_DRAFT_DELETABLE
 *      and 404 when the recipe does not exist. Success: 200 { success, data: { id } }.
 *
 * CONTRACT NOTES (verified, mirrored by the UI):
 *  - `version` is backend-owned (read-only); created at 1, never edited by the UI.
 *  - Lifecycle actions (activate/archive) take NO request body.
 *  - canTransition: DRAFT → ACTIVE | ARCHIVED; ACTIVE → ARCHIVED; ARCHIVED is
 *    terminal. ACTIVE can NOT return to DRAFT (new version = archive + recreate).
 *  - The entity exposes NO status-log collection, so the detail view renders no
 *    timeline.
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

interface ListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ApiListResponse<T> {
  success: true
  data: T[]
  meta: ListMeta
}

/** Recipe (BOM) lifecycle statuses (production-domain §3). */
export const RECIPE_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const
export type RecipeStatus = (typeof RECIPE_STATUSES)[number]

export const RECIPE_STATUS_LABELS: Record<RecipeStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Aktif',
  ARCHIVED: 'Diarsipkan',
}

export interface RecipeItem {
  id: string
  ingredientProductId: string
  ingredientProductName?: string | null
  qty: number
  uomId: string
  uomName?: string | null
  lossPercentage: number
}

export interface Recipe {
  id: string
  companyId: string | null
  recipeNumber: string
  name: string
  productId: string
  productName?: string | null
  version: number
  yieldQty: number
  yieldUomId: string
  yieldUomName?: string | null
  instructions: string | null
  status: RecipeStatus
  items: RecipeItem[]
  createdAt: string
  updatedAt: string
}

export interface RecipeListParams {
  page: number
  limit: number
  productId?: string
  status?: RecipeStatus
  search?: string
}

export interface RecipeListResult {
  items: Recipe[]
  meta: ListMeta
}

/** A single ingredient line in the create/update payload. */
export interface RecipeItemPayload {
  ingredientProductId: string
  qty: number
  uomId: string
  lossPercentage?: number
}

export interface SaveRecipePayload {
  name: string
  productId: string
  yieldQty: number
  yieldUomId: string
  instructions?: string
  items: RecipeItemPayload[]
}

function toQuery(params: RecipeListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.productId) {
    query.productId = params.productId
  }
  if (params.status) {
    query.status = params.status
  }
  if (params.search) {
    query.search = params.search
  }
  return query
}

export const recipeService = {
  async list(params: RecipeListParams): Promise<RecipeListResult> {
    const response = await httpClient.get<ApiListResponse<Recipe>>('/production/recipes', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async getById(id: string): Promise<Recipe> {
    const response = await httpClient.get<ApiSuccess<Recipe>>(`/production/recipes/${id}`)
    return response.data.data
  },

  async create(payload: SaveRecipePayload): Promise<Recipe> {
    const response = await httpClient.post<ApiSuccess<Recipe>>('/production/recipes', payload)
    return response.data.data
  },

  async update(id: string, payload: SaveRecipePayload): Promise<Recipe> {
    const response = await httpClient.put<ApiSuccess<Recipe>>(
      `/production/recipes/${id}`,
      payload,
    )
    return response.data.data
  },

  // Lifecycle actions take no request body (backend-verified).
  async activate(id: string): Promise<Recipe> {
    const response = await httpClient.post<ApiSuccess<Recipe>>(
      `/production/recipes/${id}/activate`,
    )
    return response.data.data
  },

  async archive(id: string): Promise<Recipe> {
    const response = await httpClient.post<ApiSuccess<Recipe>>(
      `/production/recipes/${id}/archive`,
    )
    return response.data.data
  },

  // Soft-delete a DRAFT recipe. The backend returns only the deleted id; the UI
  // redirects to the list on success and surfaces 400/404 on the detail page.
  async remove(id: string): Promise<{ id: string }> {
    const response = await httpClient.delete<ApiSuccess<{ id: string }>>(
      `/production/recipes/${id}`,
    )
    return response.data.data
  },
}

/** Badge color mapping per status (aligns with the ui/Badge `color` palette). */
export function statusBadgeColor(
  status: RecipeStatus,
): 'light' | 'success' | 'error' {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'ARCHIVED':
      return 'error'
    case 'DRAFT':
    default:
      return 'light'
  }
}
