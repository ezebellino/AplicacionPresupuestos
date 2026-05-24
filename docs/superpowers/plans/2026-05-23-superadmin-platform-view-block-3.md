# Superadmin Platform View Block 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the `platform_admin` `Plataforma` screen into an internal multi-section workspace with a `Resumen` default view, pending counters, responsive navigation, and operational membership filtering.

**Architecture:** Keep the backend and API contracts unchanged. Implement the redesign inside `frontend/src/features/dashboard/DashboardPage.tsx` by adding a platform subsection state, derived counters/helpers, and focused rendering branches for `Resumen`, `Solicitudes`, `Cambios fiscales`, and `Membresias`, backed by targeted Vitest coverage.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, inline style objects

---

### Task 1: Add failing tests for internal platform navigation

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add tests that assert:
- `platform_admin` lands on `Resumen` when opening `Plataforma`
- the internal navigation shows subsection counters
- clicking subsection controls switches between `Solicitudes`, `Cambios fiscales`, and `Membresias`

```tsx
it('opens Plataforma on Resumen by default for platform admins', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Plataforma' }));

  expect(await screen.findByRole('heading', { name: 'Resumen de plataforma' })).toBeInTheDocument();
  expect(screen.getByText('Solicitudes (1)')).toBeInTheDocument();
  expect(screen.getByText('Cambios fiscales (1)')).toBeInTheDocument();
  expect(screen.getByText('Membresias (2)')).toBeInTheDocument();
});

it('switches platform subsections from the internal navigation', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
  await user.click(screen.getByRole('button', { name: /Solicitudes \(1\)/i }));
  expect(await screen.findByRole('heading', { name: 'Solicitudes de alta' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Cambios fiscales \(1\)/i }));
  expect(await screen.findByRole('heading', { name: 'Cambios fiscales' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Membresias \(2\)/i }));
  expect(await screen.findByRole('heading', { name: 'Membresias SaaS' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: FAIL because the platform view still renders as a single long screen without `Resumen de plataforma` or subsection controls.

- [ ] **Step 3: Write minimal implementation**

Add a platform subsection state and a small navigation model inside `DashboardPage.tsx`:

```tsx
type PlatformSection = 'overview' | 'signups' | 'changes' | 'memberships';

const [activePlatformSection, setActivePlatformSection] = useState<PlatformSection>('overview');

const platformCounts = {
  signups: platformSignupRequests.filter((item) => item.status === 'pending').length,
  changes: platformChangeRequests.filter((item) => item.status === 'pending').length,
  memberships: platformMemberships.filter((item) => {
    if (!item.membership_due_date) {
      return false;
    }

    return daysUntilDate(item.membership_due_date) <= 3;
  }).length,
};

const platformSections = [
  { id: 'overview' as const, label: 'Resumen' },
  { id: 'signups' as const, label: `Solicitudes (${platformCounts.signups})` },
  { id: 'changes' as const, label: `Cambios fiscales (${platformCounts.changes})` },
  { id: 'memberships' as const, label: `Membresias (${platformCounts.memberships})` },
];
```

Reset to overview when opening `Plataforma`:

```tsx
const navigateToView = (view: View) => {
  setActiveView(view);
  if (view === 'platform') {
    setActivePlatformSection('overview');
  }
  setIsMobileMenuOpen(false);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: PASS for the new navigation-focused tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Add platform section navigation"
```

### Task 2: Build the platform overview summary

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add tests for the summary KPIs and the immediate attention block:

```tsx
it('renders platform overview KPIs and immediate attention items', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Plataforma' }));

  expect(await screen.findByText('Solicitudes pendientes')).toBeInTheDocument();
  expect(screen.getByText('Cambios fiscales pendientes')).toBeInTheDocument();
  expect(screen.getByText('Membresias activas')).toBeInTheDocument();
  expect(screen.getByText('Membresias vencidas')).toBeInTheDocument();
  expect(screen.getByText('Vencen en 3 dias')).toBeInTheDocument();
  expect(screen.getByText('A cobrar este mes')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Atencion inmediata' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: FAIL because the platform view still has no dedicated summary section or attention block.

- [ ] **Step 3: Write minimal implementation**

Add derived helpers for the overview:

```tsx
const dueSoonMemberships = platformMemberships.filter((membership) => {
  if (!membership.membership_due_date) {
    return false;
  }

  const days = daysUntilDate(membership.membership_due_date);
  return days >= 0 && days <= 3;
});

const expiredMemberships = platformMemberships.filter((membership) => {
  if (!membership.membership_due_date) {
    return false;
  }

  return daysUntilDate(membership.membership_due_date) < 0;
});

const amountDueThisMonth = [...expiredMemberships, ...dueSoonMemberships].reduce((total, membership) => {
  return total + Number(membership.membership_monthly_fee ?? 0);
}, 0);
```

Render an overview section:

```tsx
<section>
  <h2>Resumen de plataforma</h2>
  <div>{/* KPI cards */}</div>
  <div>
    <h3>Atencion inmediata</h3>
    {/* pending signup, pending fiscal change, expired, due soon items */}
  </div>
</section>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: PASS for the overview coverage.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Add platform overview summary"
```

### Task 3: Split operational sections and membership filters

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add coverage for default pending-only sections and membership filters:

```tsx
it('shows pending-only operational content in Solicitudes and Cambios fiscales', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
  await user.click(screen.getByRole('button', { name: /Solicitudes \(1\)/i }));
  expect(screen.queryByText(/approved/i)).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Cambios fiscales \(1\)/i }));
  expect(screen.queryByText(/approved/i)).not.toBeInTheDocument();
});

it('filters memberships by operational status', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
  await user.click(screen.getByRole('button', { name: /Membresias \(2\)/i }));
  await user.click(screen.getByRole('button', { name: 'Vencidas' }));

  expect(screen.getByText('DM Refrigeracion')).toBeInTheDocument();
  expect(screen.queryByText('AUBASA')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: FAIL because memberships have no filter controls and the platform screen is not sectioned yet.

- [ ] **Step 3: Write minimal implementation**

Add a membership filter state and derived list:

```tsx
type MembershipFilter = 'all' | 'expired' | 'due_soon' | 'active';

const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>('all');

const filteredPlatformMemberships = platformMemberships.filter((membership) => {
  const days = membership.membership_due_date ? daysUntilDate(membership.membership_due_date) : null;

  if (membershipFilter === 'expired') {
    return days !== null && days < 0;
  }

  if (membershipFilter === 'due_soon') {
    return days !== null && days >= 0 && days <= 3;
  }

  if (membershipFilter === 'active') {
    return membership.membership_status === 'active' && (days === null || days > 3);
  }

  return true;
});
```

Render each subsection conditionally:

```tsx
{activePlatformSection === 'signups' ? <PlatformSignupSection ... /> : null}
{activePlatformSection === 'changes' ? <PlatformChangeSection ... /> : null}
{activePlatformSection === 'memberships' ? <PlatformMembershipSection memberships={filteredPlatformMemberships} ... /> : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: PASS for pending-only rendering and membership filtering.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Split platform operations into subsections"
```

### Task 4: Polish responsive layout and validate the full frontend

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a mobile-oriented assertion that the platform selector remains usable:

```tsx
it('renders a compact platform selector on mobile', async () => {
  const user = userEvent.setup();
  setViewportWidth(390);
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Menu' }));
  await user.click(screen.getByRole('button', { name: 'Plataforma' }));

  expect(await screen.findByLabelText('Seccion de plataforma')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx`
Expected: FAIL because mobile still uses the same unstructured content without a dedicated compact selector.

- [ ] **Step 3: Write minimal implementation**

Render a compact `<select>` or compact segmented control only for small layouts:

```tsx
{isCompactLayout ? (
  <label>
    <span>Seccion de plataforma</span>
    <select
      aria-label="Seccion de plataforma"
      value={activePlatformSection}
      onChange={(event) => setActivePlatformSection(event.target.value as PlatformSection)}
    >
      {platformSections.map((section) => (
        <option key={section.id} value={section.id}>
          {section.label}
        </option>
      ))}
    </select>
  </label>
) : (
  <div>{/* segmented control buttons */}</div>
)}
```

Adjust inline styles for:
- responsive KPI grid
- compact platform selector
- membership cards on mobile
- no horizontal overflow

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
git commit -m "Polish responsive platform workspace"
```

## Self-Review

- Spec coverage: the tasks cover internal subsections, overview KPIs, counters, pending-first operational sections, membership filters, and mobile behavior.
- Placeholder scan: all tasks include explicit files, commands, and code targets.
- Type consistency: the plan uses `PlatformSection` and `MembershipFilter` consistently across tasks.
