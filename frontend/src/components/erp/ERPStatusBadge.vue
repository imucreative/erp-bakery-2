<script setup lang="ts">
/**
 * ERPStatusBadge — pill badge for statuses/labels. Uses the badge radius token
 * (rounded-full) from ADR doc 45 §2.3.
 */
import { computed } from 'vue';

type Tone = 'neutral' | 'primary' | 'success' | 'danger' | 'muted';

const props = withDefaults(defineProps<{ tone?: Tone; label: string }>(), {
  tone: 'neutral',
});

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-background text-foreground border border-border',
  primary: 'bg-primary/10 text-primary border border-primary/20',
  success: 'bg-success/10 text-success border border-success/20',
  danger: 'bg-danger/10 text-danger border border-danger/20',
  muted: 'bg-background text-muted border border-border',
};

const classes = computed<string>(
  () =>
    `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[props.tone]}`,
);
</script>

<template>
  <span :class="classes">{{ label }}</span>
</template>
