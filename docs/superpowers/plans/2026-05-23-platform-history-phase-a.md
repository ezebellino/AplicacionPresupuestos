# Platform History Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Pendientes / Historial` modes to the `platform_admin` `Solicitudes`, `Cambios fiscales`, and `Membresias` subsections without touching backend contracts.

**Architecture:** Keep all changes in the frontend by extending `PlatformAdminView` with per-section mode state, derived historical datasets from the already loaded platform payloads, and targeted tests that verify pending-first behavior and read-only history rendering.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, inline style objects

---

### Task 1: Add failing tests for per-section `Pendientes / Historial`

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add tests that switch each subsection from `Pendientes` to `Historial` and assert the expected content:

```tsx
it('switches Solicitudes to Historial and shows resolved records', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
  await user.click(screen.getByRole('button', { name: 'Solicitudes (1)' }));
  await user.click(screen.getByRole('button', { name: 'Historial' }));

  expect(await screen.findByText('Test Empresa')).toBeInTheDocument();
  expect(screen.getByText('rejected')).toBeInTheDocument();
});

it('switches Membresias to Historial and shows payment records', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
  await user.click(screen.getByRole('button', { name: 'Membresias (2)' }));
  await user.click(screen.getByRole('button', { name: 'Historial' }));

  expect(await screen.findByText(/Mensual/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: FAIL because the subsections currently have no `Pendientes / Historial` toggle.

- [ ] **Step 3: Write minimal implementation**

Add mode state inside `PlatformAdminView`:

```tsx
const [signupViewMode, setSignupViewMode] = useState<'pending' | 'history'>('pending');
const [changeViewMode, setChangeViewMode] = useState<'pending' | 'history'>('pending');
const [membershipViewMode, setMembershipViewMode] = useState<'pending' | 'history'>('pending');
```

Derive historical arrays:

```tsx
const historicalSignupRequests = signupRequests.filter((request) => request.status !== 'pending');
const historicalChangeRequests = changeRequests.filter((request) => request.status !== 'pending');
const membershipPaymentHistory = memberships.flatMap((membership) =>
  membership.payments.map((payment) => ({ membership, payment })),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: PASS for the new history mode tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Add platform history view modes"
```

### Task 2: Render history mode in `Solicitudes` and `Cambios fiscales`

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add tests for the content split:

```tsx
it('keeps Solicitudes on Pendientes by default', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
  await user.click(screen.getByRole('button', { name: 'Solicitudes (1)' }));

  expect(screen.getByRole('button', { name: 'Pendientes' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('AUBASA')).toBeInTheDocument();
});

it('shows resolved fiscal changes in Historial mode', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
  await user.click(screen.getByRole('button', { name: 'Cambios fiscales (1)' }));
  await user.click(screen.getByRole('button', { name: 'Historial' }));

  expect(await screen.findByText(/approved|rejected/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: FAIL because the two operational subsections still render only the pending list.

- [ ] **Step 3: Write minimal implementation**

Add a small reusable mode switch row:

```tsx
function sectionModeButton(isActive: boolean): React.CSSProperties {
  return isActive ? styles.platformFilterButtonActive : styles.platformFilterButton;
}
```

Render mode buttons inside `Solicitudes` and `Cambios fiscales`:

```tsx
<div style={styles.platformFilterBar}>
  <button aria-pressed={signupViewMode === 'pending'} ...>Pendientes</button>
  <button aria-pressed={signupViewMode === 'history'} ...>Historial</button>
</div>
```

Switch the list source depending on mode:

```tsx
const visibleSignupRequests = signupViewMode === 'pending' ? pendingSignupRequests : historicalSignupRequests;
const visibleChangeRequests = changeViewMode === 'pending' ? pendingChangeRequests : historicalChangeRequests;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: PASS for the pending/default and historical rendering checks.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Add platform request history views"
```

### Task 3: Render read-only membership payment history

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add a test for read-only payment history details:

```tsx
it('shows membership payment history details in Historial mode', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
  await user.click(screen.getByRole('button', { name: 'Membresias (2)' }));
  await user.click(screen.getByRole('button', { name: 'Historial' }));

  expect(await screen.findByText(/Q-/i)).toBeInTheDocument();
  expect(screen.getByText(/Mensual|Trimestral|Semestral|Anual/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: FAIL because memberships currently have only the operational list.

- [ ] **Step 3: Write minimal implementation**

Flatten and sort payment history:

```tsx
const membershipPaymentHistory = memberships
  .flatMap((membership) =>
    membership.payments.map((payment) => ({
      membership,
      payment,
    })),
  )
  .sort((left, right) => right.payment.paid_at.localeCompare(left.payment.paid_at));
```

Render a read-only history list when `membershipViewMode === 'history'`:

```tsx
<article key={payment.id} style={styles.serviceRecord}>
  <strong>{membership.name}</strong>
  <span>{formatDate(payment.paid_at)}</span>
  <span>{formatMonthsCovered(payment.months_covered)}</span>
  <span>{payment.amount ? formatMoney(payment.amount) : 'Sin monto'}</span>
  <span>{payment.quote_number ?? 'Sin presupuesto asociado'}</span>
</article>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: PASS for membership payment history rendering.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Add membership payment history view"
```

### Task 4: Verify responsive behavior and full frontend checks

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a mobile-oriented assertion that the history toggle is still reachable:

```tsx
it('keeps history controls usable on mobile platform sections', async () => {
  const user = userEvent.setup();
  setViewportWidth(390);
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
  await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
  await user.selectOptions(await screen.findByLabelText('Seccion de plataforma'), 'memberships');

  expect(await screen.findByRole('button', { name: 'Historial' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: FAIL if the history toggle placement is not yet responsive enough.

- [ ] **Step 3: Write minimal implementation**

Keep the mode toggle inside the subsection body so it renders on both desktop and mobile, and use the existing compact card layout for historical lists when the viewport is small.

- [ ] **Step 4: Run the full frontend verification**

Run:
- `npm.cmd run typecheck`
- `npm.cmd run test:run`
- `npm.cmd run build`

Expected:
- typecheck passes
- all frontend tests pass
- production build passes

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Polish platform history phase A"
```

## Self-Review

- Spec coverage: the plan covers per-section pending/history modes, pending defaults, read-only membership payment history, and responsive checks.
- Placeholder scan: all tasks include explicit files, commands, and implementation targets.
- Type consistency: the plan consistently uses `pending/history` modes and `membershipPaymentHistory` as the read-only history source.
