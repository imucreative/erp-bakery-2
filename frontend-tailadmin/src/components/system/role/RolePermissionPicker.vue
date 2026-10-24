<script setup lang="ts">
/**
 * RolePermissionPicker — checkbox-based permission picker for a role (ADR 49).
 *
 * Renders the global permission catalog grouped by Business Domain → Module →
 * Action (doc 35 §3). Each domain becomes a colored card (Tailwind theme tokens
 * only — no hex) so the 9 canonical domains are visually distinct. Selection is
 * a `string[]` of permission codes exposed via v-model (modelValue + update).
 *
 * Checkbox is intentional here: the user explicitly requested multi-select
 * checkboxes for permission assignment (an authorized exception to ToggleSwitch).
 *
 * Guardrail (OWNER): when `isOwner`, the `role.manage` checkbox is forced
 * checked + disabled with a tooltip; the parent still sends it in the payload
 * and the backend enforces it as defense-in-depth.
 */
import { computed } from 'vue'
import type { Permission } from '@/services/permission.service'
import { BaseAlert, BaseCheckbox } from '@/components/ui'

const props = withDefaults(
  defineProps<{
    /** Global permission catalog (ordered by sortOrder ASC from the backend). */
    catalog: Permission[]
    /** Selected permission codes. */
    modelValue: string[]
    /** OWNER role → force `role.manage` checked + disabled. */
    isOwner?: boolean
    loading?: boolean
    errorMessage?: string | null
  }>(),
  { isOwner: false, loading: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string[]): void
}>()

const OWNER_LOCKED_CODE = 'role.manage'
const UNMAPPED_KEY = '__unmapped__'
const UNMAPPED_LABEL = 'Lainnya'

/**
 * Per-domain accent tokens (theme tokens only). Keys are canonical domain
 * moduleKeys/slugs; a slugified `domain` string maps here. Domains beyond the
 * palette fall back deterministically by hashing the slug so grouping stays
 * consistent across renders.
 */
interface DomainAccent {
  card: string
  header: string
  dot: string
  title: string
}

const DOMAIN_ACCENTS: Record<string, DomainAccent> = {
  'system-administration': {
    card: 'border-brand-200 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/10',
    header: 'bg-brand-50 dark:bg-brand-500/15',
    dot: 'bg-brand-500',
    title: 'text-brand-700 dark:text-brand-300',
  },
  'master-data': {
    card: 'border-blue-light-200 bg-blue-light-50/40 dark:border-blue-light-500/30 dark:bg-blue-light-500/10',
    header: 'bg-blue-light-50 dark:bg-blue-light-500/15',
    dot: 'bg-blue-light-500',
    title: 'text-blue-light-700 dark:text-blue-light-300',
  },
  procurement: {
    card: 'border-orange-200 bg-orange-50/40 dark:border-orange-500/30 dark:bg-orange-500/10',
    header: 'bg-orange-50 dark:bg-orange-500/15',
    dot: 'bg-orange-500',
    title: 'text-orange-700 dark:text-orange-300',
  },
  inventory: {
    card: 'border-success-200 bg-success-50/40 dark:border-success-500/30 dark:bg-success-500/10',
    header: 'bg-success-50 dark:bg-success-500/15',
    dot: 'bg-success-500',
    title: 'text-success-700 dark:text-success-300',
  },
  production: {
    card: 'border-warning-200 bg-warning-50/40 dark:border-warning-500/30 dark:bg-warning-500/10',
    header: 'bg-warning-50 dark:bg-warning-500/15',
    dot: 'bg-warning-500',
    title: 'text-warning-700 dark:text-warning-300',
  },
  sales: {
    card: 'border-error-200 bg-error-50/40 dark:border-error-500/30 dark:bg-error-500/10',
    header: 'bg-error-50 dark:bg-error-500/15',
    dot: 'bg-error-500',
    title: 'text-error-700 dark:text-error-300',
  },
  finance: {
    card: 'border-brand-200 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/10',
    header: 'bg-brand-50 dark:bg-brand-500/15',
    dot: 'bg-brand-600',
    title: 'text-brand-600 dark:text-brand-300',
  },
  reports: {
    card: 'border-blue-light-200 bg-blue-light-50/40 dark:border-blue-light-500/30 dark:bg-blue-light-500/10',
    header: 'bg-blue-light-100 dark:bg-blue-light-500/15',
    dot: 'bg-blue-light-600',
    title: 'text-blue-light-600 dark:text-blue-light-300',
  },
  settings: {
    card: 'border-purple-200 bg-purple-50/40 dark:border-purple-500/30 dark:bg-purple-500/10',
    header: 'bg-purple-50 dark:bg-purple-500/15',
    dot: 'bg-purple-400',
    title: 'text-purple-600 dark:text-purple-300',
  },
}

// Deterministic fallback palette for domains outside the canonical 9.
const FALLBACK_ACCENTS: DomainAccent[] = Object.values(DOMAIN_ACCENTS)

const NEUTRAL_ACCENT: DomainAccent = {
  card: 'border-gray-200 bg-gray-50/40 dark:border-gray-700 dark:bg-white/[0.02]',
  header: 'bg-gray-50 dark:bg-white/[0.03]',
  dot: 'bg-gray-400',
  title: 'text-gray-600 dark:text-gray-300',
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function accentFor(slug: string): DomainAccent {
  if (slug === UNMAPPED_KEY) {
    return NEUTRAL_ACCENT
  }
  const direct = DOMAIN_ACCENTS[slug]
  if (direct) {
    return direct
  }
  // Stable hash → fallback token so unknown domains still get a consistent color.
  let hash = 0
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) % 2147483647
  }
  return FALLBACK_ACCENTS[hash % FALLBACK_ACCENTS.length]
}

interface ModuleGroup {
  key: string
  name: string
  permissions: Permission[]
}

interface DomainGroup {
  slug: string
  label: string
  accent: DomainAccent
  modules: ModuleGroup[]
  codes: string[]
  minSort: number
}

/** Group catalog → domain → module, preserving backend sortOrder ordering. */
const domains = computed<DomainGroup[]>(() => {
  const domainMap = new Map<string, DomainGroup>()

  props.catalog.forEach((perm, index) => {
    const domainLabel = perm.domain?.trim() || UNMAPPED_LABEL
    const slug = perm.domain ? slugify(perm.domain) : UNMAPPED_KEY
    const sort = perm.sortOrder ?? index

    let domain = domainMap.get(slug)
    if (!domain) {
      domain = {
        slug,
        label: domainLabel,
        accent: accentFor(slug),
        modules: [],
        codes: [],
        minSort: sort,
      }
      domainMap.set(slug, domain)
    }
    domain.minSort = Math.min(domain.minSort, sort)
    domain.codes.push(perm.code)

    const moduleKey = perm.moduleKey?.trim() || perm.moduleName?.trim() || UNMAPPED_KEY
    const moduleName = perm.moduleName?.trim() || perm.moduleKey?.trim() || UNMAPPED_LABEL
    let mod = domain.modules.find((m) => m.key === moduleKey)
    if (!mod) {
      mod = { key: moduleKey, name: moduleName, permissions: [] }
      domain.modules.push(mod)
    }
    mod.permissions.push(perm)
  })

  return Array.from(domainMap.values()).sort((a, b) => a.minSort - b.minSort)
})

const selectedSet = computed<Set<string>>(() => new Set(props.modelValue))

function isChecked(code: string): boolean {
  return selectedSet.value.has(code)
}

function isLocked(code: string): boolean {
  return props.isOwner && code === OWNER_LOCKED_CODE
}

function actionLabel(perm: Permission): string {
  return perm.action?.trim() || perm.name?.trim() || perm.code
}

function emitSelection(next: Set<string>): void {
  // Enforce the OWNER guardrail regardless of user interaction.
  if (props.isOwner) {
    next.add(OWNER_LOCKED_CODE)
  }
  emit('update:modelValue', Array.from(next))
}

function toggle(code: string): void {
  if (isLocked(code)) {
    return
  }
  const next = new Set(props.modelValue)
  if (next.has(code)) {
    next.delete(code)
  } else {
    next.add(code)
  }
  emitSelection(next)
}

function domainAllChecked(domain: DomainGroup): boolean {
  return domain.codes.every((code) => selectedSet.value.has(code))
}

function toggleDomain(domain: DomainGroup): void {
  const next = new Set(props.modelValue)
  if (domainAllChecked(domain)) {
    for (const code of domain.codes) {
      if (!isLocked(code)) {
        next.delete(code)
      }
    }
  } else {
    for (const code of domain.codes) {
      next.add(code)
    }
  }
  emitSelection(next)
}

const totalSelected = computed<number>(() => props.modelValue.length)
</script>

<template>
  <div>
    <div v-if="loading" class="text-muted py-8 text-center">Memuat katalog permission...</div>

    <BaseAlert v-else-if="errorMessage" size="sm">{{ errorMessage }}</BaseAlert>

    <div v-else-if="domains.length === 0" class="text-muted py-8 text-center">
      Katalog permission kosong.
    </div>

    <div v-else class="space-y-4">
      <div class="flex items-center justify-between px-0.5">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-400">Permission</p>
        <span class="text-meta"> {{ totalSelected }} dipilih </span>
      </div>

      <div
        v-for="domain in domains"
        :key="domain.slug"
        class="overflow-hidden rounded-2xl border"
        :class="domain.accent.card"
      >
        <div
          class="flex items-center justify-between gap-3 px-4 py-3"
          :class="domain.accent.header"
        >
          <div class="flex items-center gap-2.5">
            <span class="inline-block h-3 w-3 rounded-full" :class="domain.accent.dot" />
            <h5 class="text-sm font-semibold capitalize" :class="domain.accent.title">
              {{ domain.label }}
            </h5>
          </div>
          <button
            type="button"
            class="text-theme-xs font-medium text-gray-600 underline-offset-2 transition hover:underline dark:text-gray-300"
            @click="toggleDomain(domain)"
          >
            {{ domainAllChecked(domain) ? 'Kosongkan' : 'Pilih semua' }}
          </button>
        </div>

        <div class="space-y-3 px-4 py-3">
          <div v-for="mod in domain.modules" :key="mod.key">
            <p class="mb-2 text-meta font-medium uppercase">
              {{ mod.name }}
            </p>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="perm in mod.permissions"
                :key="perm.code"
                :title="isLocked(perm.code) ? 'Wajib untuk Owner' : perm.code"
                class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-theme-sm transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
                :class="[
                  isChecked(perm.code) ? 'ring-1 ring-brand-500/40' : '',
                  isLocked(perm.code) ? 'cursor-not-allowed opacity-90' : '',
                ]"
              >
                <BaseCheckbox
                  :model-value="isChecked(perm.code)"
                  :disabled="isLocked(perm.code)"
                  @update:model-value="toggle(perm.code)"
                />
                <span class="capitalize text-gray-700 dark:text-gray-300">
                  {{ actionLabel(perm) }}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
