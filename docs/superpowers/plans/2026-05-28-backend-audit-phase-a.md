# Backend Audit Phase A

## Objetivo

Agregar auditoria persistente de acciones criticas en backend, sin exponer todavia un panel de consulta.

## Alcance

1. Crear tabla `audit_events`.
2. Agregar `audit_service` para escribir eventos estructurados.
3. Integrar escritura en:
   - login exitoso
   - clientes
   - catalogo de servicios
   - gastos y categorias
   - presupuestos
   - tenant profile
   - solicitudes y acciones de plataforma
4. Cubrir con tests backend representativos.

## Fuera de alcance

- filtros y lectura de eventos por API
- panel visual de auditoria
- telemetria tecnica o trazas de infraestructura
