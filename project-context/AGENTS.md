# BAKERY ERP — AI AGENT PROJECT CONTEXT

> **Last Updated**: 2026-11-12 | **Project**: ERP Bakery
> Read this FIRST before doing any work.

> **WAJIB — KNOWLEDGE-BASE READING GATE**: Sebelum mengerjakan **fitur baru maupun
> bug fixing**, baca dulu `knowledge-base/24.ai-operating-system.md`,
> `knowledge-base/41.documentation-index.md`, dan — untuk semua pekerjaan UI —
> `knowledge-base/57.ui-kit-reka-ui.md`, ditambah dokumen domain/konstitusi yang
> relevan. Jangan menulis kode sebelum dokumen tersebut dibaca.

---

## 1. PROJECT IDENTITY

| Attribute | Value |
|-----------|-------|
| Name | Bakery ERP System (ERP Bakery) |
| Industry | Bakery Retail & Manufacturing |
| Type | ERP Lite: POS + Inventory + Production + Stock Transfer + Procurement; Finance/Replenishment masih backlog |
| Architecture | Modular Monolith: NestJS Fastify + Clean Architecture; frontend Vue 3 TailAdmin |
| Methodology | Agile Scrum (rencana awal sprint 1 minggu, MVP 8 minggu) |

**Business Problem**: Excel + POS pihak ketiga menyebabkan stok tidak real-time, produksi tidak tercatat dan rekonsiliasi manual.

**Solution**: POS stock-first, Inventory FEFO/Batch, produksi instant-complete, transfer antar outlet, procurement, dashboard dan laporan. Model outlet-native, tanpa layer warehouse terpisah.

**Stakeholders**: OWNER (akses operasional eksplisit, bukan seluruh administrasi sistem), SUPERVISOR_OUTLET, ADMIN_GUDANG, PRODUKSI, KASIR; SUPER_ADMIN mengelola platform, bukan operator tenant.

---

## 2. TECHNOLOGY STACK

**Backend aktif**: NestJS, Fastify, TypeScript, PostgreSQL melalui raw SQL `pg` Pool,
`node-pg-migrate`, JWT, Swagger, Jest. Bukan Prisma/ORM.
**Frontend aktif**: Vue 3 Composition API, TypeScript, Vite, Vue Router, Pinia/composables,
TailAdmin + Tailwind CSS v4, dan **Reka UI** untuk primitive UI interaktif, di
`frontend-tailadmin/`; bukan Next.js. Standar UI Kit ada di
`knowledge-base/57.ui-kit-reka-ui.md`.

**Catatan kompatibilitas dokumen:** rincian stack legacy Prisma/Next.js/React di
bagian 5–8 dan referensi historis telah digantikan fakta stack/direktori aktif ini.
Bagian 5–8 dipertahankan verbatim; catatan ini tidak mengubah workflow, permissions,
kewajiban pembacaan, quality gate atau Definition of Done.

---

## 3. PROJECT DIRECTORY MAP

```text
erp-bakery-2/
├── backend/
│   ├── migrations/            ← node-pg-migrate, tersedia sampai 074
│   └── src/
│       ├── app.module.ts      ← registrasi modul aktif
│       ├── Domains/           ← entitas dan kontrak repository
│       ├── Applications/      ← use_case, kontrak security
│       ├── Infrastructures/   ← repository Postgres, security, mail, DI
│       ├── Interfaces/http/   ← api controllers, DTO, guards, decorators
│       └── Commons/           ← helper dan exception bersama
├── frontend-tailadmin/        ← aplikasi frontend aktif
│   └── src/
│       ├── views/             ← Auth, MasterData, Procurement, Inventory,
│       │                         Production, Sales, Dashboard, Reports, Platform
│       ├── components/        ← komponen fitur, profile dan foundation ui/
│       ├── composables/
│       ├── services/
│       ├── stores/
│       ├── router/
│       └── assets/styles/     ← partial CSS Tailwind v4
├── knowledge-base/            ← spesifikasi, status dan log harian project-context/
├── project-context/           ← konteks ini
└── .agents/                   ← rules dan workflows
```

Tidak ada layer aktif `src/modules`, warehouse, Vendor Invoice atau Accounts Payable.
Label Finance pada sidebar masih placeholder `/error-404`, bukan implementasi modul.

---

## 4. CURRENT STATUS SUMMARY

Acuan audit statis: `feature/administrator`, HEAD `2f58401`, 2026-11-06.
"Tersedia" berarti kode ada, **bukan** QA/UAT lulus atau siap produksi.

| Area | Status kode | Batas / catatan |
|------|-------------|----------------|
| Foundation | Tersedia | NestJS/Fastify/raw pg + Vue TailAdmin; migrasi sampai 074 tersedia, status DB tidak diperiksa |
| Auth/Profile & Master Data | BE/FE tersedia | Profile, change password, forgot/reset password, 2FA; Outlet, UOM, Supplier, Payment Term, Product Group/Category/Product/Topping |
| Inventory | BE/FE tersedia | Stock On Hand, Ledger, Batch, Adjustment, Opname; jangan klaim layar Reconciliation khusus sudah ada |
| Recipe/Production | BE/FE tersedia | Recipe/BOM dan instant-complete Production Order; gap UOM/scaling perlu investigasi |
| Distribution | Sebagian | Stock Transfer BE/FE ada; Replenishment dan Delivery Order terpisah belum ada |
| Procurement | BE/FE tersedia | PR, PO, GR, Purchase Return beserta timeline/comments/attachments |
| Finance | Belum ada | Vendor Invoice, AP, Payment, Expense, Cashflow |
| POS | BE/FE tersedia | Shift, checkout/pay/void, receipt dan full-order refund; stock-first |
| Dashboard & Reports | BE/FE + CSV tersedia | Owner/Outlet, Sales/Inventory/Production; PDF/Excel belum ada, pendingRequests masih 0 |
| Platform Console v1/v2 | BE/FE tersedia | Company, user CRUD lintas company, role assignment, audit mutasi user dan kewajiban 2FA; role/permission management UI dan audit viewer belum ada |
| Testing & UAT | Belum tuntas | Log 6 November: type-check/build lulus pada sesi sebelumnya, full Jest gagal pada assertion OWNER lama; tidak diuji ulang dalam audit dokumentasi ini |

---

## 5. MANDATORY READING (Before Any Work — Feature & Bug Fixing)

> Berlaku untuk **fitur baru dan bug fixing**. Jangan menulis kode sebelum membaca.

### Highest Priority
1. `knowledge-base/24.ai-operating-system.md` — AI behavior rules (**HIGHEST**)
2. `knowledge-base/41.documentation-index.md` — master index + reading gate
3. `knowledge-base/57.ui-kit-reka-ui.md` — **wajib untuk semua pekerjaan UI**
4. `.agents/rules/default-rules-bakery-erp.md` — Global AI rules
5. `.agents/workflows/default-workflow-bakery-erp.md` — Development workflow

### Module-Specific (Read Before Implementing)
6. `knowledge-base/19.frontend-constitution.md` — Frontend standards
7. `knowledge-base/20.backend-constitution.md` — Backend standards
8. `knowledge-base/36.application-blueprint.md` — Folder structure & naming
9. `knowledge-base/16.role-permission-matrix.md` — RBAC standards
10. Domain docs: `26.procurement-domain.md`, `27.inventory-domain.md`, `28.production-domain.md`, `29.sales-domain.md`, `30.finance-domain.md`

### Reference
11. `knowledge-base/2.BRD.md` — Business requirements
12. `knowledge-base/3.PRD.md` — Product requirements
13. `knowledge-base/21.definition-of-done.md` — DoD
14. `knowledge-base/22.repository-quality-gates.md` — Quality gates
15. `knowledge-base/31.erp-module-blueprint.md` — Module structure
16. `knowledge-base/32.module-development-workflow.md` — 10-step lifecycle
17. `knowledge-base/35.global-erp-standards.md` — Global standards
18. `knowledge-base/43.document-authorization-standard.md` — Document authorization
19. `knowledge-base/44.master-data-dependency-standard.md` — Master data protection
20. `knowledge-base/48.tailadmin-frontend-backlog.md` — TailAdmin UI standards

---

## 6. DEVELOPMENT WORKFLOW (Mandatory)

```
1. Read AI Operating System (24.ai-operating-system.md)
2. Read knowledge-base index (41) + UI kit doc (57, untuk UI) + dokumen area terkait
   (berlaku juga untuk bug fixing — jangan menulis kode sebelum membaca)
3. Generate Implementation Plan (short, structured)
   - Objective
   - Proposed Changes (files to create/modify/delete)
   - Repository Migration
   - Verification Plan
4. STOP — Wait for user approval
5. (After approval) Implement Code
6. Run Quality Gates (npx tsc --noEmit di backend & frontend)
7. Self Review
8. Done
```

---

## 7. CODE REQUIREMENTS

### Backend (from rules)
Every feature must have:
- DTO dengan validation (class-validator)
- Repository (Prisma abstraction)
- Service (business logic + transaction)
- Controller (NestJS)
- Swagger documentation
- Unit Test (Jest)
- Audit Log (if applicable)
- Prisma Transaction (when data consistency required)

**NEVER**: placeholder code, pseudo code, TODO comments

### Frontend (from constitution + blueprint)
- Feature structure: use the active `frontend-tailadmin/` layout (views/, components/<feature>/, composables/, services/, stores/).
- Reuse foundation components from `frontend-tailadmin/src/components/ui/` (`Base*`).
- **UI interaktif memakai Reka UI** melalui wrapper `Base*.vue`; jangan impor `reka-ui` langsung di feature/page. Detail: `knowledge-base/57.ui-kit-reka-ui.md`.
- NO direct Shadcn imports in page files
- Use absolute aliases: `@/components/ui/...` for the active app
- TanStack Query for server state, Zustand for client state

---

## 8. DEFINITION OF DONE

- [ ] Business requirement implemented
- [ ] Code reviewed
- [ ] Unit test passed
- [ ] API documented (Swagger)
- [ ] QA passed
- [ ] UAT approved (eventually)
- [ ] Deployed to staging (eventually)

---

## 9. QA TESTING SCOPE (Priority Order)

Status QA terkini bukan all-green: log 2026-11-06 mencatat full Jest gagal pada
assertion OWNER lama di `RegisterCompanyUseCase.test.ts`. Audit dokumentasi tidak
menjalankan ulang tes; urutan berikut merupakan pekerjaan lanjutan, bukan hasil lulus.

1. Core/Auth/Profile/Platform: assignment company-role, guard tenant/platform, 2FA,
   change/reset password, audit user serta pencabutan sesi.
2. Master Data: Outlet, Product Group, Category, UOM, Supplier, Payment Term, Product,
   Topping; validasi, dependensi dan audit.
3. Inventory/Procurement: Stock On Hand, Ledger, Batch, Adjustment, Opname, Transfer,
   PR/PO/GR/Return; akurasi saldo, expiry, transaksi dan rekonsiliasi data.
4. Recipe/Production/POS: kompatibilitas/scaling UOM, konsumsi FEFO, hasil produksi,
   checkout/pay/void/refund, kas shift dan kelengkapan pilihan shift Sales Order.
5. Dashboard/Reports: summary `scheduled_qty` vs detail `actual_qty`/yield, low-stock
   ACTIVE termasuk expired vs sellable Stock On Hand, CSV dan batas nilai harga jual.
6. Integrasi/E2E/UAT dan tenant isolation menyeluruh masih perlu verifikasi.
   Finance belum ada sehingga bukan modul existing yang tinggal diuji.

---

## 10. ACTIVE FOCUS

### Dev Agent (Frontend — `frontend-tailadmin/` target)
Fokus lanjutan: gap fitur yang nyata, bukan membangun ulang UI yang sudah ada.
- Platform role/permission management UI dan audit viewer.
- PDF/Excel export belum delivered; Replenishment/Finance masih backlog.
- Profile logout-all/self-delete belum punya handler; upload avatar/logo, QR dan
  passkey masih rencana. Change password sudah tersedia.
- Klarifikasi versioning Recipe (ISSUE-05); increment saat activate sudah ada.
- Rujukan implementasi UI aktif: doc 48 dan `frontend-tailadmin/AGENTS.md`.

### QA Agent (Testing — `backend/` focus)
Fokus berikutnya: assertion OWNER yang usang dan investigasi doc 53, lalu pengujian
runtime sesuai lingkup yang disetujui. Hasil build/tes lama tidak membuktikan seluruh
alur operasional siap produksi. Tidak ada pengujian ulang pada audit dokumentasi ini.

---

## 11. ENVIRONMENTAL NOTES

- Workspace audit: `D:/antigravity/erp-bakery-2`, branch `feature/administrator`, HEAD `2f58401`.
- Backend: `backend/` (NestJS + Fastify + raw pg/PostgreSQL); migrasi `node-pg-migrate`
  tersedia sampai 074. Audit tidak memeriksa apakah migrasi telah diterapkan pada DB.
- Frontend aktif: `frontend-tailadmin/` (Vue 3 + Vite + TailAdmin/Tailwind v4).
- `ConsoleMailSender` hanya menulis pesan ke log; pengiriman email produksi belum tersedia.
- Tes, build, migrasi, seed dan server tidak dijalankan untuk sinkronisasi ini.

---

## 12. KEY CONTACTS

| Role | Name | Notes |
|------|------|-------|
| Product Owner | Dian (Bang) | Decision maker |
| AI Project Manager | Hermes Agent | Coordination & knowledge-base management |
| Dev Agent | Spawned sub-agent | Frontend development (`frontend-tailadmin/`) |
| QA Agent | Spawned sub-agent | Testing existing modules |

---

## 13. KNOWLEDGE BASE GAP (Wajib Dipahami)

| Area | Fakta audit 2026-11-06 | Gap yang tetap terbuka |
|------|------------------------|-----------------------|
| Dokumen legacy | Stack aktif raw pg/Vue TailAdmin; doc 5 Prisma dan checklist lama merupakan riwayat | Jangan menafsirkan proposal/checklist historis sebagai implementasi atau QA terkini |
| Master/Profile/Procurement/Inventory | BE/FE sudah tersedia; doc 13/14 disinkronkan | Verifikasi runtime lintas alur; Reconciliation UI khusus belum tersedia |
| Recipe/Production/POS | Kode dan UI tersedia | UOM/scaling, metrik produksi, pilihan shift; klarifikasi versioning ISSUE-05 (increment sudah ada) |
| Dashboard/Reports | BE/FE + CSV tersedia | PDF/Excel, pendingRequests 0, low-stock vs expired; nilai stok berbasis selling_price bukan akuntansi |
| Platform/Auth | v1/v2, audit mutasi user, 2FA dan change password tersedia | Role/permission management UI, audit viewer, logout-all/self-delete, upload/QR/passkey, email produksi |
| Replenishment/Finance | Belum diimplementasikan | Permission/sidebar/spec bukan kode operasional |
| QA/UAT | Full Jest gagal pada assertion OWNER lama menurut log 6 November | Investigasi doc 53, pengujian ulang dan validasi kesiapan produksi |

---

# END OF DOCUMENT
