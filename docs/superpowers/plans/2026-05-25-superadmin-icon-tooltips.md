# Superadmin Icon Tooltips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend superadmin icon usage and add native hover tooltips (`title`) to icon-based controls without changing the company/admin role UI.

**Architecture:** Keep the work scoped to `frontend/src/features/dashboard/DashboardPage.tsx`. Reuse `lucide-react`, add icon+text wrappers where useful, and set `title` on superadmin buttons so desktop hover clarifies meaning while mobile keeps visible labels.

**Tech Stack:** React, TypeScript, Vite, Vitest, lucide-react

---

### Task 1: Add tooltips to existing superadmin icon controls

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Update current icon buttons**

Add `title` to current superadmin icon-bearing controls, starting with:

- notification bell
- `Perfil`
- `Pendientes`
- `Historial`
- `WhatsApp`
- `Email`

- [ ] **Step 2: Preserve accessibility**

Keep `aria-label` where already present and ensure `title` matches the action text.

- [ ] **Step 3: Verify focused dashboard tests**

Run:

```bash
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected:
- dashboard tests pass

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx
git commit -m "Add tooltips to superadmin icon controls"
```

### Task 2: Extend icons to remaining obvious superadmin actions

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add icons to obvious actions**

Add icon + text for remaining clear superadmin actions such as:

- `Crear cuenta`
- `Contactada`
- `Rechazar`
- `Aprobar`
- `Registrar pago`

Only if they live in superadmin-only surfaces.

- [ ] **Step 2: Add matching `title`**

Each of those buttons should expose a clear native tooltip.

- [ ] **Step 3: Run full frontend verification**

Run:

```bash
npm.cmd run typecheck
npm.cmd run test:run
npm.cmd run build
```

Expected:
- typecheck passes
- all frontend tests pass
- build passes

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx
git commit -m "Extend superadmin action icons"
```

## Self-Review

- Spec coverage: the plan covers native tooltips, icon extension, and superadmin-only scope.
- Placeholder scan: no placeholders remain.
- Type consistency: all work stays in `DashboardPage.tsx` and reuses the existing icon styling helper.
