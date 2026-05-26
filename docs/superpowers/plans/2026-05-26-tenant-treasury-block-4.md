# Tenant Treasury Block 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the tenant `Tesoreria` module into `Resumen`, `Movimientos`, and `Cobros pendientes`, using quote-derived data only and keeping follow-up actions fast.

**Architecture:** Keep this block frontend-only inside `frontend/src/features/dashboard/DashboardPage.tsx`, reusing the existing quote list, treasury metrics, WhatsApp, and PDF actions. Convert the current single-screen treasury surface into an internal workspace with tenant-focused subsections, filters, and direct navigation back to `Presupuestos > Editor`.

**Tech Stack:** React, TypeScript, Vite, Vitest, existing dashboard styles and API client

---

## File Structure

- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
  - add treasury subsection state and navigation
  - reorganize current treasury rendering into `Resumen`, `Movimientos`, and `Cobros pendientes`
  - wire `Abrir presupuesto` to existing quote editor navigation
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`
  - update treasury assertions to the new internal structure
  - add coverage for subsection switching and pending collection actions

### Task 1: Treasury workspace structure

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add assertions near the existing treasury tests:

```tsx
it('opens Tesoreria on Resumen with internal navigation', async () => {
  const user = userEvent.setup();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: 'Tesoreria' }));

  expect(await screen.findByRole('heading', { name: 'Resumen de tesoreria' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Resumen' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Movimientos' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cobros pendientes' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected: FAIL because `Tesoreria` still renders the previous single-screen layout.

- [ ] **Step 3: Write minimal implementation**

Inside `frontend/src/features/dashboard/DashboardPage.tsx`:

```ts
type TreasurySection = 'overview' | 'movements' | 'pending';
```

```tsx
const [activeTreasurySection, setActiveTreasurySection] = useState<TreasurySection>('overview');
```

```tsx
const treasurySections = [
  { id: 'overview' as const, label: 'Resumen' },
  { id: 'movements' as const, label: 'Movimientos' },
  { id: 'pending' as const, label: 'Cobros pendientes' },
];
```

Render treasury as a workspace header plus internal navigation, following the same desktop/mobile pattern already used in `Plataforma`, `Empresa`, and `Presupuestos`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected: PASS for the new treasury workspace navigation test.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Restructure tenant treasury workspace"
```

### Task 2: Resumen de tesorería

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a treasury overview assertion:

```tsx
it('shows treasury summary metrics and unresolved issued alerts', async () => {
  const user = userEvent.setup();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: 'Tesoreria' }));

  expect(await screen.findByText('Facturado aceptado')).toBeInTheDocument();
  expect(screen.getByText('Pendiente emitido')).toBeInTheDocument();
  expect(screen.getByText('Rechazado')).toBeInTheDocument();
  expect(screen.getByText('Total de presupuestos')).toBeInTheDocument();
  expect(screen.getByText('Mes actual')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Atencion inmediata' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected: FAIL because the old treasury view does not expose the new summary structure.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/features/dashboard/DashboardPage.tsx`, derive summary values from `quotes`:

```ts
const acceptedQuotes = quotes.filter((quote) => quote.status === 'accepted');
const issuedQuotes = quotes.filter((quote) => quote.status === 'issued');
const rejectedQuotes = quotes.filter((quote) => quote.status === 'rejected');
const currentMonthLabel = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  timeZone: 'America/Buenos_Aires',
  year: 'numeric',
}).format(new Date());
```

Render overview cards and an immediate-attention list that only includes `issued` quotes.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected: PASS for the treasury summary assertions.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Add tenant treasury overview"
```

### Task 3: Movimientos

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a movements test:

```tsx
it('filters treasury movements by quote status', async () => {
  const user = userEvent.setup();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: 'Tesoreria' }));
  await user.click(screen.getByRole('button', { name: 'Movimientos' }));
  await user.click(screen.getByRole('button', { name: 'Emitidos' }));

  expect(await screen.findByText('Q-000002')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected: FAIL because `Movimientos` and its filters do not exist yet.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/features/dashboard/DashboardPage.tsx`:

```ts
type TreasuryMovementFilter = 'all' | 'accepted' | 'issued' | 'rejected';
```

```tsx
const [treasuryMovementFilter, setTreasuryMovementFilter] = useState<TreasuryMovementFilter>('all');
```

Render a compact, newest-first list of quote-derived movements with status chips and filter buttons:

```tsx
const movementQuotes = quotes
  .filter((quote) => treasuryMovementFilter === 'all' ? true : quote.status === treasuryMovementFilter)
  .sort((left, right) => quoteTimestamp(right) - quoteTimestamp(left));
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected: PASS for movement filtering.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Add tenant treasury movements"
```

### Task 4: Cobros pendientes

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a pending collections test:

```tsx
it('opens issued quotes from treasury pending collections', async () => {
  const user = userEvent.setup();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: 'Tesoreria' }));
  await user.click(screen.getByRole('button', { name: 'Cobros pendientes' }));
  await user.click(await screen.findByRole('button', { name: 'Abrir presupuesto' }));

  expect(await screen.findByRole('heading', { name: 'Q-000002' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected: FAIL because treasury pending collections and its navigation action do not exist.

- [ ] **Step 3: Write minimal implementation**

Reuse existing dashboard handlers by rendering only `issued` quotes in `Cobros pendientes`:

```tsx
const pendingQuotes = quotes
  .filter((quote) => quote.status === 'issued')
  .sort((left, right) => quoteTimestamp(right) - quoteTimestamp(left));
```

Wire `Abrir presupuesto` to the same state transitions already used by the quotes module:

```tsx
setSelectedQuoteId(quote.id);
setActiveView('quotes');
```

Keep existing `WhatsApp` and `PDF` actions tied to the selected quote row.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected: PASS for the pending-collections navigation flow.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Add tenant treasury pending collections"
```

### Task 5: Verification

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Run focused treasury and dashboard verification**

Run:

```powershell
npm.cmd run test:run
```

Expected: `PASS` with the full frontend suite green.

- [ ] **Step 2: Run typecheck**

Run:

```powershell
npm.cmd run typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 3: Run production build**

Run:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=4096'; npm.cmd run build
```

Expected: Vite build completes successfully.

- [ ] **Step 4: Commit the verified block**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Rework tenant treasury workspace"
```
