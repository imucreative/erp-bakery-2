<script setup lang="ts">
/**
 * RoleDetailModal — read-only view of a role's permissions, grouped by the
 * leading domain segment (e.g. `product.read` → `product`) for readability.
 * Transparent backdrop per UI standard.
 */
import { computed } from 'vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import type { Role, RoleDetail } from '@/services/role.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    /** Fallback role (from the list row) shown while the detail loads. */
    fallback?: Role | null
    detail?: RoleDetail | null
    loading?: boolean
    errorMessage?: string | null
  }>(),
  { fallback: null, detail: null, loading: false, errorMessage: null },
)

const emit = defineEmits<{ (event: 'close'): void }>()

const title = computed<string>(() => props.detail?.name ?? props.fallback?.name ?? 'Role')
const code = computed<string>(() => props.detail?.code ?? props.fallback?.code ?? '')

interface PermissionGroup {
  domain: string
  codes: string[]
}

const groups = computed<PermissionGroup[]>(() => {
  const perms = props.detail?.permissions ?? []
  const buckets = new Map<string, string[]>()
  for (const code of perms) {
    const domain = code.includes('.') ? code.split('.')[0] : 'lainnya'
    const list = buckets.get(domain)
    if (list) {
      list.push(code)
    } else {
      buckets.set(domain, [code])
    }
  }
  return Array.from(buckets.entries())
    .map(([domain, codes]) => ({ domain, codes: [...codes].sort() }))
    .sort((a, b) => a.domain.localeCompare(b.domain))
})

const permissionCount = computed<number>(() => props.detail?.permissions.length ?? 0)
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4">
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <div
      class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ title }}</h4>
          <p v-if="code" class="mt-0.5 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
            {{ code }}
          </p>
        </div>
        <Badge color="info">{{ permissionCount }} permission</Badge>
      </div>

      <div v-if="loading" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Memuat permission...
      </div>

      <div
        v-else-if="errorMessage"
        class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      >
        {{ errorMessage }}
      </div>

      <div
        v-else-if="groups.length === 0"
        class="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        Role ini tidak memiliki permission.
      </div>

      <div v-else class="space-y-4">
        <div v-for="group in groups" :key="group.domain" class="space-y-2">
          <p class="text-theme-xs font-semibold uppercase capitalize text-gray-500 dark:text-gray-400">
            {{ group.domain }}
          </p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="c in group.codes"
              :key="c"
              class="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-theme-xs text-gray-700 dark:bg-white/5 dark:text-gray-300"
            >
              {{ c }}
            </span>
          </div>
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <Button size="sm" variant="outline" :on-click="() => emit('close')">Tutup</Button>
      </div>
    </div>
  </div>
</template>
