# Superadmin Profile Block 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurar una superficie propia de `Perfil` para `platform_admin`, accesible desde una barra superior derecha, reutilizando la vista existente de empresa sin afectar el flujo del rol empresa.

**Architecture:** La implementacion se resuelve enteramente en el frontend sobre `DashboardPage.tsx`, reutilizando `CompanyProfileView` y el estado existente de `TenantProfile`. La navegacion del `platform_admin` se divide entre sidebar operativo y acciones de cuenta en topbar, con una variante de copy para la vista `company`.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, SweetAlert2.

---

## File Structure

- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
  - agregar accion `Perfil` en topbar exclusiva para `platform_admin`
  - ajustar reglas de navegacion desktop/mobile
  - pasar contexto de rol a `CompanyProfileView`
  - adaptar copy de la vista de perfil
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`
  - cubrir acceso desktop/mobile a `Perfil`
  - cubrir que el usuario empresa conserva `Empresa`
  - cubrir que `platform_admin` abre la vista completa de perfil

## Task 1: Cubrir el acceso de `Perfil` para `platform_admin`

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.test.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Escribir el test fallido para desktop**

Agregar un caso que mockee `getCurrentUser()` con `role: 'platform_admin'` y verifique que:

- no exista boton lateral `Empresa`
- exista boton de topbar `Perfil`
- al hacer click abra la vista completa

```tsx
it('shows a topbar Perfil action for platform admins', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  expect(screen.queryByRole('button', { name: 'Empresa' })).not.toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Perfil' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Perfil' }));

  expect(await screen.findByRole('heading', { name: 'Perfil de plataforma' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Escribir el test fallido para mobile**

Agregar un caso con viewport compacto que verifique que el `platform_admin` vea `Perfil` dentro del menu movil.

```tsx
it('includes Perfil in the mobile drawer for platform admins', async () => {
  const user = userEvent.setup();
  setViewportWidth(390);
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
  const mobileMenu = screen.getByLabelText('Menu movil');

  expect(within(mobileMenu).getByRole('button', { name: 'Perfil' })).toBeInTheDocument();
});
```

- [ ] **Step 3: Ejecutar solo esos tests para confirmar que fallan**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected:

- fallan los tests nuevos porque hoy `platform_admin` no recibe acceso `Perfil`

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Add failing tests for superadmin profile access"
```

## Task 2: Separar navegacion operativa y acciones de cuenta del `platform_admin`

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Implementar el modelo minimo de acciones de topbar**

En `DashboardPage.tsx`, mantener `navigationItems` para operacion y agregar una coleccion separada para acciones de cuenta del `platform_admin`.

```tsx
const navigationItems: Array<{ label: string; view: View }> = [
  { label: 'Resumen', view: 'summary' },
  { label: 'Clientes', view: 'clients' },
  { label: 'Servicios', view: 'costs' },
  { label: 'Presupuestos', view: 'quotes' },
  { label: 'Tesoreria', view: 'treasury' },
];

if (currentUser?.role === 'platform_admin') {
  navigationItems.push({ label: 'Plataforma', view: 'platform' });
} else {
  navigationItems.push({ label: 'Empresa', view: 'company' });
}

const platformAccountActions =
  currentUser?.role === 'platform_admin'
    ? [{ label: 'Perfil', view: 'company' as View }]
    : [];
```

- [ ] **Step 2: Renderizar `Perfil` en la topbar desktop**

Agregar el boton dentro de `styles.topbarActions`, antes del toggle de tema y de `Salir`.

```tsx
{platformAccountActions.map((item) => (
  <button
    key={item.view}
    onClick={() => goToView(item.view)}
    style={activeView === item.view ? styles.secondaryButtonActive : styles.secondaryButton}
    type="button"
  >
    {item.label}
  </button>
))}
```

Si `secondaryButtonActive` no existe, crear una variante basada en el estilo actual de boton secundario para mostrar estado activo sin introducir un componente nuevo.

- [ ] **Step 3: Incluir `Perfil` en el drawer mobile solo para `platform_admin`**

Mantener el filtro actual de items secundarios, pero sumar `Perfil` como accion exclusiva de mobile para `platform_admin`.

```tsx
const mobileDrawerNavigationItems = navigationItems.filter((item) =>
  ['costs', 'company', 'platform'].includes(item.view),
);

const mobileDrawerAccountItems =
  currentUser?.role === 'platform_admin'
    ? [{ label: 'Perfil', view: 'company' as View }]
    : [];
```

Y renderizar ambos grupos dentro del drawer:

```tsx
{mobileDrawerAccountItems.map((item) => (
  <button
    key={item.view}
    onClick={() => goToView(item.view)}
    style={{ ...navStyle(activeView === item.view), ...styles.mobileDrawerNavButton }}
    type="button"
  >
    {item.label}
  </button>
))}
```

- [ ] **Step 4: Ejecutar tests del dashboard**

Run:

```powershell
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected:

- los tests de navegacion ya pasan
- pueden fallar todavia los de copy de perfil hasta adaptar `CompanyProfileView`

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Expose superadmin profile entrypoint"
```

## Task 3: Adaptar `CompanyProfileView` al modo plataforma

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Escribir o ajustar tests de copy**

Cubrir que:

- usuario empresa siga viendo `Perfil de empresa`
- `platform_admin` vea `Perfil de plataforma`

```tsx
it('renders platform-specific profile copy for platform admins', async () => {
  const user = userEvent.setup();
  mockPlatformAdminSession();

  render(<DashboardPage onLogout={vi.fn()} />);
  await user.click(await screen.findByRole('button', { name: 'Perfil' }));

  expect(await screen.findByRole('heading', { name: 'Perfil de plataforma' })).toBeInTheDocument();
  expect(screen.getByText(/datos institucionales de factureasy/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Agregar prop de modo a `CompanyProfileView`**

Extender la firma de `CompanyProfileView` con un prop explicito, por ejemplo:

```tsx
function CompanyProfileView({
  form,
  isSaving,
  legalChangeForm,
  mode,
  onFormChange,
  onLegalChangeFormChange,
  onLegalChangeSubmit,
  onSubmit,
  requests,
}: {
  form: CompanyProfileForm;
  isSaving: boolean;
  legalChangeForm: TenantLegalChangeForm;
  mode: 'tenant' | 'platform';
  onFormChange: (next: CompanyProfileForm) => void;
  onLegalChangeFormChange: (next: TenantLegalChangeForm) => void;
  onLegalChangeSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  requests: TenantChangeRequest[];
}) {
```

- [ ] **Step 3: Ajustar titulo, subtitulo y bloques visibles**

Usar `mode` para cambiar copy sin duplicar markup:

```tsx
const isPlatformProfile = mode === 'platform';
const profileTitle = isPlatformProfile ? 'Perfil de plataforma' : 'Perfil de empresa';
const profileSubtitle = isPlatformProfile
  ? 'Datos institucionales de FacturEasy para facturacion, branding y vista previa.'
  : 'Datos visibles para facturas, PDF y comunicaciones con clientes.';
```

Si el bloque `Solicitar cambio fiscal` no aplica al `platform_admin`, ocultarlo en modo plataforma:

```tsx
{isPlatformProfile ? null : (
  <section style={styles.tablePanel} aria-labelledby="legal-change-title">
    ...
  </section>
)}
```

Mantener preview PDF, logo, web, telefono, direccion, email y notas en ambos modos.

- [ ] **Step 4: Pasar `mode` desde `DashboardPage`**

```tsx
<CompanyProfileView
  form={companyProfileForm}
  isSaving={isSaving}
  legalChangeForm={tenantLegalChangeForm}
  mode={currentUser?.role === 'platform_admin' ? 'platform' : 'tenant'}
  onFormChange={setCompanyProfileForm}
  onLegalChangeFormChange={setTenantLegalChangeForm}
  onLegalChangeSubmit={handleTenantLegalChangeSubmit}
  onSubmit={handleCompanyProfileSubmit}
  requests={tenantChangeRequests}
/>
```

- [ ] **Step 5: Ejecutar typecheck y tests**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected:

- ambos comandos pasan

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Adapt company profile view for superadmin"
```

## Task 4: Verificacion final y control de regresion

**Files:**
- Modify: none
- Test: `frontend/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Ejecutar validacion completa del frontend**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run test:run
npm.cmd run build
```

Expected:

- typecheck OK
- suite frontend OK
- build OK

- [ ] **Step 2: Verificar manualmente la navegacion esperada**

Checklist manual en browser local o deploy preview:

- `platform_admin` ve `Perfil` arriba a la derecha en desktop
- `platform_admin` no ve `Empresa` en sidebar
- `platform_admin` puede abrir `Perfil` y editar logo/web/contacto
- usuario empresa sigue viendo `Empresa` en su flujo actual
- en mobile, `platform_admin` encuentra `Perfil` en el menu hamburguesa

- [ ] **Step 3: Commit final**

```powershell
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/features/dashboard/DashboardPage.test.tsx
git commit -m "Finish superadmin profile block 1"
```

## Self-Review

- **Spec coverage:** el plan cubre barra superior exclusiva del `platform_admin`, vista completa de `Perfil`, reuso de `CompanyProfileView`, copy especifico de plataforma y soporte mobile. No cubre notificaciones ni rediseño amplio, de acuerdo con la spec.
- **Placeholder scan:** no quedan `TODO`, `TBD` ni referencias vagas; cada tarea incluye archivos, comandos y snippets.
- **Type consistency:** el plan usa consistentemente `View = 'company'` para la entrada de perfil, `mode = 'tenant' | 'platform'` para la variante de vista, y mantiene `CompanyProfileView` como unidad reutilizada.
