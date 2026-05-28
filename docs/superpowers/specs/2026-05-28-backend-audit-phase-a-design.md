# Fase A - Auditoría backend

## Objetivo

Agregar una capa de auditoría funcional persistente para registrar acciones críticas de la aplicación sin depender de los logs técnicos de Railway.

Esta fase cubre:
- modelo de persistencia `audit_events`
- escritura de eventos desde backend
- alcance inicial sobre acciones críticas

Esta fase no cubre:
- panel visual de auditoría
- analytics
- búsquedas avanzadas
- exportación
- observabilidad técnica de infraestructura

## Problema

Railway sirve para logs de proceso, errores y despliegue, pero no para responder preguntas funcionales como:
- quién creó o eliminó un presupuesto
- quién aprobó un cambio fiscal
- cuándo se anuló un pago de membresía
- qué usuario modificó un cliente o un gasto

La aplicación necesita trazabilidad propia y persistente.

## Enfoque

La auditoría se implementa en backend como escritura explícita de eventos en los servicios de negocio.

No se apoya en:
- triggers de base de datos
- lectura de logs de contenedor
- reconstrucción posterior desde estados finales

## Modelo inicial

Tabla nueva: `audit_events`

Campos iniciales:
- `id`
- `created_at`
- `actor_user_id`
- `actor_email`
- `actor_role`
- `tenant_id`
- `entity_type`
- `entity_id`
- `action`
- `summary`
- `metadata_json`

## Reglas del modelo

- `tenant_id` puede ser `null` solo cuando el evento no pertenece a un tenant concreto
  - ejemplo: solicitud pública de alta SaaS
- `metadata_json` debe guardar contexto útil y legible, no snapshots enormes
- `summary` debe ser corto y entendible para futura lectura humana
- no se deben guardar secretos, tokens ni contraseñas

## Entidades iniciales

- `auth`
- `client`
- `client_service_record`
- `cost_item`
- `quote`
- `quote_item`
- `expense`
- `expense_category`
- `tenant_profile`
- `tenant_change_request`
- `tenant_signup_request`
- `membership_payment`

## Acciones iniciales

- `login_succeeded`
- `created`
- `updated`
- `deleted`
- `issued`
- `accepted`
- `rejected`
- `submitted`
- `approved`
- `contacted`
- `paid`
- `cancelled`

## Cobertura funcional fase A

### Tenant admin

- login exitoso
- crear / actualizar / eliminar cliente
- crear servicio realizado
- crear / actualizar / desactivar servicio
- crear presupuesto
- eliminar presupuestos seleccionados
- emitir / aceptar / rechazar presupuesto
- crear gasto
- cambiar estado de gasto
- crear categoría de gasto
- actualizar perfil / empresa
- enviar solicitud de cambio fiscal

### Platform admin

- aprobar / rechazar / marcar contactada solicitud de alta
- aprobar / rechazar cambio fiscal
- registrar pago de membresía
- editar pago de membresía
- anular pago de membresía

## Ubicación de escritura

La escritura debe vivir en backend, dentro de la capa `services`, junto a la lógica de negocio que produce el cambio.

No conviene escribir auditoría:
- en frontend
- solo en rutas FastAPI
- solo en ORM hooks globales

Razón:
- en `services` ya existe el contexto de negocio real
- permite registrar acciones compuestas con mejor `summary`
- mantiene una sola fuente de verdad

## API interna sugerida

Servicio nuevo:
- `app/services/audit_service.py`

Función base sugerida:
- `record_event(...)`

La API debe recibir explícitamente:
- usuario actor
- tenant
- entidad
- acción
- resumen
- metadata

## Resumen humano esperado

Ejemplos:
- `Cliente creado: DM Refrigeración`
- `Presupuesto emitido: Q-000006`
- `Solicitud aprobada: Frío Sur`
- `Pago de membresía anulado: FacturEasy Demo`

## Metadata esperada

Ejemplos por tipo:

### quote
- `number`
- `status`
- `client_id`
- `client_name`
- `total`

### client
- `name`
- `phone`
- `email`

### expense
- `amount`
- `detail`
- `status`
- `client_id` si existe

### membership_payment
- `paid_at`
- `months_covered`
- `amount`
- `quote_number` si existe

## Criterios de calidad

- sin romper contratos HTTP existentes
- sin cambiar comportamiento funcional visible
- con migración Alembic propia
- con tests backend focalizados
- con eventos legibles y consistentes

## Fase B

La siguiente fase, separada de esta, será:
- endpoint de consulta de auditoría
- vista para `platform_admin`
- filtros por fecha, usuario, tenant, entidad y acción
