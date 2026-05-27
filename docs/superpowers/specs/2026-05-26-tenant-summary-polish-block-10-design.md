# Tenant Summary Polish Block 10

## Goal

Bring the tenant `Resumen` view up to the same UX level as the rest of the tenant workspace.

The current summary works, but it still reads as an older surface compared with the more recent `Clientes`, `Presupuestos`, and `Tesoreria` modules.

## Scope

Keep the current summary role:

- KPI overview
- service snapshot
- recent quote activity

No backend changes or new business rules are introduced.

## Adjustments

- improve the framing of the summary panels
- make recent quotes easier to scan
- surface a lightweight `Atencion inmediata` block for issued quotes
- keep one clear primary action: create a new quote

## Panel direction

Recommended sections:

- KPI cards
- `Servicios activos`
- `Presupuestos recientes`
- `Atencion inmediata`

## Interaction direction

The summary should not become a full operating module.

Allowed:

- open a recent quote directly
- start a new quote

Not needed:

- extra filters
- additional nested navigation

## UX constraints

- low risk
- keep responsive behavior simple
- do not duplicate treasury in full; only expose the most urgent pending items

## Out of scope

- quote workflow changes
- service catalog redesign
- dashboard route changes
