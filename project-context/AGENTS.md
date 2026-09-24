# BAKERY ERP — AI AGENT PROJECT CONTEXT

> **Last Updated**: 2026-09-24 | **Project**: ERP Bakery
> Read this FIRST before doing any work.

---

## 1. PROJECT IDENTITY

| Attribute | Value |
|-----------|-------|
| Name | Bakery ERP System (ERP Bakery) |
| Industry | Bakery Retail & Manufacturing |
| Type | ERP Lite: POS + Inventory + Production + Distribution + Procurement + Finance |
| Architecture | Modular Monolith (NestJS backend + Next.js frontend) |
| Methodology | Agile Scrum (1-week sprints, 8-week MVP) |

**Business Problem**: Excel + 3rd party POS → no real-time stock, unrecorded production, manual reconciliation, high discrepancy.

**Solution**: Integrated system with POS, Inventory (FEFO + Batch), Production, Distribution (Central→Outlet), Replenishment, Dashboard, Reporting.

**Stakeholders**: OWNER (full access), SUPERVISOR_OUTLET, ADMIN_GUDANG, PRODUKSI, KASIR

---

## 2. TECHNOLOGY STACK

**Backend**: NestJS, TypeScript, Prisma ORM, PostgreSQL, Redis, BullMQ, JWT, Swagger, Winston
**Frontend (ACTIVE)**: Next.js 15, TypeScript, TanStack Query, Zustand, React Hook Form, Shadcn UI, TailwindCSS

---

## 3. PROJECT DIRECTORY MAP

```
erp-bakery-2/
├── backend/               ← NestJS Modular Monolith
│   └── src/modules/
│       ├── auth/              ✅ COMPLETE
│       ├── user/              ✅ COMPLETE
│       ├── role/              ✅ COMPLETE
│       ├── outlet/            ✅ COMPLETE
│       ├── warehouse/         ✅ COMPLETE
│       ├── product-group/     ✅ COMPLETE (+unit test, audit log)
│       ├── category/          ✅ COMPLETE
│       ├── uom/               ✅ COMPLETE
│       ├── supplier/          ✅ COMPLETE
│       ├── product/           ✅ COMPLETE (+492 baris unit test, audit log)
│       ├── payment-term/      ✅ COMPLETE
│       ├── inventory/         ✅ COMPLETE (Batch, Stock, Movement, Adjustment,
│       │                       Opname, Transfer, Dashboard, Reconciliation)
│       ├── purchase-request/  ✅ CODE ADA
│       ├── purchase-order/    ✅ CODE ADA
│       ├── goods-receipt/     ✅ CODE ADA
│       ├── purchase-return/   ✅ CODE ADA
│       ├── accounts-payable/  ✅ CODE ADA
│       ├── vendor-invoice/    ✅ CODE ADA
│       └── company/           ✅ COMPLETE (tenant context)
│
├── frontend/              ← Next.js Development target
│   └── src/
│       ├── app/
│       ├── components/
│       │   └── erp/       ← ERP UI Foundation — REUSE THIS
│       ├── lib/
│       ├── hooks/
│       └── services/
│
├── knowledge-base/        ← Source of truth (READ THIS FIRST)
│   ├── 1.business-context.md ... 44.master-data-dependency-standard.md
├── project-context/       ← AI Project Context (AGENTS.md)
└── .agents/               ← AI rules & workflows
```

---

## 4. CURRENT STATUS SUMMARY

| Sprint | Module | Status | Notes |
|--------|--------|--------|-------|
| 0 | Foundation | ✅ Done | Docker, NestJS, Prisma, Next.js setup |
| 1 | Auth & Master Data | ✅ Done | Auth, User, Outlet, Warehouse, Product Group, Category, UOM, Supplier, Payment Term, **Product** |
| 2 | Inventory | ✅ Code Complete | Backend complete; UI needs verification + implementation |
| 3 | Production | ⚠️ Partial | FEFO engine exists; Recipe/BOM/Production Order need work |
| 4 | Distribution | ⚠️ Partial | Stock Transfer complete; Replenishment not started |
| — | Procurement | ✅ Code Ada | PR, PO, GR, Return — code exists but not in sprint plan |
| — | Finance | ✅ Code Ada | Vendor Invoice, AP — code exists but not tested |
| 5 | POS | ❌ Not Started | |
| 6 | Dashboard & Reporting | ❌ Not Started | |
| 7 | Testing & UAT | ❌ Not Started | |

---

## 5. MANDATORY READING (Before Any Work)

### Highest Priority
1. `knowledge-base/24.ai-operating-system.md` — AI behavior rules (**HIGHEST**)
2. `.agents/rules/default-rules-bakery-erp.md` — Global AI rules
3. `.agents/workflows/default-workflow-bakery-erp.md` — Development workflow

### Module-Specific (Read Before Implementing)
4. `knowledge-base/19.frontend-constitution.md` — Frontend standards
5. `knowledge-base/20.backend-constitution.md` — Backend standards
6. `knowledge-base/36.application-blueprint.md` — Folder structure & naming
7. `knowledge-base/16.role-permission-matrix.md` — RBAC standards
8. Domain docs: `26.procurement-domain.md`, `27.inventory-domain.md`, `28.production-domain.md`, `29.sales-domain.md`, `30.finance-domain.md`

### Reference
9. `knowledge-base/2.BRD.md` — Business requirements
10. `knowledge-base/3.PRD.md` — Product requirements
11. `knowledge-base/21.definition-of-done.md` — DoD
12. `knowledge-base/22.repository-quality-gates.md` — Quality gates
13. `knowledge-base/31.erp-module-blueprint.md` — Module structure
14. `knowledge-base/32.module-development-workflow.md` — 10-step lifecycle
15. `knowledge-base/35.global-erp-standards.md` — Global standards
16. `knowledge-base/43.document-authorization-standard.md` — Document authorization
17. `knowledge-base/44.master-data-dependency-standard.md` — Master data protection

---

## 6. DEVELOPMENT WORKFLOW (Mandatory)

```
1. Read AI Operating System (24.ai-operating-system.md)
2. Read Knowledge Base docs (relevant to task)
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
- Feature structure: `src/app/(dashboard)/<feature>/` with components/, hooks/, services/, schemas/, types/, constants/
- Reuse `src/components/erp/` foundation components
- NO direct Shadcn imports in page files
- Use absolute aliases: `@/components/erp/...`
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

### Priority 1 — Core
Auth, User, Role, Permission

### Priority 2 — Master Data
Outlet, Warehouse, Product Group, Category, UOM, Supplier, Payment Term

### Priority 3 — Product Management
Product CRUD, Lookup, Validation, Audit Log

### Priority 4 — Inventory
Batch, Stock, Movement, Adjustment, Opname, Transfer, Dashboard, Reconciliation

### Priority 5 — Procurement (HIGH PRIORITY — belum di-test)
Purchase Request, Purchase Order, Goods Receipt, Purchase Return

### Priority 6 — Finance (HIGH PRIORITY — belum di-test)
Vendor Invoice, Accounts Payable

---

## 10. ACTIVE FOCUS

### Dev Agent (Frontend — `frontend/` target)
Target: Implement UI pages for existing backend modules
- Product Management (List, Form)
- Inventory (Batch, Stock, Movement, Adjustment, Opname, Transfer, Dashboard)
- Procurement (PR, PO, GR, Return)
- Finance (Vendor Invoice, AP)
- Ikuti frontend-constitution.md dan application-blueprint.md

### QA Agent (Testing — `backend/` focus)
Target: Test existing modules
- Priority 1-4: Verify existing unit tests, check type safety, review code
- Priority 5-6: Procurement & Finance — create test plan, run tests, report findings
- Dokumentasikan semua temuan (bug, missing test, code quality issues)

---

## 11. ENVIRONMENTAL NOTES

- Backend: `backend/` (NestJS + Prisma + PostgreSQL via Docker)
- Frontend: `frontend/` (Next.js)
- Database: PostgreSQL (via Docker Compose di root project)

---

## 12. KEY CONTACTS

| Role | Name | Notes |
|------|------|-------|
| Product Owner | Dian (Bang) | Decision maker |
| AI Project Manager | Hermes Agent | Coordination & knowledge-base management |
| Dev Agent | Spawned sub-agent | Frontend development (`frontend/`) |
| QA Agent | Spawned sub-agent | Testing existing modules |

---

## 13. KNOWLEDGE BASE GAP (Wajib Dipahami)

| Modul | knowledge-base Status | Kode Aktual | Action |
|-------|----------------------|-------------|--------|
| Product Management | `[ ]` (belum selesai) | ✅ Lengkap | Update ke ✅ Selesai — done |
| Inventory | `[ ]` (belum start) | ✅ Lengkap | Update ke ✅ Code Lengkap — done |
| Procurement (PR/PO/GR/Return) | Tidak ada di sprint plan | ✅ Ada di kode | Dokumentasi + Frontend + Testing |
| Finance (AP/Vendor Invoice) | Tidak ada | ✅ Ada di kode | Testing prioritas QA |
| Dashboard & Reporting | Sprint 6 belum | ❌ Belum ada kode | Belum dimulai |
| POS | Sprint 5 belum | ❌ Belum ada kode | Belum dimulai |
| Production | Sprint 3 belum | ⚠️ Ada FEFO engine | Perlu verifikasi + lanjut dev |

---

# END OF DOCUMENT
