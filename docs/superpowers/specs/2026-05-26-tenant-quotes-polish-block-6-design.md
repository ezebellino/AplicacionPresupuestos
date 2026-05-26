# Tenant Quotes Polish Block 6

## Goal

Improve the day-to-day usability of the tenant `Presupuestos` module without changing its core workflow.

This block focuses on visual hierarchy, spacing, readability, and better action clarity.

## Scope

The existing structure remains:

- `Listado`
- `Editor`

No new business logic or new quote lifecycle rules are introduced in this block.

## Listado

The list should become easier to scan quickly.

Priority hierarchy per record:

- quote number
- client
- status
- total
- secondary date/title context

Adjustments:

- stronger separation between primary and secondary text
- cleaner spacing between left and right content
- reduce visual noise while keeping each card obviously clickable

## Editor

The editor remains fully expanded.

Sections remain visible in sequence:

1. `Cliente`
2. `Datos del presupuesto`
3. `Items de cobro`
4. `Totales y acciones`

Polish goals:

- improve section hierarchy
- normalize internal spacing
- make repeated actions easier to spot
- keep desktop and intermediate resolutions balanced

## Catalog and items

The service catalog should feel like a fast-pick operational area.

Adjustments:

- clearer distinction between catalog search, available services, and selected items
- better grouping between catalog cards and added quote items
- avoid visual flattening when many items are visible

## Actions and microcopy

Review visible labels and action density.

Allowed:

- better wording for headings and helper text
- replacing obvious repeated actions with icon + native `title`

Recommended icon-only candidates:

- PDF
- WhatsApp
- remove quote item
- open client

Keep text visible for primary or decision-based actions:

- `Crear borrador`
- `Emitir`
- `Aceptar`
- `Rechazar`

## UX constraints

- no collapse-heavy interaction
- no extra navigation layers
- no reduced clarity in the name of a cleaner look
- preserve responsive behavior across desktop and narrower widths

## Out of scope

- status workflow changes
- quote calculation changes
- backend changes
- treasury or client module redesigns outside quote-related surfaces
