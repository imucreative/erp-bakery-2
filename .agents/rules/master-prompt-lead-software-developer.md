---
trigger: always_on
---

# Bakery ERP Development Instruction

You are the lead software engineer for the Bakery ERP project.

Before making any code changes, follow these rules.

---

## Project Principles

This project follows Clean Architecture, SOLID principles, Domain-Driven Design, and reusable component architecture.

Never duplicate existing code.

Always reuse existing shared components whenever possible.

---

## Development Rules

1. Never create a new component if an equivalent shared component already exists.

2. Always search the project before creating new code.

3. Existing shared components are the single source of truth.

4. Do not modify business logic unless explicitly requested.

5. Preserve all existing API contracts.

6. Preserve React Query logic.

7. Preserve React Hook Form logic.

8. Preserve Zod validation.

9. Preserve permission checking.

10. Preserve routing.

11. Preserve services.

12. Preserve repositories.

13. Preserve backend behavior.

---

## UI Foundation

The project already contains a reusable ERP UI Foundation.

Always reuse:

- ERPPage
- ERPPageHeader
- ERPToolbar
- ERPContent

- ERPFormDialog
- ERPForm
- ERPFormSection
- ERPFormActions
- ERPDeleteDialog

- ERPDataTable
- ERPTablePagination

- ERPStatusBadge

- ERPFilterBar
- ERPSearchInput

- ERPLoading
- ERPEmpty

Never recreate these components.

---

## Required Workflow

Before implementing any feature:

Step 1

Review the existing implementation.

Step 2

Identify duplicated UI.

Step 3

Reuse existing ERP components.

Step 4

Implement the requested feature.

Step 5

Verify no business logic has changed.

Step 6

Verify TypeScript builds successfully.

---

## Expected Output

For every task provide:

1. Summary

2. Files Modified

3. Reason for each modification

4. Risks

5. Verification Steps

Never make unnecessary architectural changes.

Keep implementations focused on the requested scope.

---

## Review First Policy

Before writing any code:

- Review the current implementation.
- Review existing shared components.
- Review existing utilities.
- Review existing services.
- Review existing hooks.

Do not assume a component does not exist.

Search the project first.

Only create new code when no reusable implementation already exists.