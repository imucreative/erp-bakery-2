<template>
  <div class="section-card">
    <h4 class="card-title mb-3 lg:mb-6">Security</h4>

    <ProfileActionRow
      title="Change Password"
      description="Update your account password regularly."
    >
      <BaseButton variant="outline" size="sm" @click="passwordModalOpen = true">
        <KeyRound class="size-5" />
        Change Password
      </BaseButton>
    </ProfileActionRow>

    <ProfileActionRow
      title="Two-factor authentication (2FA)"
      description="Keep your account secure by enabling 2FA"
    >
      <Badge :color="twoFactor.color">{{ twoFactor.label }}</Badge>
    </ProfileActionRow>

    <BaseAlert
      v-if="passwordSaved"
      variant="success"
      class="mb-4"
      message="Password berhasil diganti. Sesi di perangkat lain sudah dicabut."
    />

    <TwoFactorPanel @update:status="twoFactorStatus = $event" />

    <ChangePasswordModal
      v-if="passwordModalOpen"
      @close="passwordModalOpen = false"
      @saved="onPasswordSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { KeyRound } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseAlert, BaseButton } from '@/components/ui'
import ProfileActionRow from './ProfileActionRow.vue'
import TwoFactorPanel from './TwoFactorPanel.vue'
import ChangePasswordModal from './ChangePasswordModal.vue'

const passwordModalOpen = ref(false)
const passwordSaved = ref(false)
const twoFactorStatus = ref({ enabled: false, pending: false })

const twoFactor = computed<{ color: 'success' | 'warning' | 'light'; label: string }>(() => ({
  color: twoFactorStatus.value.enabled
    ? 'success'
    : twoFactorStatus.value.pending
      ? 'warning'
      : 'light',
  label: twoFactorStatus.value.enabled
    ? 'Aktif'
    : twoFactorStatus.value.pending
      ? 'Menunggu konfirmasi'
      : 'Nonaktif',
}))

function onPasswordSaved(): void {
  passwordModalOpen.value = false
  passwordSaved.value = true
}
</script>
