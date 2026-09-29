<script setup lang="ts">
/**
 * ERPNotification — global toast host. Renders the notification store queue in
 * a fixed stack. Mount once at the app root.
 */
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { useNotificationStore, type NotificationVariant } from '@/stores/notification';

const store = useNotificationStore();
const { items } = storeToRefs(store);

const variantStyles: Record<NotificationVariant, string> = {
  success: 'border-success/40 bg-surface text-foreground',
  error: 'border-danger/40 bg-surface text-foreground',
  info: 'border-border bg-surface text-foreground',
};

const iconColor: Record<NotificationVariant, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-primary',
};
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end">
    <TransitionGroup name="toast">
      <div
        v-for="item in items"
        :key="item.id"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border px-4 py-3 shadow-lg"
        :class="variantStyles[item.variant]"
        role="status"
      >
        <span class="mt-0.5" :class="iconColor[item.variant]">
          <CheckCircle2 v-if="item.variant === 'success'" class="h-5 w-5" aria-hidden="true" />
          <AlertCircle v-else-if="item.variant === 'error'" class="h-5 w-5" aria-hidden="true" />
          <Info v-else class="h-5 w-5" aria-hidden="true" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium">{{ item.title }}</p>
          <p v-if="item.description" class="mt-0.5 text-sm text-muted">{{ item.description }}</p>
        </div>
        <button
          type="button"
          class="text-muted transition hover:text-foreground"
          aria-label="Dismiss notification"
          @click="store.dismiss(item.id)"
        >
          <X class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
