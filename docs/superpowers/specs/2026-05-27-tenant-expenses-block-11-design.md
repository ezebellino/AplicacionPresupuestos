# Tenant Treasury Expenses - Block 11

## Objective

Add a simple `Gastos` subsection inside `Tesoreria` for tenant users to track company expenses and investments without mixing them with client billing.

## Scope

- Add a new `Gastos` subsection inside `Tesoreria`
- Allow quick expense registration
- Allow optional category management from a modal
- Keep the workflow lightweight and operational

## UX Rules

- `Gastos` lives alongside:
  - `Resumen`
  - `Movimientos`
  - `Cobros pendientes`
- Creation date is automatic and not manually editable
- `Cliente` is optional
- `Categoria` is optional
- Status is limited to:
  - `Pendiente`
  - `Cobrado`

## Expense Fields

- `Monto` required
- `Detalle` required
- `Estado` required
- `Cliente` optional
- `Categoria` optional
- `Notas` optional

## Category Management

- Secondary action: `Administrar categorias`
- Opens a modal
- Allows creating simple categories for later selection

## Data Behavior

- Expenses are tenant-scoped
- Expenses are ordered by newest first
- Status changes can be updated after creation
- Categories can be deactivated without deleting historical expense records

## Out of Scope

- Supplier management
- Installment logic
- Due dates
- Smart treasury analytics impact beyond basic visibility
