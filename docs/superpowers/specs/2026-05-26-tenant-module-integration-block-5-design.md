# Tenant Module Integration Block 5

## Goal

Improve continuity between tenant-facing modules so users can move between `Clientes`, `Presupuestos`, and `Tesoreria` without losing context or repeating navigation steps.

## Scope

This block focuses on cross-module jumps for the tenant admin workflow.

Every jump must:

- change module automatically
- open the destination in the correct subsection
- preserve the relevant selected entity

## Cross-module flows

### 1. Client record quote history -> quote editor

From:
- `Clientes > Ficha > Presupuestos`

To:
- `Presupuestos > Editor`

Behavior:
- opening a quote from the client record should take the user directly to that quote in the editor

### 2. Client record -> new quote for that client

From:
- `Clientes > Ficha`

To:
- `Presupuestos > Editor`

Behavior:
- `Nuevo presupuesto` should open the quote creation flow
- the current client should already be preselected

### 3. Treasury -> quote editor

From:
- `Tesoreria > Movimientos`
- `Tesoreria > Cobros pendientes`

To:
- `Presupuestos > Editor`

Behavior:
- `Abrir presupuesto` should land directly in the editor for that quote

### 4. Quote editor -> client record

From:
- `Presupuestos > Editor`

To:
- `Clientes > Ficha > Datos`

Behavior:
- the user should be able to open the associated client from the selected quote

## UX constraints

- no extra confirmation dialogs for these jumps
- no intermediate neutral screen
- no need to manually re-open the correct subsection after navigation
- keep behavior responsive and consistent with the module workspace patterns already implemented

## Out of scope

- backend contract changes
- new data loading contracts unless current state handling is insufficient
- redesigning the internal content of `Clientes`, `Presupuestos`, or `Tesoreria` beyond navigation continuity
