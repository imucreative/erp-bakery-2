# ERP Bakery — Agent Instructions (root)

> **WAJIB**: Baca instruksi ini dan knowledge-base sebelum menyentuh kode —
> berlaku untuk **fitur baru maupun bug fixing**. Jangan menulis kode sebelum
> dokumen yang diwajibkan dibaca.

## 1. Knowledge-Base Reading Gate (blocking)

Sebelum mengerjakan fitur atau bugfix, baca minimal:

1. `knowledge-base/24.ai-operating-system.md` — aturan operasi AI (prioritas tertinggi).
2. `knowledge-base/41.documentation-index.md` — peta dokumen + reading gate.
3. `knowledge-base/57.ui-kit-reka-ui.md` — **wajib untuk semua pekerjaan UI**.
4. Dokumen domain/konstitusi yang relevan dengan area yang disentuh
   (`19.frontend-constitution.md`, `20.backend-constitution.md`, domain `26`–`30`,
   `43`/`44` untuk document/master-data, dll.).
5. `project-context/AGENTS.md` — konteks proyek, stack aktif, dan status terkini.

Jika dokumen yang dibutuhkan tidak ada atau bertentangan, berhenti dan tanyakan
ke user. Setelah selesai, tulis log harian ke
`knowledge-base/project-context/YYYY-MM-DD.md`.

## 2. UI Implementation Standard

- Frontend aktif: `frontend-tailadmin/` (Vue 3 + Tailwind v4).
- **Semua base component interaktif** yang punya padanan Reka UI wajib memakai
  primitive `reka-ui` di dalam wrapper `src/components/ui/Base*.vue`.
- Feature/page memakai wrapper `Base*`; **jangan impor `reka-ui` langsung**.
  Jika wrapper belum ada, buat/ubah wrapper dulu.
- Migrasi UI dilakukan **satu komponen per task**, mempertahankan API publik
  (`v-model`, props, emits, attrs) dan diikuti type-check + lint + build +
  uji manual (keyboard, klik luar, dark mode, RTL, mobile).
- Detail status migrasi dan jebakan: `knowledge-base/57.ui-kit-reka-ui.md`.

## 3. Workflow & Quality Gates

1. Pahami pola modul paling matang di area yang sama; utamakan reuse.
2. Implementasi.
3. Verifikasi:
   - Frontend: `npm run type-check`, `npx eslint <file yang diubah>`,
     `npm run build-only`.
   - Backend: `npx tsc --noEmit -p tsconfig.json`, test Jest terkait.
4. Tulis log harian ke `knowledge-base/project-context/YYYY-MM-DD.md`
   (format naratif, append-only).

## 4. Struktur Repo

- `backend/` — NestJS + Fastify + TypeScript + PostgreSQL (raw SQL `pg`).
- `frontend-tailadmin/` — Vue 3 + Vite + TailAdmin + Tailwind v4 + Reka UI.
- `knowledge-base/` — spesifikasi, standar, status, dan log harian.
- `project-context/AGENTS.md` — konteks proyek lengkap.
- `.agents/` — rule & workflow global.
