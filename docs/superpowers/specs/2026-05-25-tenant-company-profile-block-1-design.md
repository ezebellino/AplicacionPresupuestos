# Tenant Company Profile Block 1

## Goal

Improve the `Empresa` experience for the tenant admin role without changing core business flows already in production.

This block focuses on structure, clarity, and consistency. It does not change authentication, tenancy rules, or PDF generation contracts.

## Scope

The `Empresa` view will be reorganized into internal subsections:

- `Datos`
- `Facturacion`
- `Vista previa`

The section opens by default on `Datos`.

## Navigation behavior

- Desktop: visible segmented tabs inside the `Empresa` module
- Compact/mobile layouts: a single compact selector for the subsection

This should match the interaction pattern already used in the `Plataforma` workspace so the product remains consistent across roles.

## Section details

### Datos

Purpose: manage institutional identity and contact details.

Contents:

- highlighted logo block at the top
- immediate preview of the uploaded logo
- company name
- razon social
- CUIT
- direccion
- telefono
- email
- web

Behavior:

- logo is treated as a primary identity block, not as a normal input row
- data fields remain straightforward and editable in one place

### Facturacion

Purpose: manage information that affects the generated invoice/quote output.

Contents:

- default IVA
- invoice notes

Behavior:

- only billing-related settings live here
- avoid mixing institutional profile fields with tax/display rules

### Vista previa

Purpose: validate the output with the current company branding and billing settings.

Contents:

- isolated PDF preview

Behavior:

- preview should be visually separated from editing forms
- tenant admin should be able to verify branding and billing output without scanning the full form

## UX constraints

- keep the flow simple and stable for a production app already in use
- do not introduce backend changes unless existing payloads are insufficient
- preserve current save behavior unless a safer improvement is required
- prioritize responsive desktop/tablet behavior first, while keeping compact layouts usable

## Out of scope

- redesign of `Presupuestos`
- redesign of `Clientes`
- redesign of `Tesoreria`
- new fiscal approval workflows
- new PDF engine behavior
