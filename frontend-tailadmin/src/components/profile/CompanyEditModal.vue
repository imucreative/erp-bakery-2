<template>
  <ProfileEditModal
    title="Edit Perusahaan"
    description="Perbarui identitas dan alamat perusahaan Anda."
    :saving="loading"
    @close="emit('close')"
    @submit="save"
  >
    <FormAlerts class="col-span-2" :error="errorMessage" :success="successMessage" />

    <ProfileFieldEditor v-model="form" :fields="fields" />
  </ProfileEditModal>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import ProfileEditModal from './ProfileEditModal.vue'
import ProfileFieldEditor, { type ProfileEditField } from './ProfileFieldEditor.vue'
import { FormAlerts } from '@/components/ui'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { companyService, type CompanyProfile } from '@/services/company.service'

/**
 * Form edit profil perusahaan. Nilai awal dari prop `company` saat komponen dibuat;
 * hasil server dikirim balik lewat `saved`.
 */
const props = defineProps<{ company: CompanyProfile }>()

const emit = defineEmits<{
  close: []
  saved: [value: CompanyProfile]
}>()

const { loading, errorMessage, successMessage, run } = useAsyncAction()

const form = reactive<Record<string, string>>({
  name: props.company.name ?? '',
  taxId: props.company.taxId ?? '',
  phone: props.company.phone ?? '',
  address: props.company.address ?? '',
  city: props.company.city ?? '',
  province: props.company.province ?? '',
  postalCode: props.company.postalCode ?? '',
  country: props.company.country ?? 'Indonesia',
  logoUrl: props.company.logoUrl ?? '',
})

const fields: ProfileEditField[] = [
  { key: 'name', label: 'Nama Perusahaan', placeholder: 'Nama perusahaan', full: true },
  { key: 'taxId', label: 'NPWP / Tax ID', placeholder: 'mis. 01.234.567.8-901.000' },
  { key: 'phone', label: 'Telepon', placeholder: 'mis. 021-1234567' },
  { key: 'address', label: 'Alamat', placeholder: 'Alamat lengkap', full: true },
  { key: 'city', label: 'Kota', placeholder: 'mis. Depok' },
  { key: 'province', label: 'Provinsi', placeholder: 'mis. Jawa Barat' },
  { key: 'postalCode', label: 'Kode Pos', placeholder: 'mis. 16411' },
  { key: 'country', label: 'Negara', placeholder: 'Indonesia' },
  { key: 'logoUrl', label: 'URL Logo', placeholder: 'https://...', full: true },
]

async function save(): Promise<void> {
  const name = form.name.trim()

  const updated = await run(() => {
    return companyService.updateMyCompany({
      // `name` opsional di DTO — kirim hanya bila tidak kosong.
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
  })

  if (updated) {
    emit('saved', updated)
  }
}
</script>
