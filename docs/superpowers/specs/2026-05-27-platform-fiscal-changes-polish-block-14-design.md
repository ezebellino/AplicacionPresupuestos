# Platform Fiscal Changes Polish - Block 14

## Objective

Improve the `Plataforma > Cambios fiscales` experience for `platform_admin` without changing the approval flow.

## Focus

- Better hierarchy for pending fiscal change requests
- Cleaner grouping of requested fields
- Better readability of history cards
- More stable responsive action layout

## Pending View

- Each request should read as an operational card
- Surface:
  - current company name
  - proposed company data as individual facts
  - request status
  - reason when present
- Main actions remain:
  - `Aprobar`
  - `Rechazar`

## History View

- Resolved requests should use the same card structure
- Surface:
  - current company name
  - proposed company data
  - final status
  - reason when present

## Constraints

- No backend changes
- No approval rule changes
- No changes to other platform sections in this block
