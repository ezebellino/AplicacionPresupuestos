# Superadmin Notifications Block 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una campana de notificaciones para `platform_admin` con contador total y panel lateral de pendientes operativos, derivada de solicitudes, cambios fiscales y membresias.

**Architecture:** La iteracion se resuelve solo en frontend dentro de `DashboardPage.tsx`, derivando notificaciones desde `platformSignupRequests`, `platformChangeRequests` y `platformMemberships`. La UI se integra en la topbar y en mobile sin introducir storage nuevo ni endpoints adicionales.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library.

---

## File Structure

- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
  - derivar items de notificacion
  - renderizar campana + badge
  - abrir/cerrar panel lateral
  - conectar CTA hacia `activeView = 'platform'`
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`
  - ampliar mocks de `platform_admin`
  - cubrir contador, visibilidad, panel y CTA

## Task 1: Cubrir el comportamiento esperado de la campana

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Extender los mocks para `platform_admin`**

Dentro del mock de `fetch`, responder estas rutas cuando `currentRole === 'platform_admin'`:

```ts
if (url.endsWith('/admin/tenants/platform/signup-requests')) {
  return Promise.resolve(
    new Response(
      JSON.stringify({
        items: [
          {
            id: 'signup-1',
            company_name: 'AUBASA',
            contact_name: 'Dario Lopez',
            email: 'dario@test.com',
            phone: '2245505050',
            business_type: 'Infraestructura',
            message: null,
            status: 'pending',
            review_notes: null,
            created_tenant_id: null,
            created_admin_email: null,
          },
        ],
      }),
      { status: 200 },
    ),
  );
}

if (url.endsWith('/admin/tenants/platform/change-requests')) {
  return Promise.resolve(
    new Response(
      JSON.stringify({
        items: [
          {
            id: 'change-1',
            tenant_id: 'tenant-customer-1',
            requested_by_user_id: 'user-customer-1',
            status: 'pending',
            current_name: 'DM Refrigeracion',
            current_legal_name: null,
            current_tax_id: null,
            proposed_name: 'DM Refrigeracion SRL',
            proposed_legal_name: null,
            proposed_tax_id: null,
            reason: 'Alta fiscal',
          },
        ],
      }),
      { status: 200 },
    ),
  );
}

if (url.endsWith('/admin/tenants/platform/memberships')) {
  return Promise.resolve(
    new Response(
      JSON.stringify({
        items: [
          {
            id: 'tenant-customer-1',
            name: 'DM Refrigeracion',
            legal_name: null,
            tax_id: null,
            email: 'dm@test.com',
            phone: '5492245476329',
            membership_status: 'expired',
            membership_due_date: '<PAST_DATE>',
            membership_last_payment_at: null,
            membership_monthly_fee: '5000.00',
            payments: [],
          },
          {
            id: 'tenant-customer-2',
            name: 'AUBASA',
            legal_name: null,
            tax_id: null,
            email: 'aubasa@test.com',
            phone: '5492245476330',
            membership_status: 'active',
            membership_due_date: '<PLUS_3_DAYS>',
            membership_last_payment_at: null,
            membership_monthly_fee: '5000.00',
            payments: [],
          },
        ],
      }),
      { status: 200 },
    ),
  );
}
```

Usar fechas generadas en el test para:

- una membresia ya vencida
- una membresia que vence dentro de 3 dias

- [ ] **Step 2: Escribir el test del contador total**

Agregar un test que verifique:

- la campana aparece solo en `platform_admin`
- el badge muestra `4` para: 1 alta + 1 cambio + 2 membresias

```tsx
it('shows a total pending notifications badge for platform admins', async () => {
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  expect(await screen.findByRole('button', { name: 'Notificaciones' })).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument();
});
```

- [ ] **Step 3: Escribir el test del panel lateral**

```tsx
it('opens the notifications panel with grouped pending items', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Notificaciones' }));

  expect(screen.getByRole('heading', { name: 'Pendientes de plataforma' })).toBeInTheDocument();
  expect(screen.getByText('Altas pendientes')).toBeInTheDocument();
  expect(screen.getByText('Cambios fiscales')).toBeInTheDocument();
  expect(screen.getByText('Membresias por vencer o vencidas')).toBeInTheDocument();
});
```

- [ ] **Step 4: Escribir el test del CTA**

```tsx
it('navigates to Plataforma from a notification action', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(await screen.findByRole('button', { name: 'Notificaciones' }));
  await user.click(screen.getAllByRole('button', { name: /Revisar solicitud|Ver cambio|Registrar pago/ })[0]);

  expect(await screen.findByRole('heading', { name: 'Solicitudes de alta' })).toBeInTheDocument();
});
```

- [ ] **Step 5: Ejecutar los tests para verificar que fallen**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected:

- fallan los tests nuevos porque todavia no existe campana ni panel

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Add failing tests for superadmin notifications"
```

## Task 2: Derivar notificaciones desde el estado del dashboard

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Agregar tipos de notificacion locales**

En `DashboardPage.tsx`, cerca de los tipos locales, agregar:

```tsx
type PlatformNotification =
  | {
      id: string;
      kind: 'signup';
      title: string;
      description: string;
      actionLabel: 'Revisar solicitud';
    }
  | {
      id: string;
      kind: 'change_request';
      title: string;
      description: string;
      actionLabel: 'Ver cambio';
    }
  | {
      id: string;
      kind: 'membership';
      title: string;
      description: string;
      actionLabel: 'Registrar pago';
    };
```

- [ ] **Step 2: Crear helpers de fecha y derivacion**

Agregar funciones puras dentro del archivo:

```tsx
function daysUntilDate(dateValue: string, now = new Date()): number {
  const target = new Date(`${dateValue}T00:00:00`);
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((target.getTime() - current.getTime()) / 86400000);
}

function buildPlatformNotifications(
  signupRequests: TenantSignupRequest[],
  changeRequests: TenantChangeRequest[],
  memberships: PlatformTenantMembership[],
  now = new Date(),
): PlatformNotification[] {
  const signupItems = signupRequests
    .filter((request) => request.status === 'pending')
    .map((request) => ({
      id: `signup-${request.id}`,
      kind: 'signup' as const,
      title: request.company_name,
      description: `${request.contact_name} - ${request.phone}`,
      actionLabel: 'Revisar solicitud' as const,
    }));

  const changeItems = changeRequests
    .filter((request) => request.status === 'pending')
    .map((request) => ({
      id: `change-${request.id}`,
      kind: 'change_request' as const,
      title: request.current_name ?? 'Cambio fiscal pendiente',
      description: request.reason ?? 'Pendiente de revision',
      actionLabel: 'Ver cambio' as const,
    }));

  const membershipItems = memberships
    .filter((membership) => {
      if (!membership.membership_due_date) return false;
      const days = daysUntilDate(membership.membership_due_date, now);
      return days <= 3;
    })
    .map((membership) => {
      const days = membership.membership_due_date
        ? daysUntilDate(membership.membership_due_date, now)
        : null;

      return {
        id: `membership-${membership.id}`,
        kind: 'membership' as const,
        title: membership.name,
        description:
          days !== null && days < 0
            ? 'Membresia vencida'
            : `Vence en ${days} dia${days === 1 ? '' : 's'}`,
        actionLabel: 'Registrar pago' as const,
      };
    });

  return [...signupItems, ...changeItems, ...membershipItems];
}
```

- [ ] **Step 3: Crear estado minimo del panel**

Agregar:

```tsx
const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
```

y derivar:

```tsx
const platformNotifications =
  currentUser?.role === 'platform_admin'
    ? buildPlatformNotifications(platformSignupRequests, platformChangeRequests, platformMemberships)
    : [];

const pendingNotificationCount = platformNotifications.length;
```

- [ ] **Step 4: Ejecutar tests**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected:

- siguen fallando los tests visuales
- pero ya existe la base de datos derivada necesaria

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/features/dashboard/DashboardPage.tsx
git commit -m "Derive platform notifications from dashboard state"
```

## Task 3: Renderizar campana, badge y panel lateral

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Agregar la campana en topbar**

Renderizar un boton exclusivo para `platform_admin` dentro de `topbarActions`:

```tsx
{currentUser?.role === 'platform_admin' ? (
  <button
    aria-label="Notificaciones"
    onClick={() => setIsNotificationsOpen((current) => !current)}
    style={styles.notificationButton}
    type="button"
  >
    <span aria-hidden="true">Campana</span>
    {pendingNotificationCount > 0 ? <span style={styles.notificationBadge}>{pendingNotificationCount}</span> : null}
  </button>
) : null}
```

El contenido visual puede ser texto o glifo simple en esta iteracion. No hace falta introducir una libreria de iconos nueva.

- [ ] **Step 2: Agregar la campana tambien al header mobile**

Dentro de `mobileHeader`, antes del boton `Abrir menu`, renderizar la misma accion de `Notificaciones` si el rol es `platform_admin`.

- [ ] **Step 3: Renderizar el panel lateral**

Debajo de la topbar o como sibling del contenido principal, agregar:

```tsx
{isNotificationsOpen && currentUser?.role === 'platform_admin' ? (
  <aside style={styles.notificationPanel} aria-label="Panel de notificaciones">
    <div style={styles.panelHeaderCompact}>
      <h2 style={styles.panelTitle}>Pendientes de plataforma</h2>
      <button
        aria-label="Cerrar notificaciones"
        onClick={() => setIsNotificationsOpen(false)}
        style={styles.sidebarToggle}
        type="button"
      >
        X
      </button>
    </div>
    ...
  </aside>
) : null}
```

- [ ] **Step 4: Agrupar items por tipo**

Separar en listas:

```tsx
const signupNotifications = platformNotifications.filter((item) => item.kind === 'signup');
const changeNotifications = platformNotifications.filter((item) => item.kind === 'change_request');
const membershipNotifications = platformNotifications.filter((item) => item.kind === 'membership');
```

Y renderizar una seccion solo si tiene items:

```tsx
{signupNotifications.length > 0 ? (
  <section style={styles.notificationSection}>
    <strong>Altas pendientes</strong>
    ...
  </section>
) : null}
```

- [ ] **Step 5: Agregar CTA y navegacion**

Crear un helper:

```tsx
function openPlatformNotifications() {
  setActiveView('platform');
  setIsNotificationsOpen(false);
}
```

Y usarlo en cada CTA:

```tsx
<button onClick={openPlatformNotifications} style={styles.linkButton} type="button">
  {item.actionLabel}
</button>
```

- [ ] **Step 6: Añadir estilos minimos**

Agregar estilos:

```tsx
notificationButton: {
  alignItems: 'center',
  background: 'var(--panel-bg)',
  border: '1px solid var(--border)',
  borderRadius: '999px',
  color: 'var(--text)',
  cursor: 'pointer',
  display: 'inline-flex',
  gap: '8px',
  minHeight: '40px',
  padding: '8px 12px',
  position: 'relative',
},
notificationBadge: {
  alignItems: 'center',
  background: 'var(--accent)',
  borderRadius: '999px',
  color: 'var(--accent-contrast)',
  display: 'inline-flex',
  fontSize: '12px',
  fontWeight: 800,
  justifyContent: 'center',
  minWidth: '22px',
  padding: '2px 6px',
},
notificationPanel: {
  background: 'var(--panel-bg)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  display: 'grid',
  gap: '14px',
  marginBottom: '18px',
  padding: '16px',
},
notificationSection: {
  display: 'grid',
  gap: '10px',
},
notificationItem: {
  background: 'var(--panel-subtle)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  display: 'grid',
  gap: '6px',
  padding: '12px',
},
```

- [ ] **Step 7: Ejecutar tests focalizados**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected:

- los tests de notificaciones pasan

- [ ] **Step 8: Commit**

```powershell
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Add superadmin notifications panel"
```

## Task 4: Validacion final del frontend

**Files:**
- Modify: none
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Ejecutar validacion completa**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run test:run
npm.cmd run build
```

Expected:

- typecheck OK
- tests OK
- build OK

- [ ] **Step 2: Verificacion manual**

Checklist:

- `platform_admin` ve la campana en desktop
- `platform_admin` ve la campana en mobile
- el badge suma items y no grupos
- el panel lista solo pendientes reales
- el CTA cierra panel y lleva a `Plataforma`
- usuario empresa no ve campana

- [ ] **Step 3: Commit final**

```powershell
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Finish superadmin notifications block 2"
```

## Self-Review

- **Spec coverage:** el plan cubre campana exclusiva del `platform_admin`, contador total, panel lateral, agrupacion por tipo, CTA, comportamiento mobile y exclusion de estados no accionables.
- **Placeholder scan:** no quedan `TBD`, `TODO` ni referencias vagas; cada tarea incluye rutas, snippets y comandos.
- **Type consistency:** el plan usa consistentemente `PlatformNotification`, `pendingNotificationCount`, `isNotificationsOpen` y `activeView = 'platform'`.
