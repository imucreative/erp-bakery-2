<script setup lang="ts">
/**
 * RolesDetailDrawer — read-only role detail panel. Shows the role's metadata
 * and its permission codes grouped by domain prefix (the segment before the
 * first dot, e.g. `product.read` → `product`) for readability. Composes
 * ERPDrawer + ERPStatusBadge + ERPEmpty (foundation); no primitives or raw
 * HTML controls (doc 19 §5).
 */
import { computed } from 'vue';
import { ERPDrawer, ERPStatusBadge, ERPEmpty } from '@/components/erp';
import type { RoleDetail } from '@/types/role';

const props = withDefaults(
  defineProps<{
    open: boolean;
    /** The role being displayed (null while none selected). */
    role: RoleDetail | null;
    /** Fallback name shown in the header while the detail query loads. */
    fallbackName?: string;
    loading: boolean;
    error: string | null;
  }>(),
  { fallbackName: 'Role', role: null },
);

const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>();

interface PermissionGroup {
  domain: string;
  codes: string[];
}

const title = computed<string>(() => props.role?.name ?? props.fallbackName);

const description = computed<string | undefined>(() =>
  props.role?.code ? `Code: ${props.role.code}` : undefined,
);

/** Groups permission codes by their leading segment for a scannable layout. */
const permissionGroups = computed<PermissionGroup[]>(() => {
  const permissions = props.role?.permissions ?? [];
  const buckets = new Map<string, string[]>();

  for (const code of permissions) {
    const domain = code.includes('.') ? code.split('.')[0] : 'general';
    const existing = buckets.get(domain);
    if (existing) {
      existing.push(code);
    } else {
      buckets.set(domain, [code]);
    }
  }

  return Array.from(buckets.entries())
    .map(([domain, codes]) => ({ domain, codes: [...codes].sort() }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
});

const permissionCount = computed<number>(() => props.role?.permissions.length ?? 0);

function onUpdateOpen(value: boolean): void {
  emit('update:open', value);
}
</script>

<template>
  <ERPDrawer
    :open="open"
    :title="title"
    :description="description"
    :loading="loading"
    loading-label="Loading role detail..."
    @update:open="onUpdateOpen"
  >
    <div v-if="error" class="rounded-card border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
      {{ error }}
    </div>

    <div v-else-if="role" class="space-y-6">
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <ERPStatusBadge
            :tone="role.isActive ? 'success' : 'muted'"
            :label="role.isActive ? 'Active' : 'Inactive'"
          />
          <ERPStatusBadge
            tone="primary"
            :label="`${permissionCount} permission${permissionCount === 1 ? '' : 's'}`"
          />
        </div>
        <p v-if="role.description" class="text-sm text-muted">{{ role.description }}</p>
      </div>

      <div>
        <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Permissions
        </h3>

        <ERPEmpty
          v-if="permissionGroups.length === 0"
          title="No permissions assigned"
          description="This role does not grant any permissions."
        />

        <div v-else class="space-y-4">
          <div v-for="group in permissionGroups" :key="group.domain" class="space-y-2">
            <p class="text-xs font-medium capitalize text-foreground">{{ group.domain }}</p>
            <div class="flex flex-wrap gap-2">
              <ERPStatusBadge
                v-for="code in group.codes"
                :key="code"
                tone="neutral"
                :label="code"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </ERPDrawer>
</template>
