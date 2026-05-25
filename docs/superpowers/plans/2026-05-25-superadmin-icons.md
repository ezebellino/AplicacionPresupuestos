# Superadmin Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve `platform_admin` UI clarity by adding `lucide-react` icons to notifications and obvious superadmin-only actions.

**Architecture:** Keep the change scoped to the frontend. Add `lucide-react`, update `DashboardPage.tsx` to use icon components only in superadmin surfaces, and verify that notifications and role separation keep working.

**Tech Stack:** React, TypeScript, Vite, Vitest, lucide-react

---

### Task 1: Install icon dependency and add notification icon

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Add a focused test expectation**

Add or update a dashboard test so the `platform_admin` notification button still exists and remains reachable after the icon change.

- [ ] **Step 2: Install dependency**

Run:

```bash
npm.cmd install lucide-react
```

- [ ] **Step 3: Replace notification placeholder**

Import and render `Bell` in the notification button, preserving:

- `aria-label="Notificaciones"`
- badge count
- existing click behavior

- [ ] **Step 4: Verify**

Run:

```bash
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected:
- dashboard tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Add superadmin notification icon"
```

### Task 2: Add icons to obvious superadmin-only actions

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add icons only where they improve scanability**

Use `lucide-react` icons in superadmin-only controls such as:

- `Perfil`
- `WhatsApp`
- `Email`
- `Historial`
- `Pendientes`

Do not change the company/admin role UI in this task.

- [ ] **Step 2: Keep text where needed**

Use icon + text for clarity, not icon-only buttons, except where the control is already compact and obvious.

- [ ] **Step 3: Verify full frontend**

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
git commit -m "Polish superadmin action icons"
```

## Self-Review

- Spec coverage: the plan covers `lucide-react`, the bell icon, and scoped superadmin-only icon usage.
- Placeholder scan: no placeholders remain.
- Type consistency: all changes stay inside the frontend and preserve current accessibility labels.
