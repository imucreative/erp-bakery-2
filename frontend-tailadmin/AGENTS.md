# AGENTS.md — TailAdmin Vue Free

> Vue 3 administrative dashboard template · Composition API · Tailwind CSS v4 · ApexCharts · FullCalendar · Swiper · Flatpickr · Leaflet · vuedraggable · RTL Support

## Repo Map

```
src/
├── assets/
│   ├── main.css                  # ENTRY CSS saja: @import font + 'tailwindcss' + partial + @custom-variant
│   └── styles/                   # Partial CSS per kategori (diimpor berurutan dari main.css)
│       ├── theme.css             # @theme design token (font, breakpoint, warna, shadow, z-index)
│       ├── base.css              # @layer base (border compat, cursor, body)
│       ├── menu.css              # @utility menu-* untuk AppSidebar
│       ├── ui.css                # @utility snippet inti: *-title, text-muted, form-*, alert-*
│       ├── inputs.css            # aturan elemen input[type=date]/[type=time]
│       ├── vendor.css            # override library (apexcharts, jsvectormap, flatpickr)
│       └── rtl.css               # koreksi arah [dir='rtl']
├── components/
│   ├── charts/                   # ApexChart subcomponents (BarChart, LineChart)
│   ├── common/                   # Shared wrappers (ComponentCard, PageBreadcrumb, ThemeToggler)
│   ├── forms/                    # Form controls and layouts (FormElements)
│   ├── layout/                   # Admin shell (AdminLayout, AppHeader, AppSidebar, Backdrop, FullScreenLayout, header/)
│   ├── profile/                  # User profile widgets (ProfileCard, AddressCard, PersonalInfoCard, Security, DangerZone, Modal)
│   ├── tables/                   # Table variations (BasicTableOne)
│   └── ui/                       # UI primitives (Alert, Avatar, Badge, Button, Modal, etc.)
├── composables/
│   ├── useRTL.ts                 # RTL state management synced with localStorage and DOM dir attribute
│   └── useSidebar.ts             # Sidebar expand/collapse, mobile drawer, hover state
├── icons/                        # SVG icons as Vue SFCs (PascalCase, e.g. BellIcon.vue, BoxIcon.vue)
├── router/
│   └── index.ts                  # Vue Router 4 route definitions
└── views/
    ├── Dashboard/                # Ecommerce dashboard page (Ecommerce.vue)
    ├── Auth/                     # Sign in, Sign up pages
    ├── Chart/                    # Chart preview pages (BarChart, LineChart)
    ├── Forms/                    # Form elements page
    ├── Others/                   # Other feature pages (Calendar.vue, UserProfile.vue)
    ├── Pages/                    # Extra pages (BlankPage, Error404)
    ├── Tables/                   # Basic table page
    └── UiElements/               # UI showcase pages (Alerts, Avatars, Badges, Buttons, Images, Videos)
```

## Stack

- **Vue 3** with **Composition API** (`<script setup lang="ts">`) and **Vue Router 4**.
- **TypeScript ~5.7**: Strict type safety throughout components, composables, and router.
- **Tailwind CSS v4**: Configured with `@tailwindcss/postcss`; `@theme` tokens live in
  `src/assets/styles/theme.css`, imported by the `src/assets/main.css` entry. No `tailwind.config.js`.
- Path alias: `@/*` → `src/*` (configured in `vite.config.ts`).
- **Vite 6** with `@vitejs/plugin-vue` and `@vitejs/plugin-vue-jsx`.
- **State Management via Composables**:
  - `useSidebar`: Manages sidebar expand/collapse, mobile drawer visibility, and hover state.
  - `useRTL`: Manages RTL direction (`dir="rtl"` / `dir="ltr"`, `.rtl` class, synced with `localStorage`).
- **Third-Party Libraries**:
  - **vue3-apexcharts & apexcharts**: Interactive charts and data visualizations.
  - **@fullcalendar/vue3 & fullcalendar**: Event calendar with DayGrid, TimeGrid, MultiMonth, and Interaction plugins.
  - **jsvectormap & vuevectormap**: Vector maps.
  - **swiper**: Touch sliders and carousels.
  - **vue-flatpickr-component & flatpickr**: Advanced date and time pickers.
  - **vuedraggable**: Drag-and-drop interactions.
  - **dropzone**: File upload dropzone.
- **Scripts**:
  - `npm run dev` — starts the development server.
  - `npm run build` — runs type-check then builds the production bundle into `dist/`.
  - `npm run type-check` — runs `vue-tsc --build` for TypeScript validation.
  - `npm run lint` — runs ESLint with auto-fix. **Do not run it**: `--fix` rewrites line
    endings and import order across files unrelated to the task. Run plain `npx eslint <files>`
    instead.
  - `npm run format` — runs Prettier on `src/`. Prefer `npx prettier --write <file>` for the
    files you touched, and verify with `npx prettier --check .` (it also covers the root
    config files, which `npm run format` skips). `.prettierignore` keeps `dist/` and `.vite/`
    out of the check.

## Conventions

- **New Page**:
  - Add the route to `src/router/index.ts` with a descriptive `meta.title`.
  - Create the view in `src/views/<Category>/<PageName>.vue`.
  - Use `AdminLayout` wrapper for dashboard pages, `FullScreenLayout` for auth/error pages.
  - Wrap page sections in `<ComponentCard :title="'...'">` and add `<PageBreadcrumb :pageTitle="'...'" />` at the top.
- **New Reusable Component**:
  - Domain-specific: `src/components/<feature>/<ComponentName>.vue`.
  - UI primitives: `src/components/ui/<ComponentName>.vue`.
  - Shared wrappers: `src/components/common/<ComponentName>.vue`.
- **Component Files**:
  - Use **PascalCase** filenames (`MonthlySalesChart.vue`) with a `<script setup lang="ts">` block.
  - Use `defineProps<{...}>()` and `defineEmits<{...}>()` with explicit TypeScript types.
- **Icons**:
  - Icons live in `src/icons/` as Vue SFCs (e.g., `BellIcon.vue`, `BoxIcon.vue`).
  - Import directly: `import BellIcon from '@/icons/BellIcon.vue'` or `from '@/icons'`.
  - Use `fill-current` / `stroke-current` and `w-*` / `h-*` tokens inside icon components for adaptive theming.
- **Charts**:
  - Import `vue3-apexcharts` as a component; guard chart rendering with `v-if="isMounted"` (set via `onMounted`) to avoid SSR issues.
  - Declare options as `ref<ApexCharts.ApexOptions>({...})` and pass to `<VueApexCharts :options="..." :series="..." />`.
- **Calendar & Maps**:
  - `@fullcalendar/vue3` and map libraries are browser-only — always initialize inside `onMounted`. Never call them at the module level.

## Layouts & Structure

- **`AdminLayout`** (`src/components/layout/AdminLayout.vue`): Standard admin shell with `AppSidebar`, `AppHeader`, `Backdrop`, and `<RouterView>`.
- **`FullScreenLayout`** (`src/components/layout/FullScreenLayout.vue`): Full-width layout without sidebar/header — used for auth and error pages.

## Styling Rules & Dark Mode

- **Tailwind CSS v4**: `src/assets/main.css` is only the ENTRY (`@import` font + `'tailwindcss'`
  - partial + `@custom-variant dark`). `@theme` lives in `src/assets/styles/theme.css`; other
    concerns have their own partial (`base`, `menu`, `ui`, `inputs`, `vendor`, `rtl`). Put new
    styles in the partial that matches their category, and keep the `@import` order in
    `main.css` unchanged — the order is what the cascade depends on. There is **no**
    `tailwind.config.js`.
- **Core snippet classes** (`src/assets/styles/ui.css`, declared with `@utility`, 31 utilities): use
  `page-title` / `card-title` / `modal-title` for headings, `text-muted` for secondary text
  (`text-muted-xs` for dimmer placeholders like an empty-cell `—`, `text-meta` for small metadata
  sitting under a primary text — the SKU sub-line under a product name in a table row, the uppercase
  key label of a label/value pair, a modal header subtitle; it is the xs sibling of `text-muted`,
  same `gray-500` → `gray-400` dark pair, and NOT `text-muted-xs`, whose swapped grays would read
  dimmer — `text-strong` for the primary text of a list row such as an attachment name, comment
  author, or the product name on a list table, `text-value` for the read-only
  value of a summary list or a detail modal — same as `text-strong` without `font-medium`, `text-body` for the
  paragraph tone one step softer (`whitespace-pre-wrap` comment body, the "oleh <nama>" line in a
  timeline, the notes `<dd>` of a summary card),
  `form-label` / `form-hint` / `form-error` for field text, `form-readonly` for a read-only
  value shown in place of an input (SKU, email, code, parent group name),
  `alert-error` / `alert-success` /
  `alert-warning` / `alert-info` for banners, `panel-muted` for empty/loading panels
  (add `border-dashed` at the call site when needed), `panel-loading` for a page-level
  "Memuat data…" card (full-width `rounded-2xl` white card, not the dimmed in-card `panel-muted`),
  `panel-card` for nested item cards
  (attachment/comment rows), `form-divider` for the input form that sits below such a panel
  (`space-y-3` + top border — note `@apply space-y-*` emits its margin as a separate
  `:where(.form-divider > :not(:last-child))` rule, exactly like `timeline-rail`),
  `icon-tile` for the square icon in front of a list row (attachment
  icon, avatar — 40px tile, override `h-*`/`w-*` at the call site for another size),
  `toolbar-row` for a filter/actions bar (stacks under 640px; add margin at the call site),
  `stack-row` for the same bar when it has no left/right split — a run of fields, or a field plus
  the button that may keep flowing (`sm:justify-between` is what separates the two); add
  `sm:flex-wrap` at the call site when the bar should wrap instead of staying on one row
  (`BatchFilterBar`),
  `button-row` for a run of buttons pushed to the end (modal footer, form Save/Cancel; it is
  deliberately only `flex justify-end gap-3` — no `items-center`/`flex-wrap`, so the 9
  `*ActionBar.vue` rows that use `flex flex-wrap items-center justify-end gap-3` keep their own
  layout; a single-child footer still uses it, e.g. `mt-6 button-row` around one `Tutup` button;
  add `pt-*`/`mt-*` at the call site),
  `field-grid` for a two-column form/summary grid (stacks under 640px; `gap-*` and `sm:grid-cols-*`
  are plain core utilities, so overriding them at the call site works and keeps the snippet's
  `display`/`grid-cols-1` base — `PurchaseOrderSummary` uses `field-grid gap-2 sm:grid-cols-3` for
  the totals box),
  `confirm-bar` for an inline destructive confirmation (pair it with `mt-3`; do not use
  `alert-error` here — that snippet carries text color and no layout because it pairs with
  `BaseAlert`),
  `timeline-rail` + `timeline-dot` for status timelines (rail on the
  `<ol>`, dot on the first `<span>` inside each `relative` `<li>`; always use them as a pair),
  and `no-scrollbar` / `custom-scrollbar` for
  scroll containers. Prefer these over retyping the long class chain. Custom utilities are
  emitted BEFORE core utilities, so a call-site utility always wins
  (e.g. `class="modal-title mt-4"`) without `!important`. Ordering is per property category,
  though — and within a category **shorthand loses to longhand**: in the built CSS
  (`dist/assets/index-B1SI766m.css`) `.p-4` (39787)
  is emitted before `.px-4` (40196) and `.py-3` (40645), so to override a snippet's or component's
  padding use `px-*` / `py-*`, never `p-*` (`p-*` on top of `BaseAlert size="md"` silently kept
  the component's `px-4 py-3`). Plain layout utilities like `.flex`/`.h-11` are emitted earlier,
  which is still safe
  because snippets such as `form-readonly` set no `display`/`height` (`PurchaseOrderHeaderFields`
  overrides it with `form-readonly flex h-11 w-full items-center dark:bg-white/[0.02]`).
  Snippets deliberately exclude
  margin (headings) and padding (alerts) so callers can set density.
- **Shared components win**: banner = `BaseAlert`, modal = `BaseModal` (backdrop, Esc-close,
  `role="dialog"`, `size` and `scrollable` are already handled), table shell/error = `BaseTable`,
  form field text = `BaseFormField`. Do not re-create `fixed inset-0` modal wrappers or
  hand-written `alert-*` divs in feature components. The same applies to `class` on `BaseButton`:
  a `variant` already ships its own layout/color/ring/hover classes, so pass only what differs
  (e.g. `class="h-10 w-10"` on an `icon-only` back button) instead of re-typing the variant's
  chain — later core utilities win over `@utility` rules, so repeating it can silently lose to
  the component's own classes.
- **Theme Tokens**: Always use predefined theme tokens:
  - **Colors**: `brand` (`25`–`950`), `gray` (`25`–`950`), `blue-light` (`25`–`950`), `orange` (`25`–`950`), `success`, `error`, `warning`.
  - **Typography**: `font-outfit`, `text-theme-xs/sm/xl`, `text-title-sm/md/lg/xl/2xl`.
    `theme.css` opens `@theme` with `--font-*: initial` and defines only `--font-outfit`, so
    **`font-mono` is never emitted** — writing it on a call site has no effect (5 dead sites remain,
    see dok 48 §2.8); do not add new ones until `--font-mono` is defined or the class is removed.
  - **Shadows**: `shadow-theme-xs/sm/md/lg/xl`.
  - **Breakpoints**: `2xsm` (375px), `xsm` (425px), `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px).
- **Dark Mode**:
  - Dark mode is class-driven (`@custom-variant dark (&:is(.dark *))` in `main.css`, `.dark` toggled on `<html>`).
  - Every styled element must include corresponding `dark:` variants (e.g. `bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 border-gray-200 dark:border-gray-800`).

## RTL & Logical Spacing Rules

- **CSS Logical Properties**:
  - Never use physical directional utilities when logical equivalents exist:
    - **Margins**: Use `ms-*` / `me-*` instead of `ml-*` / `mr-*`.
    - **Padding**: Use `ps-*` / `pe-*` instead of `pl-*` / `pr-*`.
    - **Positioning / Insets**: Use `start-*` / `end-*` instead of `left-*` / `right-*`.
    - **Borders**: Use `border-s-*` / `border-e-*` instead of `border-l-*` / `border-r-*`.
    - **Border Radius**: Use `rounded-s-*` / `rounded-e-*` instead of `rounded-l-*` / `rounded-r-*`.
    - **Text Alignment**: Use `text-start` / `text-end` instead of `text-left` / `text-right`.
  - Use `ltr:*` and `rtl:*` modifiers when explicit directional overrides are required (e.g. `ltr:border-r rtl:border-l`, `ltr:-left-px rtl:-right-px`).
- **Directional Glyphs & Transforms**:
  - Flip directional arrows, breadcrumb chevrons, and navigation icons in RTL using `rtl:rotate-180` or `rtl:-scale-x-100`.
  - Off-canvas drawers must mirror their translation (e.g. `-translate-x-full max-xl:rtl:translate-x-full`).

## Don'ts

- Don't install new NPM packages without asking the user.
- Don't create `tailwind.config.js` — Tailwind v4 configuration belongs in `src/assets/styles/*.css`
  (tokens in `theme.css`), imported through the `src/assets/main.css` entry.
- Don't use Options API or `defineComponent` boilerplate — always use `<script setup lang="ts">`.
- Don't hardcode physical directional utilities (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `border-l-*`, `border-r-*`, `rounded-l-*`, `rounded-r-*`, `text-left`, `text-right`) without providing RTL support (`ltr:` / `rtl:` or CSS logical equivalents).
- Don't hardcode hex colors in `class=""` attributes — use `@theme` tokens.
- Don't write inline `style="..."` attributes when Tailwind theme tokens and utility classes are available.
- Don't initialize map, calendar, or other browser-only libraries outside `onMounted`.

## Bakery ERP — Mandatory UI Standards (knowledge-base doc 48 §2)

These project standards are MANDATORY for every Bakery ERP module built in this app.
Full detail lives in `knowledge-base/48.tailadmin-frontend-backlog.md` §2 — read it before
building a module. Summary:

- **Row action buttons**: icon-only (`lucide-vue-next`), `h-9 w-9`, with `aria-label` + `title`.
- **Every button MUST have a relevant icon**; text is optional. Icon-only for row actions and
  the back button; icon + text for primary/descriptive buttons (Save/Cancel/Add/Submit).
- **Native `<select>`**: `appearance-none` + a `ChevronDownIcon` overlay (relative container,
  absolute `end-3`, `pointer-events-none`, select `pe-10`). Never a bare select.
- **Boolean inputs**: use `components/ui/ToggleSwitch.vue`, never `<input type="checkbox">`
  (exception: an explicit multi-select permission matrix, when the user asks for checkboxes).
- **Modals**: transparent backdrop (`bg-gray-900/20 backdrop-blur-[2px]`, dark `bg-black/30`),
  `rounded-3xl` panel.
- **Document pages (Detail & Form)**: page header is `flex justify-between` — START = icon-only
  Back button (`ChevronLeft`, `rtl:rotate-180`) beside the page title; END = the lifecycle
  action bar. Split each UI section into its own stateless component (Summary, ItemsTable,
  ActionBar, Timeline, Comments, Attachments for detail; HeaderFields, ItemsEditor for form)
  under `components/<area>/<x>/` with a barrel `index.ts`; the View owns state + handlers only.
- Dark mode + RTL logical properties (ps/pe/ms/me/start/end) + Tailwind theme tokens (no hex).
