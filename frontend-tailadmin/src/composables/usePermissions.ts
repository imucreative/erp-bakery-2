/**
 * usePermissions — loads the global permission catalog (ADR 49) used to render
 * the Role permission picker. Cached per-composable instance; the caller loads
 * it once when the form modal opens. Preserves the backend `sortOrder` order.
 */

import { ref } from 'vue'
import { ApiClientError } from '@/services/http'
import { permissionService, type Permission } from '@/services/permission.service'

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

export function usePermissions() {
  const permissions = ref<Permission[]>([])
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)
  const loaded = ref<boolean>(false)

  async function fetchCatalog(force = false): Promise<void> {
    if (loaded.value && !force) {
      return
    }
    loading.value = true
    errorMessage.value = null
    try {
      permissions.value = await permissionService.list()
      loaded.value = true
    } catch (error) {
      errorMessage.value = toMessage(error)
      permissions.value = []
    } finally {
      loading.value = false
    }
  }

  return { permissions, loading, errorMessage, loaded, fetchCatalog }
}
