<template>
  <div class="section-card">
    <div class="flex flex-col gap-6 sm:flex-row lg:items-start lg:justify-between">
      <div class="flex-1">
        <div class="mb-4 flex items-center gap-4 lg:mb-6">
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

        <BaseAlert v-if="errorMessage" type="error" :message="errorMessage" class="mb-4" />

        <ProfileFieldGrid v-if="company" :fields="fields" />

        <p v-else class="text-muted">Akun ini tidak terhubung ke perusahaan.</p>
      </div>

      <div v-if="company && canManage">
        <BaseButton variant="outline" size="sm" @click="openEdit">
          <Pencil class="size-4" />
          Edit</BaseButton>
      </div>
    </div>

    <ProfileEditModal
      v-if="editing"
      title="Edit Perusahaan"
      description="Perbarui identitas dan alamat perusahaan Anda."
      :saving="saving"
      @close="closeEdit"
      @submit="save"
    >
      <div class="col-span-2">
        <BaseFormField label="Nama Perusahaan" field-id="company-name">
          <BaseInput id="company-name" v-model="form.name" placeholder="Nama perusahaan" />
        </BaseFormField>
      </div>
      <div>
        <BaseFormField label="NPWP / Tax ID" field-id="company-tax-id">
          <BaseInput
            id="company-tax-id"
            v-model="form.taxId"
            placeholder="mis. 01.234.567.8-901.000"
          />
        </BaseFormField>
      </div>
      <div>
        <BaseFormField label="Telepon" field-id="company-phone">
          <BaseInput id="company-phone" v-model="form.phone" placeholder="mis. 021-1234567" />
        </BaseFormField>
      </div>
      <div class="col-span-2">
        <BaseFormField label="Alamat" field-id="company-address">
          <BaseInput id="company-address" v-model="form.address" placeholder="Alamat lengkap" />
        </BaseFormField>
      </div>
      <div>
        <BaseFormField label="Kota" field-id="company-city">
          <BaseInput id="company-city" v-model="form.city" placeholder="mis. Depok" />
        </BaseFormField>
      </div>
      <div>
        <BaseFormField label="Provinsi" field-id="company-province">
          <BaseInput id="company-province" v-model="form.province" placeholder="mis. Jawa Barat" />
        </BaseFormField>
      </div>
      <div>
        <BaseFormField label="Kode Pos" field-id="company-postal-code">
          <BaseInput id="company-postal-code" v-model="form.postalCode" placeholder="mis. 16411" />
        </BaseFormField>
      </div>
      <div>
        <BaseFormField label="Negara" field-id="company-country">
          <BaseInput id="company-country" v-model="form.country" placeholder="Indonesia" />
        </BaseFormField>
      </div>
      <div class="col-span-2">
        <BaseFormField label="URL Logo" field-id="company-logo">
          <BaseInput id="company-logo" v-model="form.logoUrl" placeholder="https://..." />
        </BaseFormField>
      </div>
    </ProfileEditModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ProfileFieldGrid from './ProfileFieldGrid.vue'
import ProfileEditModal from './ProfileEditModal.vue'
import { BaseAlert, BaseButton, BaseFormField, BaseInput } from '@/components/ui'
import { usePermission } from '@/composables/usePermission'
import { toMessage } from '@/lib/errors'
import { companyService, type CompanyProfile } from '@/services/company.service'
import { Pencil } from 'lucide-vue-next'

const { can } = usePermission()
const canManage = computed(() => can('company.manage'))

const company = ref<CompanyProfile | null>(null)
const editing = ref(false)
const saving = ref(false)
const errorMessage = ref<string | null>(null)

const form = reactive({
  name: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  country: '',
  taxId: '',
  phone: '',
  logoUrl: '',
})

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

function openEdit(): void {
  form.name = company.value?.name ?? ''
  form.address = company.value?.address ?? ''
  form.city = company.value?.city ?? ''
  form.province = company.value?.province ?? ''
  form.postalCode = company.value?.postalCode ?? ''
  form.country = company.value?.country ?? 'Indonesia'
  form.taxId = company.value?.taxId ?? ''
  form.phone = company.value?.phone ?? ''
  form.logoUrl = company.value?.logoUrl ?? ''
  errorMessage.value = null
  editing.value = true
}

function closeEdit(): void {
  editing.value = false
}

async function save(): Promise<void> {
  saving.value = true
  errorMessage.value = null
  try {
    const name = form.name.trim()
    company.value = await companyService.updateMyCompany({
      ...(name ? { name } : {}),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      province: form.province.trim() || null,
      postalCode: form.postalCode.trim() || null,
      country: form.country.trim() || 'Indonesia',
      taxId: form.taxId.trim() || null,
      phone: form.phone.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
    })
    editing.value = false
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
