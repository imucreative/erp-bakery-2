<template>
  <div class="panel-card">
    <p class="text-meta mb-2">Kode recovery (simpan sekarang — hanya ditampilkan sekali):</p>
    <div class="text-body grid grid-cols-2 gap-1 font-mono sm:grid-cols-3">
      <span v-for="code in codes" :key="code">{{ code }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Single-use recovery codes shown right after 2FA enrollment (displayed once). */
defineProps<{
  codes: string[]
}>()
</script>
