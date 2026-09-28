/**
 * Toast/notification store. Feature code triggers success/error feedback here
 * (doc 21 §3 mutation feedback); the ERPNotification host renders the queue.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

export type NotificationVariant = 'success' | 'error' | 'info';

export interface Notification {
  id: number;
  variant: NotificationVariant;
  title: string;
  description?: string;
}

const DEFAULT_TIMEOUT_MS = 4500;

export const useNotificationStore = defineStore('notification', () => {
  const items = ref<Notification[]>([]);
  let counter = 0;

  function dismiss(id: number): void {
    items.value = items.value.filter((item) => item.id !== id);
  }

  function push(
    variant: NotificationVariant,
    title: string,
    description?: string,
  ): number {
    const id = ++counter;
    items.value = [...items.value, { id, variant, title, description }];
    window.setTimeout(() => dismiss(id), DEFAULT_TIMEOUT_MS);
    return id;
  }

  const notifySuccess = (title: string, description?: string): number =>
    push('success', title, description);
  const notifyError = (title: string, description?: string): number =>
    push('error', title, description);
  const notifyInfo = (title: string, description?: string): number =>
    push('info', title, description);

  return { items, push, dismiss, notifySuccess, notifyError, notifyInfo };
});
