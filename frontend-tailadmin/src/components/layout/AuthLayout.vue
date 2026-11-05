<template>
  <FullScreenLayout>
    <div class="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div
        class="relative flex lg:flex-row w-full h-screen justify-center flex-col dark:bg-gray-900"
      >
        <div class="flex flex-col flex-1 lg:w-1/2 w-full">
          <slot name="top" />

          <div :class="['flex flex-col justify-center flex-1 w-full mx-auto', widthClass, contentClass]">
            <slot />
          </div>
        </div>

        <AuthBrandPanel :tagline="tagline" />
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FullScreenLayout from './FullScreenLayout.vue'
import AuthBrandPanel from '@/components/common/AuthBrandPanel.vue'

/**
 * AuthLayout — kerangka halaman auth: konten di kolom kiri, panel brand di kanan.
 * Dipakai Signin, Signup, Lupa Password, dan Reset Password supaya keempatnya
 * seragam (sebelumnya rantai pembungkus ini disalin di tiap halaman).
 *
 * Slot:
 *  - default : isi kolom kiri (judul + form)
 *  - `top`   : baris di atas konten (mis. tautan "kembali ke Sign In" di Signup)
 */
const props = withDefaults(
  defineProps<{
    /** Lebar maksimum kolom konten: `md` (form pendek) atau `xl` (form panjang). */
    size?: 'md' | 'xl'
    /** Kelas tambahan untuk kolom konten, mis. padding vertikal khusus. */
    contentClass?: string
    /** Teks di panel brand kanan. */
    tagline?: string
  }>(),
  { size: 'md', contentClass: '', tagline: undefined },
)

const widthClass = computed(() => (props.size === 'xl' ? 'max-w-xl' : 'max-w-md'))
</script>
