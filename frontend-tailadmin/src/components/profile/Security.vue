<template>
  <div class="section-card">
    <h4 class="card-title mb-3 lg:mb-6">Security</h4>

    <div>
      <ProfileActionRow
        title="Change Password"
        description="Update your account password regularly."
      >
        <BaseButton variant="outline" size="sm">
          <KeyRound class="size-5" />
          Change Password
        </BaseButton>
      </ProfileActionRow>

      <ProfileActionRow
        title="Two-factor authentication (2FA)"
        description="Keep your account secure by enabling 2FA"
      >
        <Badge :color="enabled ? 'success' : pending ? 'warning' : 'light'">
          {{ statusLabel }}
        </Badge>
      </ProfileActionRow>

      <div class="pt-4">
        <BaseAlert
          v-if="requiredNotice && !enabled"
          type="error"
          class="mb-4"
          message="Konsol platform mewajibkan 2FA. Aktifkan di bawah untuk melanjutkan."
        />
        <BaseAlert v-if="errorMessage" type="error" :message="errorMessage" class="mb-4" />
        <BaseAlert
          v-if="successMessage"
          variant="success"
          :message="successMessage"
          class="mb-4"
        />

        <!-- Not enrolled -->
        <div v-if="!enabled && !setupData" class="space-y-3">
          <ProfileActionRow
            title=""
            description="Gunakan aplikasi authenticator (Google Authenticator, Authy, 1Password, ...) untuk
              menghasilkan kode 6 digit setiap kali login."
          >
            <BaseButton variant="primary" size="sm" :loading="loading" @click="startSetup">
              <KeyRound class="size-5" />
              Aktifkan 2FA
            </BaseButton>
          </ProfileActionRow>
        </div>

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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { KeyRound } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseAlert, BaseButton, BaseFormField, BaseInput } from '@/components/ui'
import ProfileActionRow from './ProfileActionRow.vue'
import TwoFactorSetup from './TwoFactorSetup.vue'
import { authService, type TwoFactorSetup as TwoFactorSetupData } from '@/services/auth.service'
import { toMessage } from '@/lib/errors'
import { resetTwoFactorGate } from '@/lib/twoFactorGate'

const route = useRoute()
const requiredNotice = computed(() => route.query.twoFactor === 'required')

const enabled = ref(false)
const pending = ref(false)
const setupData = ref<TwoFactorSetupData | null>(null)
const code = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const statusLabel = computed(() =>
  enabled.value ? 'Aktif' : pending.value ? 'Menunggu konfirmasi' : 'Nonaktif',
)

async function refresh(): Promise<void> {
  try {
    const status = await authService.getTwoFactorStatus()
    enabled.value = status.enabled
    pending.value = status.pending
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
