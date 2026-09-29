/**
 * useRoles — read-only role list + lazy detail loading. Roles change rarely
 * (seed-controlled), and the list is small & not paginated, so this keeps a
 * simple client-side search filter.
 */

import { computed, ref } from 'vue'
import { ApiClientError } from '@/services/http'
import { roleService, type Role, type RoleDetail } from '@/services/role.service'

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

export function useRoles() {
  const roles = ref<Role[]>([])
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)
  const search = ref<string>('')

  const filtered = computed<Role[]>(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) {
      return roles.value
    }
    return roles.value.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q),
    )
  })

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      roles.value = await roleService.list()
    } catch (error) {
      errorMessage.value = toMessage(error)
      roles.value = []
    } finally {
      loading.value = false
    }
  }

  // ── Detail (permissions) ─────────────────────────────────────────────
  const detail = ref<RoleDetail | null>(null)
  const detailLoading = ref<boolean>(false)
  const detailError = ref<string | null>(null)

  async function loadDetail(id: string): Promise<void> {
    detail.value = null
    detailLoading.value = true
    detailError.value = null
    try {
      detail.value = await roleService.getById(id)
    } catch (error) {
      detailError.value = toMessage(error)
    } finally {
      detailLoading.value = false
    }
  }

  function clearDetail(): void {
    detail.value = null
    detailError.value = null
  }

  return {
    roles,
    filtered,
    loading,
    errorMessage,
    search,
    fetchList,
    detail,
    detailLoading,
    detailError,
    loadDetail,
    clearDetail,
  }
}
