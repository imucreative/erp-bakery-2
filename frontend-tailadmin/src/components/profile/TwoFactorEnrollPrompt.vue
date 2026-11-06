<template>
  <ProfileActionRow
    title=""
    description="Gunakan aplikasi authenticator (Google Authenticator, Authy, 1Password, ...) untuk menghasilkan kode 6 digit setiap kali login."
  >
    <BaseButton variant="primary" size="sm" :loading="loading" @click="emit('start')">
      <KeyRound class="size-5" />
      Aktifkan 2FA
    </BaseButton>
  </ProfileActionRow>
</template>

<script setup lang="ts">
import { KeyRound } from 'lucide-vue-next'
import ProfileActionRow from './ProfileActionRow.vue'
import { BaseButton } from '@/components/ui'

/** Ajakan mengaktifkan 2FA saat akun belum terdaftar di authenticator. */
defineProps<{ loading?: boolean }>()

const emit = defineEmits<{
  start: []
}>()
</script>
