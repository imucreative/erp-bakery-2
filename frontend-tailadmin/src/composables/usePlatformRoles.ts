/**
 * usePlatformRoles — role management for the Platform Console (SUPER_ADMIN).
 * Roles stay company-scoped: the operator picks a company, then lists/creates/
 * edits/deletes that company's roles. Permission changes apply when the
 * affected user's access token is refreshed (≤15 minutes).
 */

import { computed, ref } from 'vue'
import { platformService, type PlatformRoleItem } from '@/services/platform.service'
import { platformCompanyService } from '@/services/platform-company.service'
import type { Permission } from '@/services/permission.service'
import type { CreateRolePayload, RoleDetail, UpdateRolePayload } from '@/services/role.service'
import { toMessage } from '@/lib/errors'

const COMPANY_PAGE_SIZE = 100

export function usePlatformRoles() {
  const companyId = ref('')
  const companyOptions = ref<Array<{ label: string; value: string }>>([
    { label: 'Pilih perusahaan', value: '' },
  ])
  const companiesLoading = ref(false)

  const roles = ref<PlatformRoleItem[]>([])
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)
  const search = ref('')

  const filtered = computed<PlatformRoleItem[]>(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return roles.value
    return roles.value.filter(
      (role) =>
        role.name.toLowerCase().includes(q) ||
        role.code.toLowerCase().includes(q) ||
        (role.description ?? '').toLowerCase().includes(q),
    )
  })

  let listRequestId = 0

  async function loadCompanies(): Promise<void> {
    companiesLoading.value = true
    try {
      const result = await platformCompanyService.list({ page: 1, limit: COMPANY_PAGE_SIZE })
      companyOptions.value = [
        { label: 'Pilih perusahaan', value: '' },
        ...result.items.map((company) => ({ label: company.name, value: company.id })),
      ]
    } catch {
      companyOptions.value = [{ label: 'Pilih perusahaan', value: '' }]
    } finally {
      companiesLoading.value = false
    }
  }

  async function selectCompany(id: string): Promise<void> {
    companyId.value = id
    clearDetail()
    if (!id) {
      roles.value = []
      errorMessage.value = null
      return
    }
    await fetchList()
  }

  async function fetchList(): Promise<void> {
    if (!companyId.value) {
      roles.value = []
      return
    }
    const requestId = ++listRequestId
    loading.value = true
    errorMessage.value = null
    try {
      const data = await platformService.listRoles(companyId.value)
      if (requestId !== listRequestId) return
      roles.value = data
    } catch (error) {
      if (requestId !== listRequestId) return
      errorMessage.value = toMessage(error)
      roles.value = []
    } finally {
      if (requestId === listRequestId) loading.value = false
    }
  }

  // ── Detail (permission codes) ────────────────────────────────────────
  const detail = ref<RoleDetail | null>(null)
  const detailLoading = ref(false)
  const detailError = ref<string | null>(null)

  async function loadDetail(roleId: string): Promise<void> {
    const company = companyId.value
    detail.value = null
    detailLoading.value = true
    detailError.value = null
    try {
      const data = await platformService.getRole(company, roleId)
      if (company !== companyId.value) return
      detail.value = data
    } catch (error) {
      if (company !== companyId.value) return
      detailError.value = toMessage(error)
    } finally {
      if (company === companyId.value) detailLoading.value = false
    }
  }

  function clearDetail(): void {
    detail.value = null
    detailError.value = null
  }

  // ── Permission catalog ───────────────────────────────────────────────
  const catalog = ref<Permission[]>([])
  const catalogLoading = ref(false)
  const catalogError = ref<string | null>(null)
  const catalogLoaded = ref(false)

  async function fetchCatalog(force = false): Promise<void> {
    if (catalogLoaded.value && !force) return
    catalogLoading.value = true
    catalogError.value = null
    try {
      catalog.value = await platformService.listPermissions()
      catalogLoaded.value = true
    } catch (error) {
      catalogError.value = toMessage(error)
      catalog.value = []
    } finally {
      catalogLoading.value = false
    }
  }

  // ── Mutations ────────────────────────────────────────────────────────
  async function createRole(payload: CreateRolePayload): Promise<void> {
    await platformService.createRole(companyId.value, payload)
    await fetchList()
  }

  async function updateRole(roleId: string, payload: UpdateRolePayload): Promise<void> {
    await platformService.updateRole(companyId.value, roleId, payload)
    await fetchList()
  }

  async function deleteRole(roleId: string): Promise<void> {
    await platformService.deleteRole(companyId.value, roleId)
    await fetchList()
  }

  return {
    companyId,
    companyOptions,
    companiesLoading,
    roles,
    filtered,
    loading,
    errorMessage,
    search,
    detail,
    detailLoading,
    detailError,
    catalog,
    catalogLoading,
    catalogError,
    loadCompanies,
    selectCompany,
    fetchList,
    loadDetail,
    clearDetail,
    fetchCatalog,
    createRole,
    updateRole,
    deleteRole,
    toMessage,
  }
}
