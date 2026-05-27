# Platform Memberships Polish - Block 12

## Objective

Improve the `Plataforma > Membresias` experience for `platform_admin` without changing business rules.

## Focus

- Clearer visual hierarchy for active memberships
- Better separation between membership status, payment summary, and actions
- Less dense payment history
- More reliable responsive behavior

## Pending View

- Each membership should read as an operational card
- Header should surface:
  - company name
  - status
- Secondary metadata should surface:
  - due date
  - last payment
  - current fee
- Active payments should live in their own block
- Primary action remains `Registrar pago`
- WhatsApp and Email stay attached to the relevant active payment

## History View

- Each payment record should read as its own history card
- Surface:
  - company
  - payment date
  - period
  - amount
  - linked quote when present
  - cancel reason when cancelled
- Editing and cancelling remain available for active records

## Constraints

- No backend contract changes
- No membership business rule changes
- No changes to other platform sections in this block
