<template>
  <div class="pt-4">
    <BaseAlert
      v-if="requiredNotice && !status.enabled"
      type="error"
      class="mb-4"
      message="Konsol platform mewajibkan 2FA. Aktifkan di bawah untuk melanjutkan."
    />
    <BaseAlert v-if="errorMessage" type="error" :message="errorMessage" class="mb-4" />
    <BaseAlert v-if="successMessage" variant="success" :message="successMessage" class="mb-4" />

    <!-- Not enrolled -->
    <ProfileActionRow
      v-if="!status.enabled && !setupData"
      title=""
      description="Gunakan aplikasi authenticator (Google Authenticator, Authy, 1Password, ...) untuk menghasilkan kode 6 digit setiap kali login."
    >
      <BaseButton variant="primary" size="sm" :loading="loading" @click="startSetup">
        <KeyRound class="size-5" />
        Aktifkan 2FA
      </BaseButton>
    </ProfileActionRow>

    <!-- Enrollment in progress -->
    <TwoFactorSetup
      v-else-if="setupData"
      v-model:code="code"
      :setup="setupData"
      :loading="loading"
      @confirm="enable"
      @cancel="cancelSetup"
    />

    <!-- Enabled -->
    <div v-else class="space-y-3">
      <p class="text-muted">
        Login berikutnya memerlukan kode dari aplikasi authenticator (atau salah satu kode
        recovery).
      </p>
      <div class="stack-row sm:items-end">
        <div class="w-full sm:max-w-xs">
          <BaseFormField label="Kode saat ini" field-id="two-factor-disable-code" required>
            <BaseInput
              id="two-factor-disable-code"
              v-model="code"
              placeholder="123456"
              autocomplete="one-time-code"
            />
          </BaseFormField>
        </div>
        <BaseButton
          variant="outline"
          size="sm"
          :loading="loading"
          :disabled="!code"
          @click="disable"
        >
          Nonaktifkan 2FA
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { KeyRound } from 'lucide-vue-next'
import ProfileActionRow from './ProfileActionRow.vue'
import TwoFactorSetup from './TwoFactorSetup.vue'
import { BaseAlert, BaseButton, BaseFormField, BaseInput } from '@/components/ui'
import { authService, type TwoFactorSetup as TwoFactorSetupData } from '@/services/auth.service'
import { toMessage } from '@/lib/errors'
import { resetTwoFactorGate } from '@/lib/twoFactorGate'

/**
 * Seluruh alur 2FA (status, enrollment, nonaktifkan). Status diteruskan ke
 * Security.vue lewat `update:status` supaya baris kartunya bisa menampilkan Badge.
 */
const emit = defineEmits<{
  'update:status': [value: { enabled: boolean; pending: boolean }]
}>()

const route = useRoute()
const requiredNotice = computed(() => route.query.twoFactor === 'required')

const enabled = ref(false)
const pending = ref(false)
const setupData = ref<TwoFactorSetupData | null>(null)
const code = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const status = computed(() => ({ enabled: enabled.value, pending: pending.value }))

watch(status, (value) => emit('update:status', value))

async function refresh(): Promise<void> {
  try {
    const current = await authService.getTwoFactorStatus()
    enabled.value = current.enabled
    pending.value = current.pending
    emit('update:status', status.value)
  } catch {
    // Status is informational only; keep the section usable.
  }
}

async function startSetup(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  successMessage.value = null
  try {
    setupData.value = await authService.setupTwoFactor()
    code.value = ''
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    loading.value = false
  }
}

async function enable(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  successMessage.value = null
  try {
    await authService.enableTwoFactor(code.value.trim())
    enabled.value = true
    pending.value = false
    setupData.value = null
    code.value = ''
    successMessage.value = '2FA berhasil diaktifkan.'
    resetTwoFactorGate()
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    loading.value = false
  }
}

async function disable(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  successMessage.value = null
  try {
    await authService.disableTwoFactor(code.value.trim())
    enabled.value = false
    pending.value = false
    code.value = ''
    successMessage.value = '2FA dinonaktifkan.'
    resetTwoFactorGate()
  } catch (error) {
    errorMessage.value = toMessage(error)
  } finally {
    loading.value = false
  }
}

function cancelSetup(): void {
  setupData.value = null
  code.value = ''
  errorMessage.value = null
}

onMounted(() => {
  void refresh()
})
</script>
