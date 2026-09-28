/**
 * Design tokens — single source of truth for the Bakery ERP frontend theme.
 *
 * Theme: OPTION A (Slate / Indigo). Dark mode uses the `class` strategy.
 * Palette and radius/density are defined by ADR doc 45 §2.3 (which reuses the
 * framework-neutral tokens from doc 18). CSS variables in `style.css` mirror
 * these values; Tailwind maps the variables in `tailwind.config.js`.
 *
 * Do not hardcode hex colors in components — consume Tailwind tokens
 * (bg-surface, text-foreground, border-border, etc.) which resolve to these.
 */

export interface ThemePalette {
  primary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  danger: string;
  success: string;
}

/** Light palette (ADR doc 45 §2.3). */
export const LIGHT_PALETTE: ThemePalette = {
  primary: '#4f46e5',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  danger: '#e11d48',
  success: '#059669',
};

/** Dark palette (ADR doc 45 §2.3). */
export const DARK_PALETTE: ThemePalette = {
  primary: '#6366f1',
  background: '#020617',
  surface: '#0f172a',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  border: '#1e293b',
  danger: '#fb7185',
  success: '#34d399',
};

/** Radius / density tokens (ADR doc 45 §2.3, from doc 18). */
export const RADIUS = {
  card: 'rounded-2xl',
  input: 'rounded-xl',
  button: 'rounded-lg',
  badge: 'rounded-full',
} as const;

export const DENSITY = {
  tableCell: 'px-6 py-4',
} as const;

/** Local-storage key that persists the user's dark-mode preference. */
export const THEME_STORAGE_KEY = 'erp-theme';

export type ThemeMode = 'light' | 'dark';
