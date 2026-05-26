## Tenant Clients Block 3 Plan

1. Reorganize `Clientes` into internal sections:
   - `Listado`
   - `Ficha`

2. Add a quick-create entrypoint:
   - visible `Nuevo cliente` action at module level
   - modal with only `nombre`, `telefono`, `direccion`

3. Move client follow-up into `Ficha`:
   - `Datos`
   - `Servicios`
   - `Presupuestos`

4. Reuse existing client, quote, and service-record APIs:
   - no backend contract changes in this block

5. Update frontend tests to reflect:
   - `Listado` as default
   - `Ficha` opening from client actions
   - service history and quote history inside the record
