<script setup lang="ts">
/**
 * OutletDashboard — the outlet-level overview. The backend endpoint
 * `GET /api/v1/dashboard/outlet` does NOT exist yet (ADR doc 45 §4), so this
 * renders a clean empty state and flags the required endpoint. No mock data.
 */
import { ServerCog } from 'lucide-vue-next';
import { ERPPage, ERPPageHeader, ERPContent, ERPCard, ERPEmpty, ERPStatusBadge } from '@/components/erp';
</script>

<template>
  <ERPPage>
    <ERPPageHeader
      title="Outlet Dashboard"
      description="Per-outlet sales, shift, and stock overview."
    >
      <template #actions>
        <ERPStatusBadge tone="muted" label="Awaiting backend" />
      </template>
    </ERPPageHeader>

    <ERPContent>
      <ERPCard>
        <ERPEmpty
          title="Dashboard data is not available yet"
          description="The outlet dashboard metrics endpoint has not been implemented on the backend. Once GET /api/v1/dashboard/outlet is available, this view will render live outlet sales, active shift, and stock figures."
        >
          <template #icon>
            <ServerCog class="h-6 w-6" aria-hidden="true" />
          </template>
        </ERPEmpty>
      </ERPCard>
    </ERPContent>
  </ERPPage>
</template>
