<script setup lang="ts">
/**
 * OwnerDashboard — the owner-level overview. The backend endpoint
 * `GET /api/v1/dashboard/owner` does NOT exist yet (ADR doc 45 §4), so this
 * renders a clean empty state and flags the required endpoint. No mock data.
 */
import { ServerCog } from 'lucide-vue-next';
import { ERPPage, ERPPageHeader, ERPContent, ERPCard, ERPEmpty, ERPStatusBadge } from '@/components/erp';
</script>

<template>
  <ERPPage>
    <ERPPageHeader
      title="Owner Dashboard"
      description="Company-wide revenue, sales, and inventory overview."
    >
      <template #actions>
        <ERPStatusBadge tone="muted" label="Awaiting backend" />
      </template>
    </ERPPageHeader>

    <ERPContent>
      <ERPCard>
        <ERPEmpty
          title="Dashboard data is not available yet"
          description="The owner dashboard metrics endpoint has not been implemented on the backend. Once GET /api/v1/dashboard/owner is available, this view will render live revenue, sales, low-stock, and expiry figures."
        >
          <template #icon>
            <ServerCog class="h-6 w-6" aria-hidden="true" />
          </template>
        </ERPEmpty>
      </ERPCard>
    </ERPContent>
  </ERPPage>
</template>
