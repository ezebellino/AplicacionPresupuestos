# Tenant Quotes Block 2 Plan

1. Reorganize `QuotesView` into internal subsections:
   - `Listado`
   - `Editor`

2. Keep the existing quote APIs, selection flow, and status transitions.

3. Keep `Nuevo presupuesto` fixed in the module header and route it into editor creation mode.

4. Upgrade `Listado` into a compact responsive list with:
   - search
   - status filter
   - newest-first ordering
   - client, total, date, and status visibility

5. Turn `Editor` into the single place for:
   - creating a draft
   - reading a quote
   - editing a draft

6. Structure the editor into:
   - cliente
   - datos del presupuesto
   - items de cobro
   - totales y acciones

7. Keep service catalog click-to-add behavior, but support repeated additions without leaving the editor.

8. Update dashboard tests and run focused frontend verification:
   - dashboard tests
   - typecheck
   - build
