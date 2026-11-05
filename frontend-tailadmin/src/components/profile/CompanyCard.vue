<template>
  <div class="section-card">
    <div class="toolbar-row mb-4 lg:mb-6">
      <div class="flex items-center gap-4">
        <div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <img
            v-if="company?.logoUrl"
            :src="company.logoUrl"
            class="size-12 object-cover"
            alt="Logo perusahaan"
          />
          <div v-else class="icon-tile size-12 text-base font-semibold">{{ initials }}</div>
        </div>
        <h4 class="card-title">Perusahaan</h4>
      </div>

      <BaseButton v-if="company && canManage" variant="outline" size="sm" @click="editing = true">
        <Pencil class="size-4" />
        Edit
      </BaseButton>
    </div>

    <BaseAlert v-if="errorMessage" type="error" :message="errorMessage" class="mb-4" />

    <ProfileFieldGrid v-if="company" :fields="fields" />

    <p v-else class="text-muted">Akun ini tidak terhubung ke perusahaan.</p>

    <CompanyEditModal
      v-if="editing && company"
      :company="company"
      @close="editing = false"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Pencil } from 'lucide-vue-next'
import ProfileFieldGrid from './ProfileFieldGrid.vue'
import CompanyEditModal from './CompanyEditModal.vue'
import { BaseAlert, BaseButton } from '@/components/ui'
import { usePermission } from '@/composables/usePermission'
import { toMessage } from '@/lib/errors'
import { companyService, type CompanyProfile } from '@/services/company.service'

const { can } = usePermission()
const canManage = computed(() => can('company.manage'))

const company = ref<CompanyProfile | null>(null)
const editing = ref(false)
const errorMessage = ref<string | null>(null)

const initials = computed(() => {
  const name = company.value?.name?.trim()
  if (!name) {
    return '?'
  }
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
})

const fields = computed(() => [
  { label: 'Nama', value: company.value?.name || '—' },
  { label: 'NPWP / Tax ID', value: company.value?.taxId || '—' },
  { label: 'Telepon', value: company.value?.phone || '—' },
  { label: 'Alamat', value: company.value?.address || '—' },
  { label: 'Kota', value: company.value?.city || '—' },
  { label: 'Provinsi', value: company.value?.province || '—' },
  { label: 'Kode Pos', value: company.value?.postalCode || '—' },
  { label: 'Negara', value: company.value?.country || '—' },
])

async function load(): Promise<void> {
  errorMessage.value = null
  try {
    company.value = await companyService.getMyCompany()
  } catch (error) {
    errorMessage.value = toMessage(error)
  }
}

function onSaved(updated: CompanyProfile): void {
  company.value = updated
  editing.value = false
}

onMounted(() => {
  void load()
})
</script>
