/**
 * useUsers — user list state + CRUD, plus role/outlet option sets and a
 * roleId→name map for the table (list rows carry roleId only). Detail (with
 * outlets) is loaded lazily for the edit form.
 */

import { computed, ref, watch } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  userService,
  type User,
  type UserDetail,
  type CreateUserPayload,
  type UpdateUserPayload,
  type UserListParams,
} from '@/services/user.service'
import { roleService, type Role } from '@/services/role.service'
import { outletService, type Outlet } from '@/services/outlet.service'

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350
const OPTION_LIMIT = 100

export interface UserListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

export function useUsers() {
  const items = ref<User[]>([])
  const meta = ref<UserListMeta>({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 })
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const search = ref<string>('')
  const debouncedSearch = ref<string>('')
  const page = ref<number>(1)
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  // Options for dropdowns + role name map for the table.
  const roles = ref<Role[]>([])
  const outlets = ref<Outlet[]>([])
  const optionsLoaded = ref<boolean>(false)
  const roleNameById = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const r of roles.value) {
      map[r.id] = r.name
    }
    return map
  })

  const totalPages = computed<number>(() => meta.value.totalPages || 1)
  const canPrev = computed<boolean>(() => page.value > 1)
  const canNext = computed<boolean>(() => page.value < totalPages.value)

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params: UserListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        search: debouncedSearch.value || undefined,
      }
      const result = await userService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (error) {
      errorMessage.value = toMessage(error)
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function ensureOptions(): Promise<void> {
    if (optionsLoaded.value) {
      return
    }
    try {
      const [r, o] = await Promise.all([
        roleService.list(),
        outletService.list({ page: 1, limit: OPTION_LIMIT, isActive: 'true' }),
      ])
      roles.value = r
      outlets.value = o.items
      optionsLoaded.value = true
    } catch {
      // Non-fatal: dropdowns will be empty.
    }
  }

  watch(search, (value) => {
    if (searchTimer) {
      clearTimeout(searchTimer)
    }
    searchTimer = setTimeout(() => {
      debouncedSearch.value = value.trim()
      page.value = 1
      void fetchList()
    }, SEARCH_DEBOUNCE_MS)
  })

  function prevPage(): void {
    if (canPrev.value) {
      page.value -= 1
      void fetchList()
    }
  }

  function nextPage(): void {
    if (canNext.value) {
      page.value += 1
      void fetchList()
    }
  }

  // Detail (role + outlets) for the edit form.
  const detail = ref<UserDetail | null>(null)
  const detailLoading = ref<boolean>(false)

  async function loadDetail(id: string): Promise<void> {
    detail.value = null
    detailLoading.value = true
    try {
      detail.value = await userService.getById(id)
    } finally {
      detailLoading.value = false
    }
  }

  function clearDetail(): void {
    detail.value = null
  }

  async function createUser(payload: CreateUserPayload): Promise<void> {
    await userService.create(payload)
    await fetchList()
  }

  async function updateUser(id: string, payload: UpdateUserPayload): Promise<void> {
    await userService.update(id, payload)
    await fetchList()
  }

  async function deleteUser(id: string): Promise<void> {
    await userService.remove(id)
    if (items.value.length === 1 && page.value > 1) {
      page.value -= 1
    }
    await fetchList()
  }

  return {
    items,
    meta,
    loading,
    errorMessage,
    search,
    page,
    totalPages,
    canPrev,
    canNext,
    roles,
    outlets,
    roleNameById,
    ensureOptions,
    fetchList,
    prevPage,
    nextPage,
    detail,
    detailLoading,
    loadDetail,
    clearDetail,
    createUser,
    updateUser,
    deleteUser,
    toMessage,
  }
}
