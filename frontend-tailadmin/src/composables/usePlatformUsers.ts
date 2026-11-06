import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { platformCompanyService } from '@/services/platform-company.service'
import {
  platformService,
  type PlatformCreateUserPayload,
  type PlatformUpdateUserPayload,
  type PlatformUserItem,
} from '@/services/platform.service'
import { toMessage } from '@/lib/errors'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

export function usePlatformUsers() {
  const items = ref<PlatformUserItem[]>([])
  const meta = reactive({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 })
  const search = ref('')
  const companyId = ref('')
  const companyOptions = ref<Array<{ label: string; value: string }>>([
    { label: 'All companies', value: '' },
  ])
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const assignableCompanyOptions = computed(() =>
    companyOptions.value.filter((option) => option.value !== ''),
  )

  async function load(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const result = await platformService.listUsers({
        page: meta.page,
        limit: meta.limit,
        search: search.value,
        companyId: companyId.value,
      })
      items.value = result.items
      Object.assign(meta, result.meta)
    } catch (error) {
      errorMessage.value = toMessage(error)
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function loadCompanies(): Promise<void> {
    try {
      const result = await platformCompanyService.list({ page: 1, limit: 100 })
      companyOptions.value = [
        { label: 'All companies', value: '' },
        ...result.items.map((company) => ({ label: company.name, value: company.id })),
      ]
    } catch {
      companyOptions.value = [{ label: 'All companies', value: '' }]
    }
  }

  function onSearchInput(value: string): void {
    search.value = value
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      meta.page = 1
      void load()
    }, SEARCH_DEBOUNCE_MS)
  }

  function onCompanyChange(value: string): void {
    companyId.value = value
    meta.page = 1
    void load()
  }

  function goToPage(page: number): void {
    if (page < 1 || page > meta.totalPages || page === meta.page) return
    meta.page = page
    void load()
  }

  async function createUser(payload: PlatformCreateUserPayload): Promise<void> {
    await platformService.createUser(payload)
    meta.page = 1
    await load()
  }

  async function updateUser(id: string, payload: PlatformUpdateUserPayload): Promise<void> {
    await platformService.updateUser(id, payload)
    meta.page = 1
    await load()
  }

  async function deleteUser(id: string): Promise<void> {
    await platformService.deleteUser(id)
    await load()
  }

  onBeforeUnmount(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })

  return {
    items,
    meta,
    search,
    companyId,
    companyOptions,
    assignableCompanyOptions,
    loading,
    errorMessage,
    load,
    loadCompanies,
    onSearchInput,
    onCompanyChange,
    goToPage,
    createUser,
    updateUser,
    deleteUser,
  }
}
