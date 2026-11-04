<template>
  <div class="mb-6 rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800">
    <div class="flex flex-col gap-6 sm:flex-row lg:items-start lg:justify-between">
      <div class="flex-1">
        <h4 class="card-title mb-4 lg:mb-6">Address</h4>

        <BaseAlert v-if="errorMessage" type="error" :message="errorMessage" class="mb-4" />

        <div
          v-if="company"
          class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32"
        >
          <div v-for="field in fields" :key="field.label">
            <p class="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
              {{ field.label }}
            </p>
            <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ field.value }}</p>
          </div>
        </div>

        <p v-else class="text-muted">Akun ini tidak terhubung ke perusahaan.</p>
      </div>

      <div v-if="company && canManage">
        <BaseButton variant="outline" size="sm" @click="openEdit">Edit</BaseButton>
      </div>
    </div>

    <Modal v-if="editing" @close="closeEdit">
      <template #body>
        <div
          class="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 lg:p-11 dark:bg-gray-900"
        >
          <div class="px-2">
            <h4 class="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Address
            </h4>
            <p class="text-muted mb-6 lg:mb-7">Perbarui data perusahaan Anda.</p>
          </div>
          <form class="flex flex-col" @submit.prevent="save">
            <div class="grid grid-cols-1 gap-x-6 gap-y-5 px-2 lg:grid-cols-2">
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
              <div>
                <BaseFormField label="NPWP / Tax ID" field-id="company-tax-id">
                  <BaseInput id="company-tax-id" v-model="form.taxId" placeholder="mis. 01.234.567.8-901.000" />
                </BaseFormField>
              </div>
              <div>
                <BaseFormField label="Telepon" field-id="company-phone">
                  <BaseInput id="company-phone" v-model="form.phone" placeholder="mis. 021-1234567" />
                </BaseFormField>
              </div>
            </div>
            <div class="mt-6 flex items-center gap-3 px-2 lg:justify-end">
              <BaseButton variant="outline" size="sm" type="button" @click="closeEdit">
                Batal
              </BaseButton>
              <BaseButton variant="primary" size="sm" type="submit" :loading="saving">
                Simpan
              </BaseButton>
            </div>
          </form>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Modal from './Modal.vue'
import { BaseAlert, BaseButton, BaseFormField, BaseInput } from '@/components/ui'
import { usePermission } from '@/composables/usePermission'
import { ApiClientError } from '@/services/http'
import { companyService, type CompanyProfile } from '@/services/company.service'

const { can } = usePermission()
const canManage = computed(() => can('company.manage'))

const company = ref<CompanyProfile | null>(null)
const editing = ref(false)
const saving = ref(false)
const errorMessage = ref<string | null>(null)

const form = reactive({
  address: '',
  city: '',
  province: '',
  postalCode: '',
  country: '',
  taxId: '',
  phone: '',
})

const fields = computed(() => [
  { label: 'Alamat', value: company.value?.address || '—' },
  { label: 'Kota', value: company.value?.city || '—' },
  { label: 'Provinsi', value: company.value?.province || '—' },
  { label: 'Kode Pos', value: company.value?.postalCode || '—' },
  { label: 'Negara', value: company.value?.country || '—' },
  { label: 'NPWP / Tax ID', value: company.value?.taxId || '—' },
  { label: 'Telepon', value: company.value?.phone || '—' },
])

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

async function load(): Promise<void> {
  errorMessage.value = null
  try {
    company.value = await companyService.getMyCompany()
  } catch (error) {
    errorMessage.value = toMessage(error)
  }
}

function openEdit(): void {
  form.address = company.value?.address ?? ''
  form.city = company.value?.city ?? ''
  form.province = company.value?.province ?? ''
  form.postalCode = company.value?.postalCode ?? ''
  form.country = company.value?.country ?? 'Indonesia'
  form.taxId = company.value?.taxId ?? ''
  form.phone = company.value?.phone ?? ''
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
    company.value = await companyService.updateMyCompany({
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      province: form.province.trim() || null,
      postalCode: form.postalCode.trim() || null,
      country: form.country.trim() || 'Indonesia',
      taxId: form.taxId.trim() || null,
      phone: form.phone.trim() || null,
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
