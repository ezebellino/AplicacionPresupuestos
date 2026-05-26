# Tenant Quotes Block 2

## Goal

Reorganize the `Presupuestos` experience for both tenant admins and platform admins so it is clearer, more consistent, and easier to use day to day without changing the core quote lifecycle already in production.

This block focuses on UX structure and interaction flow, not on introducing a new quote domain model.

## Scope

The `Presupuestos` module will be reorganized into two internal subsections:

- `Listado`
- `Editor`

The module opens by default in `Listado`.

## Module-level behavior

- A primary `Nuevo presupuesto` button remains fixed at the top of the module and visible at all times.
- Creating a new quote routes the user into `Editor` in creation mode.
- Selecting an existing quote from `Listado` routes the user into `Editor` in read/edit mode.
- There is no separate `Detalle` subsection; detail view is absorbed into `Editor`.

## Listado

Purpose: help users find, filter, and open quotes quickly.

Behavior:

- compact responsive list, not a rigid table
- search input
- filter by quote status
- newest-first ordering

Each quote row/card should show:

- quote number
- client
- status
- total
- date
- open action

The list should remain optimized for scanning rather than for inline execution of quote actions.

## Editor

Purpose: create, review, and update the selected quote in one consistent place.

The editor handles two modes:

- creation mode
- read/edit mode

Internal order of the editor:

1. `Cliente`
2. `Datos del presupuesto`
3. `Items de cobro`
4. `Totales y acciones`

## Items de cobro

The existing catalog-click interaction stays as the primary input model.

Reason:

- it matches the current mental model
- it is faster for repeated daily use
- it avoids unnecessary friction compared to a search-select-add flow

Required improvements:

- keep users inside the editor while adding multiple services
- allow adding several services in sequence without resetting context
- improve service block hierarchy and readability
- keep added items and totals visible and understandable

## Actions by quote state

Actions should be contextual, not always visible.

### Draft

- save changes
- issue quote
- remove items

### Issued

- accept
- reject
- PDF
- WhatsApp

### Accepted / Rejected

- read-only state
- PDF
- WhatsApp when applicable

## UX constraints

- keep the implementation safe for a production app already being used
- do not introduce unnecessary backend changes if the current quote APIs are enough
- keep the flow responsive and usable across desktop and smaller PC/mobile widths
- avoid mixing navigation concerns with editing concerns

## Out of scope

- new quote pricing rules
- changes to quote status rules
- changes to PDF engine behavior
- changes to treasury behavior
- changes to client history behavior
