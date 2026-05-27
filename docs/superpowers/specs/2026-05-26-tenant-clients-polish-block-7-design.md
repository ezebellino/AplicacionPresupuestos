# Tenant Clients Polish Block 7

## Goal

Improve the day-to-day readability and consistency of the tenant `Clientes` module without changing its core navigation model.

This block focuses on hierarchy, spacing, action clarity, and a cleaner handoff between quick client creation and the client record.

## Scope

The existing structure remains:

- `Listado`
- `Ficha`

The existing record sections remain:

- `Datos`
- `Servicios`
- `Presupuestos`

No backend or workflow changes are introduced in this block.

## Listado

The list should become easier to scan and feel more obviously operational.

Priority hierarchy per row:

- client name
- primary contact
- secondary context such as document or address
- quick actions

Adjustments:

- cleaner separation between identity, contact, and actions
- better spacing for compact responsive cards
- clearer reading when some optional fields are missing

## Quick create modal

The `Nuevo cliente` modal remains short.

Fields remain:

- `Nombre`
- `Telefono`
- `Direccion`

Polish goals:

- clearer helper text
- placeholders that reduce hesitation
- keep validation direct and minimal

## Ficha

The record remains split into:

1. `Datos`
2. `Servicios`
3. `Presupuestos`

Polish goals:

- stronger hierarchy inside each section
- clearer separation between summary and actions
- keep the view light enough for daily usage

## Actions and microcopy

Review visible labels and repeated actions.

Allowed:

- improve helper text and section subtitles
- use icon + native `title` where the action is already obvious

Good candidates:

- open quote
- edit client
- history
- delete

Keep text visible for primary actions:

- `Nuevo cliente`
- `Nuevo presupuesto`
- `Guardar cambios`

## UX constraints

- no new navigation layers
- no extra modal complexity
- keep the quick-create path fast
- preserve responsive behavior across desktop and narrower widths

## Out of scope

- client schema changes
- service record business rules
- quote workflow changes
- treasury redesign beyond existing cross-module navigation
