<template>
  <div class="section-card">
    <h4 class="card-title mb-3 lg:mb-6">Danger Zone</h4>

    <ProfileActionRow title="Logout all devices" description="Sign out from every active session.">
      <BaseButton variant="outline" size="sm">
        <LogOut class="size-5" />
        Logout all devices
      </BaseButton>
    </ProfileActionRow>

    <ProfileActionRow
      title="Delete account"
      description="Hapus akun secara permanen. Tindakan ini tidak dapat dibatalkan."
    >
      <BaseButton variant="danger" size="sm">
        <Trash2 class="size-5" />
        Delete account
      </BaseButton>
    </ProfileActionRow>
  </div>
</template>

<script setup lang="ts">
import { LogOut, Trash2 } from 'lucide-vue-next'
import { BaseButton } from '@/components/ui'
import ProfileActionRow from './ProfileActionRow.vue'
</script>
