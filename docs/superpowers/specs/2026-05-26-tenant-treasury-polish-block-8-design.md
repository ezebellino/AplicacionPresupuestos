# Tenant Treasury Polish Block 8

## Goal

Improve the day-to-day clarity of the tenant `Tesoreria` module without changing its underlying behavior.

This block focuses on hierarchy, spacing, movement readability, and cleaner actions for follow-up work.

## Scope

The existing structure remains:

- `Resumen`
- `Movimientos`
- `Cobros pendientes`

No new treasury rules or backend changes are introduced.

## Resumen

The summary should feel more operational and easier to scan quickly.

Adjustments:

- clearer framing between KPI cards and secondary summary content
- cleaner presentation of immediate attention items
- reduce the feeling of two unrelated panels side by side

## Movimientos

The movement list should become easier to read chronologically.

Priority hierarchy per row:

- client
- quote number and title context
- date
- status
- amount
- open action

Adjustments:

- clearer primary vs secondary text
- more compact repeated actions
- improve visual balance in desktop and narrower widths

## Cobros pendientes

This section should feel like a lightweight follow-up queue.

Adjustments:

- keep focus on issued quotes only
- make actions faster to spot
- reduce text-heavy buttons where the action is obvious

Good icon-only candidates:

- open quote
- WhatsApp
- PDF

## Actions and microcopy

Allowed:

- improve helper text and section subtitles
- use icon + native `title` for repeated secondary actions

Keep text visible for primary navigation and broader module actions.

## UX constraints

- no new subsections
- no workflow changes
- no analytical redesign of `Tesoreria inteligente`
- preserve responsive behavior

## Out of scope

- quote status changes
- PDF generation changes
- smart treasury logic changes
- cross-module navigation changes outside existing flows
