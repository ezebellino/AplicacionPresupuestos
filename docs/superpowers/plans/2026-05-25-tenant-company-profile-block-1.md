# Tenant Company Profile Block 1 Plan

1. Reorganize `CompanyProfileView` into internal subsections:
   - `Datos`
   - `Facturacion`
   - `Vista previa`

2. Keep all existing save flows and backend payloads unchanged.

3. Add responsive internal navigation:
   - desktop segmented tabs
   - compact selector on smaller layouts

4. Elevate logo handling inside `Datos`:
   - highlighted logo block
   - immediate preview
   - existing local upload and URL input preserved

5. Move billing-only settings into `Facturacion`:
   - IVA general
   - leyenda para facturas

6. Keep PDF preview isolated inside `Vista previa`.

7. Update dashboard tests for the new subsection structure.

8. Run focused frontend verification:
   - dashboard tests
   - typecheck
   - build
