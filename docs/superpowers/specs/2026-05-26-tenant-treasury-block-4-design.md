# Tenant Treasury Block 4

## Goal

Reorganize the tenant `Tesoreria` module into a clearer operational workspace focused on daily follow-up, collections, and quote-derived movement visibility.

This block prioritizes practical cashflow follow-up over broader analytics.

## Scope

The `Tesoreria` module will be reorganized into three internal subsections:

- `Resumen`
- `Movimientos`
- `Cobros pendientes`

The module opens by default in `Resumen`.

## Data source

`Tesoreria` remains tenant-scoped and derives its operational information from tenant quotes only.

Included:
- accepted quotes
- issued quotes
- rejected quotes

Excluded:
- draft quotes from collections follow-up
- platform memberships
- platform-level administrative records

## Resumen

Purpose: provide a quick operational view of current treasury state.

The summary should prioritize:

- `Facturado aceptado`
- `Pendiente emitido`
- `Rechazado`
- `Total de presupuestos`
- `Mes actual`

It should also include a short attention block focused only on unresolved issued quotes.

## Movimientos

Purpose: provide a compact chronological ledger of quote-derived business movements.

Behavior:

- most recent first
- compact responsive list
- quick filters:
  - `Todos`
  - `Aceptados`
  - `Emitidos`
  - `Rechazados`

Each movement should prioritize:

- date
- client
- quote number
- status
- total

## Cobros pendientes

Purpose: keep follow-up focused on real collection opportunities.

This subsection must include only quotes in `issued` status.

Each item should show:

- client
- quote number
- issued date
- total

Actions:

- `Abrir presupuesto`
- `WhatsApp`
- `PDF`

## Navigation rule

`Abrir presupuesto` must navigate into `Presupuestos` and open the selected quote in `Editor`.

## UX constraints

- keep the module operational, not overly analytical
- avoid mixing editing flows directly into treasury
- keep desktop and smaller-width layouts coherent
- prefer fast scanning and direct follow-up actions

## Out of scope

- platform membership tracking
- manual treasury bookkeeping unrelated to quotes
- new backend contracts unless current frontend data proves insufficient
