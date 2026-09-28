<script setup lang="ts">
/**
 * CompanyProfileCard — stateless view renderer for the read-only company
 * profile. Composes ERP foundation components only (doc 19 §5) and surfaces
 * loading / error / data states (doc 21 §3). Renders a single record as a
 * definition-style card rather than a table.
 */
import { computed } from 'vue';
import { Building2 } from 'lucide-vue-next';
import { ERPCard, ERPLoading, ERPEmpty, ERPStatusBadge } from '@/components/erp';
import type { Company } from '@/types/api';

const props = defineProps<{
  company: Company | null;
  loading: boolean;
  error: string | null;
}>();

interface ProfileField {
  key: string;
  label: string;
  value: string;
  mono?: boolean;
}

const fields = computed<ProfileField[]>(() => {
  const company = props.company;
  if (!company) {
    return [];
  }
  return [
    { key: 'name', label: 'Company name', value: company.name },
    { key: 'code', label: 'Code', value: company.code, mono: true },
    { key: 'slug', label: 'Slug', value: company.slug, mono: true },
    { key: 'address', label: 'Address', value: company.address ?? '—' },
    { key: 'phone', label: 'Phone', value: company.phone ?? '—' },
  ];
});
</script>

<template>
  <ERPCard title="Company profile" description="Details for the company you belong to.">
    <template v-if="company" #actions>
      <ERPStatusBadge
        :tone="company.isActive ? 'success' : 'muted'"
        :label="company.isActive ? 'Active' : 'Inactive'"
      />
    </template>

    <ERPLoading v-if="loading" label="Loading company profile..." />

    <ERPEmpty
      v-else-if="error"
      title="Unable to load company profile"
      :description="error"
    >
      <template #icon>
        <Building2 class="h-6 w-6" aria-hidden="true" />
      </template>
    </ERPEmpty>

    <ERPEmpty
      v-else-if="!company"
      title="No company profile"
      description="There is no company associated with your account."
    >
      <template #icon>
        <Building2 class="h-6 w-6" aria-hidden="true" />
      </template>
    </ERPEmpty>

    <dl v-else class="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
      <div v-for="field in fields" :key="field.key" class="space-y-1">
        <dt class="text-xs font-medium uppercase tracking-wide text-muted">
          {{ field.label }}
        </dt>
        <dd
          class="text-sm text-foreground"
          :class="field.mono ? 'font-mono' : 'font-medium'"
        >
          {{ field.value }}
        </dd>
      </div>
    </dl>
  </ERPCard>
</template>
