# Platform Signups Polish - Block 13

## Objective

Improve the `Plataforma > Solicitudes` experience for `platform_admin` without changing the signup workflow.

## Focus

- Stronger hierarchy for pending signup requests
- Cleaner separation between company identity, contact data, and operational status
- Better readability of resolved signup history
- More stable responsive behavior for actions

## Pending View

- Each request should read as an operational card
- Surface:
  - company name
  - contact name
  - email
  - phone
  - business type when present
  - signup status
- Message stays secondary
- Main actions remain:
  - `Crear cuenta`
  - `Contactada`
  - `Rechazar`

## History View

- Resolved requests should use the same card language as pending requests
- Surface:
  - company
  - contact data
  - final status
  - review note when present
  - created admin email when present

## Constraints

- No backend changes
- No signup flow changes
- No changes to other platform sections in this block
