<template>
  <li class="relative">
    <button
      type="button"
      class="menu-dropdown-item w-full justify-between"
      :class="open ? 'menu-dropdown-item-active' : 'menu-dropdown-item-inactive'"
      @click.stop="open = !open"
    >
      <span class="flex items-center gap-3">
        <Globe class="size-5" />
        <span>Language</span>
      </span>

      <span class="form-readonly flex items-center gap-1.5 px-2 py-1 text-theme-xs">
        <span>{{ currentLang.shortName }}</span>
        <img
          :src="`/images/icons/${currentLang.flag}`"
          :alt="currentLang.shortName"
          class="size-3.5 shrink-0 rounded-full object-cover"
        />
      </span>
    </button>

    <div
      v-if="open"
      class="absolute top-11 z-50 w-[250px] rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg ltr:-left-2 rtl:-right-2 md:top-0 ltr:md:right-[calc(100%+14px)] ltr:md:left-auto rtl:md:left-[calc(100%+14px)] rtl:md:right-auto dark:border-gray-800 dark:bg-gray-dark animate-fadeIn"
    >
      <ul class="flex flex-col gap-1">
        <li v-for="language in languages" :key="language.id">
          <button
            type="button"
            class="menu-dropdown-item w-full justify-between"
            :class="
              language.id === currentLocale
                ? 'menu-dropdown-item-active'
                : 'menu-dropdown-item-inactive'
            "
            @click.stop="select(language.id)"
          >
            <span class="flex items-center gap-2">
              <span
                class="size-1.5 shrink-0 rounded-full transition-opacity"
                :class="
                  language.id === currentLocale
                    ? 'bg-brand-500 opacity-100 dark:bg-brand-400'
                    : 'opacity-0'
                "
              ></span>
              <img
                :src="`/images/icons/${language.flag}`"
                :alt="language.name"
                class="size-5 shrink-0 rounded-full object-cover"
              />
              <span class="truncate">{{ language.name }}</span>
            </span>

            <Badge v-if="language.badge" color="warning" size="sm">{{ language.badge }}</Badge>
          </button>
        </li>
      </ul>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Globe } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { useRTL } from '@/composables/useRTL'

interface Language {
  id: string
  name: string
  shortName: string
  flag: string
  dir: 'ltr' | 'rtl'
  badge?: string
}

const languages: Language[] = [
  { id: 'en', name: 'English', shortName: 'English', flag: 'flag-us.svg', dir: 'ltr' },
  {
    id: 'ar',
    name: 'Arabic (Saudi)',
    shortName: 'Arabic',
    flag: 'flag-sa.svg',
    dir: 'rtl',
    badge: 'RTL',
  },
  { id: 'es', name: 'Español', shortName: 'Español', flag: 'flag-es.svg', dir: 'ltr' },
  { id: 'de', name: 'Deutsch', shortName: 'Deutsch', flag: 'flag-de.svg', dir: 'ltr' },
]

const emit = defineEmits<{
  (event: 'close'): void
}>()

const { isRtl, setRTL } = useRTL()

const currentLocale = ref<string>(isRtl.value ? 'ar' : 'en')
const open = ref(false)
const currentLang = computed<Language>(
  () => languages.find((language) => language.id === currentLocale.value) ?? languages[0],
)

function select(localeId: string): void {
  currentLocale.value = localeId
  setRTL(languages.find((language) => language.id === localeId)?.dir === 'rtl')
  open.value = false
  emit('close')
}
</script>
