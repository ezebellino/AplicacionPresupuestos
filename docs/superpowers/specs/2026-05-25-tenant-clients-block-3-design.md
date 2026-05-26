# Tenant Clients Block 3

## Goal

Reorganize the `Clientes` experience for tenant admins so it is clearer, faster to use, and more consistent with the newer UX patterns already introduced in `Empresa`, `Plataforma`, and `Presupuestos`.

This block focuses on structure and workflow. It does not introduce new tenant data contracts unless the current APIs are insufficient.

## Scope

The `Clientes` module will be reorganized into two internal subsections:

- `Listado`
- `Ficha`

The module opens by default in `Listado`.

## Listado

Purpose: help users find and open clients quickly, while keeping client creation easy.

Behavior:

- compact responsive list
- search input
- primary click on a client opens `Ficha`
- secondary compact actions may remain available where useful

Each client row/card should prioritize:

- name
- phone
- email when present
- document when present

## Primary action

`Nuevo cliente` remains a top-level action and should be visible at the module level.

Reason:

- client creation is a true primary action
- hiding it inside the list or inside the client detail would add friction
- this keeps the module consistent with `Presupuestos`

## Quick-create flow

`Nuevo cliente` opens a quick-create modal instead of navigating to a blank detail page.

The modal should request only the current required fields:

- name
- phone
- address

All other fields remain optional and can be completed later from the client record.

## Ficha

Purpose: provide one ordered place to work with the selected client after creation.

The client record integrates:

- client data
- service history
- quote history

The record uses internal subsections:

- `Datos`
- `Servicios`
- `Presupuestos`

It opens by default in `Datos`.

## UX constraints

- creation should stay fast and lightweight
- record review should stay separate from quick creation
- avoid a long mixed screen with form, list, and history all at once
- keep the behavior responsive and coherent across desktop and smaller widths

## Out of scope

- new client-side business rules
- new service history APIs
- new quote history APIs
- treasury changes
- deeper workflow redesigns outside the `Clientes` module
