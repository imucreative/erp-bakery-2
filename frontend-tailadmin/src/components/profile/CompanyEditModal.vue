<template>
  <ProfileEditModal
    title="Edit Perusahaan"
    description="Perbarui identitas dan alamat perusahaan Anda."
    :saving="saving"
    @close="emit('close')"
    @submit="save"
  >
    <div v-if="errorMessage" class="col-span-2">
      <BaseAlert type="error" :message="errorMessage" />
    </div>

    <div class="col-span-2">
      <BaseFormField label="Nama Perusahaan" field-id="company-name">
        <BaseInput id="company-name" v-model="form.name" placeholder="Nama perusahaan" />
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
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import ProfileEditModal from './ProfileEditModal.vue'
import { BaseAlert, BaseFormField, BaseInput } from '@/components/ui'
import { toMessage } from '@/lib/errors'
import { companyService, type CompanyProfile } from '@/services/company.service'

/**
 * Form edit profil perusahaan. Dipisah dari CompanyCard.vue supaya kartunya
 * tinggal menampilkan data. Nilai awal diambil dari prop `company` saat komponen
 * dibuat (induk memakainya bersama `v-if`).
 */
const props = defineProps<{ company: CompanyProfile }>()

const emit = defineEmits<{
  close: []
  saved: [value: CompanyProfile]
}>()

const form = reactive({
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

const saving = ref(false)
const errorMessage = ref<string | null>(null)

async function save(): Promise<void> {
  saving.value = true
  errorMessage.value = null
  try {
    const name = form.name.trim()
    const updated = await companyService.updateMyCompany({
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
    emit('saved', updated)
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    saving.value = false
  }
}
</script>
