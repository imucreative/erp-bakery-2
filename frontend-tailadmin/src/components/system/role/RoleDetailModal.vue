<script setup lang="ts">
/**
 * RoleDetailModal — read-only view of a role's permissions, grouped by the
 * leading domain segment (e.g. `product.read` → `product`) for readability.
 * Backdrop, Esc-close, and panel chrome come from BaseModal.
 */
import { computed } from 'vue'
import { BaseAlert, BaseButton, BaseModal } from '@/components/ui'
import { X } from 'lucide-vue-next'
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
  <BaseModal :open="open" size="2xl" scrollable @close="emit('close')">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h4 class="modal-title">{{ title }}</h4>
        <p v-if="code" class="mt-0.5 font-mono text-meta">
          {{ code }}
        </p>
      </div>
      <Badge color="info">{{ permissionCount }} permission</Badge>
    </div>

    <div v-if="loading" class="text-muted py-8 text-center">Memuat permission...</div>

    <BaseAlert v-else-if="errorMessage" size="sm">{{ errorMessage }}</BaseAlert>

    <div v-else-if="groups.length === 0" class="text-muted py-8 text-center">
      Role ini tidak memiliki permission.
    </div>

    <div v-else class="space-y-4">
      <div v-for="group in groups" :key="group.domain" class="space-y-2">
        <p
          class="text-theme-xs font-semibold uppercase capitalize text-warning-500 dark:text-warning-400"
        >
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

    <div class="mt-6 button-row">
      <BaseButton size="sm" variant="outline" @click="emit('close')">
        <template #start-icon><X class="h-4 w-4" aria-hidden="true" /></template>
        Tutup
      </BaseButton>
    </div>
  </BaseModal>
</template>
