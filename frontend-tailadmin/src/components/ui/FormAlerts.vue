<template>
  <div v-if="error || success">
    <BaseAlert v-if="error" type="error" :message="error" />
    <BaseAlert v-if="success" variant="success" :message="success" class="mt-3" />
  </div>
</template>

<script setup lang="ts">
import BaseAlert from './BaseAlert.vue'

/**
 * FormAlerts — pasangan alert error + sukses untuk form/panel. Dipakai agar setiap
 * form tidak menulis ulang dua blok BaseAlert (dan tidak lupa menaruhnya di dalam
 * modal). Tidak merender apa pun bila keduanya kosong.
 */
defineProps<{
  error?: string | null
  success?: string | null
}>()
</script>
