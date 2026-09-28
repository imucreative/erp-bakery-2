<script setup lang="ts">
/**
 * CompanyProfileView — read-only company profile page. Acts as controller/state
 * manager (doc 19 §2, §6): fetches the current user's company via the company
 * query and maps values into the feature card. No raw HTML controls or
 * primitives are composed here.
 *
 * The backend exposes no company mutation endpoint, so this page has no
 * create/edit/delete affordances by design (read-only).
 */
import { computed } from 'vue';
import { ApiClientError } from '@/lib/api';
import { ERPPage, ERPPageHeader, ERPContent, ERPStatusBadge } from '@/components/erp';
import { CompanyProfileCard } from '@/features/company/components';
import { useCompanyQuery } from '@/features/company/useCompany';
import type { Company } from '@/types/api';

const companyQuery = useCompanyQuery();

const company = computed<Company | null>(() => companyQuery.data.value ?? null);
const loading = computed<boolean>(() => companyQuery.isLoading.value);
const error = computed<string | null>(() => errorMessage(companyQuery.error.value));

function errorMessage(err: unknown): string | null {
  if (!err) {
    return null;
  }
  if (err instanceof ApiClientError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}
</script>

<template>
  <ERPPage>
    <ERPPageHeader
      title="Company"
      description="View the profile of the company your account belongs to."
    >
      <template #actions>
        <ERPStatusBadge tone="muted" label="Read-only" />
      </template>
    </ERPPageHeader>

    <ERPContent>
      <CompanyProfileCard :company="company" :loading="loading" :error="error" />
    </ERPContent>
  </ERPPage>
</template>
