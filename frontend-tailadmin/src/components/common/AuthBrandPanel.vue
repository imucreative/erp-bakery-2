<template>
  <div class="auth-brand-panel">
    <div class="items-center justify-center flex z-1">
      <CommonGridShape />
      <div class="flex flex-col items-center max-w-xs">
        <router-link to="/" class="block mb-4">
          <img width="{231}" height="{48}" src="/images/logo/logo-dark.svg" alt="Logo" />
        </router-link>
        <p class="text-center text-gray-400 dark:text-white/60">{{ tagline }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommonGridShape from './CommonGridShape.vue'

/**
 * Panel kanan halaman auth: latar brand + grid dekoratif + logo. Dipakai bersama
 * Signin, Signup, Lupa Password, dan Reset Password supaya keempatnya konsisten.
 */
withDefaults(defineProps<{ tagline?: string }>(), {
  tagline: 'Kelola operasional bakery Anda dalam satu platform ERP terpadu.',
})
</script>
