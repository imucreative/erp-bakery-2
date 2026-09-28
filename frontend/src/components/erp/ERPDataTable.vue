<script setup lang="ts" generic="T extends object">
/**
 * ERPDataTable — foundation table for read/list views (doc 19 §5). Renders a
 * responsive, horizontally-scrollable table with baseline styling, and owns the
 * standard data states (doc 21 §3):
 *  - `loading`  → ERPLoading spinner
 *  - `error`    → inline error banner (message surfaced from the caller)
 *  - empty rows → ERPEmpty placeholder
 *
 * Columns are declared via the `columns` prop. Cell content can be overridden
 * per column through a named slot `cell-<column.key>` receiving `{ row }`; the
 * default renders the stringified value at `column.key`. Feature tables compose
 * this component and never render raw <table> markup themselves.
 */
import ERPLoading from './ERPLoading.vue';
import ERPEmpty from './ERPEmpty.vue';

export interface ERPTableColumn {
  /** Property key on the row, also used to target the `cell-<key>` slot. */
  key: string;
  /** Column header label. */
  label: string;
  /** Extra classes applied to header + cells (e.g. text alignment/width). */
  cellClass?: string;
}

const props = withDefaults(
  defineProps<{
    columns: ERPTableColumn[];
    rows: T[];
    rowKey: keyof T;
    loading?: boolean;
    loadingLabel?: string;
    error?: string | null;
    emptyTitle?: string;
    emptyDescription?: string;
    /** When true, rows show a pointer cursor and emit `row-click`. */
    rowClickable?: boolean;
  }>(),
  {
    loading: false,
    loadingLabel: 'Loading...',
    error: null,
    emptyTitle: 'No records found',
    emptyDescription: undefined,
    rowClickable: false,
  },
);

const emit = defineEmits<{ (event: 'row-click', row: T): void }>();

function cellValue(row: T, key: string): string {
  const value = (row as Record<string, unknown>)[key];
  if (value === null || value === undefined) {
    return '—';
  }
  return String(value);
}

function onRowClick(row: T): void {
  if (props.rowClickable) {
    emit('row-click', row);
  }
}
</script>

<template>
  <div class="rounded-card border border-border bg-surface">
    <!-- Error banner -->
    <div
      v-if="error"
      class="flex items-start gap-2 border-b border-danger/20 bg-danger/10 px-6 py-4 text-sm text-danger"
      role="alert"
    >
      <span>{{ error }}</span>
    </div>

    <ERPLoading v-if="loading" :label="loadingLabel" />

    <ERPEmpty
      v-else-if="rows.length === 0 && !error"
      :title="emptyTitle"
      :description="emptyDescription"
      class="border-0 bg-transparent"
    />

    <div v-else-if="rows.length > 0" class="overflow-x-auto">
      <table class="w-full border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-border">
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="whitespace-nowrap px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
              :class="column.cellClass"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="String(row[rowKey])"
            class="border-b border-border last:border-b-0 transition"
            :class="
              rowClickable
                ? 'cursor-pointer hover:bg-background focus-within:bg-background'
                : ''
            "
            @click="onRowClick(row)"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="px-6 py-4 align-middle text-foreground"
              :class="column.cellClass"
            >
              <slot :name="`cell-${column.key}`" :row="row">
                {{ cellValue(row, column.key) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
