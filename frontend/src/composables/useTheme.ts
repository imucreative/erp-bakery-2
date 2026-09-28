/**
 * Dark-mode controller (class strategy, ADR doc 45 §2.3). Toggles the `dark`
 * class on <html> and persists the preference. Falls back to the OS preference
 * on first load.
 */

import { ref } from 'vue';
import { THEME_STORAGE_KEY, type ThemeMode } from '@/lib/design-tokens';

const mode = ref<ThemeMode>('light');

function apply(next: ThemeMode): void {
  mode.value = next;
  const root = document.documentElement;
  root.classList.toggle('dark', next === 'dark');
  localStorage.setItem(THEME_STORAGE_KEY, next);
}

function resolveInitial(): ThemeMode {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function useTheme() {
  function initTheme(): void {
    apply(resolveInitial());
  }

  function toggleTheme(): void {
    apply(mode.value === 'dark' ? 'light' : 'dark');
  }

  function setTheme(next: ThemeMode): void {
    apply(next);
  }

  return { mode, initTheme, toggleTheme, setTheme };
}
