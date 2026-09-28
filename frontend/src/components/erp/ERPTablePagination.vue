<script setup lang="ts">
/**
 * ERPTablePagination — foundation pagination control for paginated list views.
 * Shows the current range ("1–10 of 42"), a page-size selector, and
 * previous/next controls. Composes ERPButton + ERPSelect (foundation); no raw
 * controls (doc 19 §5).
 *
 * The parent owns `page` / `limit` state and reacts to `update:page` /
 * `update:limit`. `total` drives the range label and disables next at the end.
 */
import { computed } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import ERPButton from './ERPButton.vue';
import ERPSelect, { type ERPSelectOption } from './ERPSelect.vue';

const props = withDefaults(
  defineProps<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    pageSizeOptions?: number[];
    disabled?: boolean;
  }>(),
  { pageSizeOptions: () => [10, 20, 50], disabled: false },
);

const emit = defineEmits<{
  (event: 'update:page', value: number): void;
  (event: 'update:limit', value: number): void;
}>();

const rangeStart = computed<number>(() =>
  props.total === 0 ? 0 : (props.page - 1) * props.limit + 1,
);

const rangeEnd = computed<number>(() =>
  Math.min(props.page * props.limit, props.total),
);

const canPrev = computed<boolean>(() => !props.disabled && props.page > 1);
const canNext = computed<boolean>(
  () => !props.disabled && props.page < props.totalPages,
);

const limitOptions = computed<ERPSelectOption[]>(() =>
  props.pageSizeOptions.map((size) => ({
    value: String(size),
    label: `${size} / page`,
  })),
);

const limitModel = computed<string>(() => String(props.limit));

function onPrev(): void {
  if (canPrev.value) {
    emit('update:page', props.page - 1);
  }
}

function onNext(): void {
  if (canNext.value) {
    emit('update:page', props.page + 1);
  }
}

function onLimitChange(value: string): void {
  const next = Number(value);
  if (Number.isFinite(next) && next > 0) {
    emit('update:limit', next);
  }
}
</script>

<template>
  <div
    class="flex flex-col gap-3 border-t border-border px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="flex items-center gap-3">
      <p class="text-sm text-muted">
        <span class="font-medium text-foreground">{{ rangeStart }}–{{ rangeEnd }}</span>
        of {{ total }}
      </p>
      <div class="w-32">
        <ERPSelect
          :model-value="limitModel"
          :options="limitOptions"
          :disabled="disabled"
          @update:model-value="onLimitChange"
        />
      </div>
    </div>

    <div class="flex items-center gap-2">
      <span class="text-sm text-muted">Page {{ page }} of {{ Math.max(totalPages, 1) }}</span>
      <ERPButton
        variant="secondary"
        size="sm"
        icon-only
        aria-label="Previous page"
        :disabled="!canPrev"
        @click="onPrev"
      >
        <ChevronLeft class="h-4 w-4" aria-hidden="true" />
      </ERPButton>
      <ERPButton
        variant="secondary"
        size="sm"
        icon-only
        aria-label="Next page"
        :disabled="!canNext"
        @click="onNext"
      >
        <ChevronRight class="h-4 w-4" aria-hidden="true" />
      </ERPButton>
    </div>
  </div>
</template>
