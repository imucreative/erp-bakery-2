<template>
  <div class="pt-4">
    <BaseAlert
      v-if="requiredNotice && !status.enabled"
      type="error"
      class="mb-4"
      message="Konsol platform mewajibkan 2FA. Aktifkan di bawah untuk melanjutkan."
    />
    <FormAlerts :error="errorMessage" :success="successMessage" class="mb-4" />

    <TwoFactorEnrollPrompt
      v-if="!status.enabled && !setupData"
      :loading="loading"
      @start="startSetup"
    />

    <TwoFactorSetup
      v-else-if="setupData"
      v-model:code="code"
      :setup="setupData"
      :loading="loading"
      @confirm="enable"
      @cancel="cancelSetup"
    />

    <TwoFactorDisableForm v-else :loading="loading" @disable="disable" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TwoFactorEnrollPrompt from './TwoFactorEnrollPrompt.vue'
import TwoFactorDisableForm from './TwoFactorDisableForm.vue'
import TwoFactorSetup from './TwoFactorSetup.vue'
import { BaseAlert, FormAlerts } from '@/components/ui'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { authService, type TwoFactorSetup as TwoFactorSetupData } from '@/services/auth.service'
import { resetTwoFactorGate } from '@/lib/twoFactorGate'

/**
 * Orkestrasi alur 2FA: status, enrollment, aktifkan, nonaktifkan. Setiap state
 * tampilan ada di komponennya sendiri; status diteruskan ke Security.vue lewat
 * `update:status` supaya Badge di baris kartu tetap sinkron.
 */
const emit = defineEmits<{
  'update:status': [value: { enabled: boolean; pending: boolean }]
}>()

const route = useRoute()
const requiredNotice = computed(() => route.query.twoFactor === 'required')

const { loading, errorMessage, successMessage, run, reset } = useAsyncAction()

const enabled = ref(false)
const pending = ref(false)
const setupData = ref<TwoFactorSetupData | null>(null)
const code = ref('')

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
  const data = await run(() => authService.setupTwoFactor())
  if (data) {
    setupData.value = data
    code.value = ''
  }
}

async function enable(): Promise<void> {
  const done = await run(
    () => authService.enableTwoFactor(code.value.trim()),
    '2FA berhasil diaktifkan.',
  )
  if (done === null) {
    return
  }

  enabled.value = true
  pending.value = false
  setupData.value = null
  code.value = ''
  resetTwoFactorGate()
}

async function disable(input: string): Promise<void> {
  const done = await run(
    () => authService.disableTwoFactor(input.trim()),
    '2FA dinonaktifkan.',
  )
  if (done === null) {
    return
  }

  enabled.value = false
  pending.value = false
  resetTwoFactorGate()
}

function cancelSetup(): void {
  setupData.value = null
  code.value = ''
  reset()
}

onMounted(() => {
  void refresh()
})
</script>
