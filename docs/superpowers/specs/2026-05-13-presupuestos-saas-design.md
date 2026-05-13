# Presupuestos SaaS Design

## Contexto

El proyecto nace del documento `Plan_Desarrollo_Subagentes.pdf`, que define una app de presupuestos para climatizacion basada en Clean Architecture, FastAPI, PostgreSQL, Alembic, JWT, React, Tailwind, Shadcn UI, generacion de PDFs y alertas con SweetAlert2.

El objetivo aprobado es construir un MVP funcional pensado como SaaS multitenant: cada empresa usa el servicio de forma aislada, con su propio usuario admin, clientes, catalogo de costos, presupuestos y documentos.

## Alcance Del MVP

El MVP incluye:

- Alta manual de empresas y su usuario admin.
- Login JWT para usuarios admin.
- Aislamiento multitenant por `tenant_id`.
- CRUD de clientes por empresa.
- Catalogo de costos editable por empresa.
- Categorias fijas de costos: equipos, materiales, mano de obra y servicios.
- IVA general por empresa, con override por costo e item de presupuesto.
- Creacion y edicion de presupuestos.
- Estados de presupuesto: borrador, emitido, aceptado y rechazado.
- Generacion de PDF de presupuesto.
- Frontend funcional con React, Tailwind y Shadcn UI.
- Docker para desarrollo local y portabilidad a Railway/Proxmox.

Quedan fuera del MVP inicial:

- Registro publico de empresas.
- Pagos, planes y billing.
- Roles avanzados.
- Invitaciones de usuarios.
- Firma digital.
- Envio automatico de emails.
- Stock o inventario.
- Integraciones contables.

## Principios De Producto

La aplicacion debe priorizar el flujo operativo:

1. La empresa inicia sesion.
2. Carga clientes.
3. Carga o actualiza su catalogo de costos.
4. Crea un presupuesto para un cliente.
5. Agrega items desde el catalogo, ajusta cantidades, IVA y valores si hace falta.
6. Emite el presupuesto.
7. Genera un PDF.
8. Marca el presupuesto como aceptado o rechazado cuando corresponda.

El catalogo debe acelerar la carga, pero no bloquear ajustes puntuales. Los presupuestos emitidos deben conservar su historico aunque el catalogo cambie despues.

## Arquitectura General

Se usara un monorepo con dos aplicaciones principales:

- `backend`: FastAPI, SQLAlchemy, Alembic, PostgreSQL, JWT y generacion PDF.
- `frontend`: React + Vite, Tailwind, Shadcn UI y SweetAlert2.

La arquitectura del backend sigue capas:

- `domain`: entidades, enums y reglas puras de negocio.
- `services`: casos de uso, calculo de presupuestos y validaciones de aplicacion.
- `infra`: base de datos, repositorios, hashing, JWT, PDF y storage.
- `api`: rutas FastAPI, dependencias, schemas Pydantic y manejo HTTP.

El frontend se organiza por features:

- `auth`
- `dashboard`
- `clients`
- `costs`
- `quotes`
- `shared`

## Modelo Multitenant

La entidad principal es `Tenant`, que representa una empresa cliente del SaaS.

Cada usuario pertenece a un tenant. En el MVP solo existe el rol `admin`, pero el modelo debe dejar espacio para roles futuros.

El JWT debe incluir:

- `sub`: user id.
- `tenant_id`: empresa activa.
- `email`: email del usuario.
- `role`: `admin`.
- `exp`: expiracion.

Todas las consultas y mutaciones de negocio deben filtrar por `tenant_id`. Esto aplica a:

- clientes;
- costos;
- presupuestos;
- items de presupuesto;
- PDFs o metadata de documentos.

No debe existir endpoint de negocio que reciba `tenant_id` desde el frontend para operar datos. El backend debe obtenerlo desde el usuario autenticado.

## Alta Manual De Empresas

El MVP no tendra registro publico. La creacion de empresas se resolvera con una herramienta interna, como un comando seed o endpoint protegido para desarrollo/admin.

El alta manual debe crear:

- tenant;
- usuario admin;
- configuracion fiscal inicial, incluyendo IVA general por defecto.

Esta decision reduce superficie de seguridad y permite validar el producto sin implementar onboarding publico, verificacion de email, proteccion anti-abuso, pagos ni terminos legales.

## Entidades Principales

### Tenant

Campos esperados:

- `id`
- `name`
- `legal_name`
- `tax_id`
- `default_tax_rate`
- `created_at`
- `updated_at`

### User

Campos esperados:

- `id`
- `tenant_id`
- `email`
- `password_hash`
- `role`
- `is_active`
- `created_at`
- `updated_at`

### Client

Campos esperados:

- `id`
- `tenant_id`
- `name`
- `document`
- `email`
- `phone`
- `address`
- `notes`
- `created_at`
- `updated_at`

### CostItem

Campos esperados:

- `id`
- `tenant_id`
- `category`: `equipment`, `materials`, `labor`, `services`
- `name`
- `description`
- `unit`
- `unit_cost`
- `tax_rate`
- `is_active`
- `created_at`
- `updated_at`

Si `tax_rate` esta vacio, el sistema usa `Tenant.default_tax_rate`.

### Quote

Campos esperados:

- `id`
- `tenant_id`
- `client_id`
- `number`
- `status`: `draft`, `issued`, `accepted`, `rejected`
- `title`
- `notes`
- `valid_until`
- `subtotal`
- `tax_total`
- `discount_total`
- `total`
- `issued_at`
- `created_at`
- `updated_at`

### QuoteItem

Campos esperados:

- `id`
- `tenant_id`
- `quote_id`
- `source_cost_item_id`
- `category`
- `name`
- `description`
- `unit`
- `quantity`
- `unit_price`
- `tax_rate`
- `discount_amount`
- `line_subtotal`
- `line_tax`
- `line_total`
- `position`

Los campos `category`, `name`, `description`, `unit`, `unit_price` y `tax_rate` se copian desde el costo al momento de agregarlo al presupuesto. Cambios posteriores en `CostItem` no deben modificar presupuestos existentes.

## Reglas De Calculo

Para cada item:

- `line_subtotal = quantity * unit_price`
- `line_tax = (line_subtotal - discount_amount) * tax_rate / 100`
- `line_total = line_subtotal - discount_amount + line_tax`

Para el presupuesto:

- `subtotal = suma(line_subtotal)`
- `discount_total = suma(discount_amount)`
- `tax_total = suma(line_tax)`
- `total = suma(line_total)`

Los valores monetarios deben manejarse con decimal, no float.

## Estados De Presupuesto

Los estados validos son:

- `draft`: editable.
- `issued`: emitido y listo para PDF final.
- `accepted`: aceptado por el cliente.
- `rejected`: rechazado por el cliente.

Reglas:

- Un presupuesto `draft` puede editarse libremente.
- Al pasar a `issued`, se setea `issued_at` si no existe.
- `accepted` y `rejected` representan cierre comercial.
- En el MVP, no se requiere auditoria completa de transiciones, pero las transiciones deben validarse en backend.

## API Esperada

Endpoints principales:

- `POST /auth/login`
- `GET /auth/me`
- `POST /admin/tenants` o comando equivalente para alta manual.
- `GET /clients`
- `POST /clients`
- `GET /clients/{id}`
- `PATCH /clients/{id}`
- `DELETE /clients/{id}`
- `GET /cost-items`
- `POST /cost-items`
- `PATCH /cost-items/{id}`
- `DELETE /cost-items/{id}` o desactivacion logica.
- `GET /quotes`
- `POST /quotes`
- `GET /quotes/{id}`
- `PATCH /quotes/{id}`
- `POST /quotes/{id}/items`
- `PATCH /quotes/{id}/items/{item_id}`
- `DELETE /quotes/{id}/items/{item_id}`
- `POST /quotes/{id}/issue`
- `POST /quotes/{id}/accept`
- `POST /quotes/{id}/reject`
- `GET /quotes/{id}/pdf`

Todos los endpoints de negocio requieren autenticacion.

## Frontend

Pantallas del MVP:

- Login.
- Dashboard inicial con resumen simple.
- Clientes: listado, busqueda simple, alta, edicion.
- Costos: listado por categoria, alta, edicion, activacion/desactivacion.
- Presupuestos: listado por estado, alta, edicion.
- Editor de presupuesto: cliente, datos generales, items, totales, cambio de estado y PDF.

La UI debe sentirse como una herramienta operativa de SaaS: densa, clara y sin enfoque de landing page. Las pantallas deben priorizar tablas, formularios claros, estados visibles y acciones directas.

## PDF

El PDF debe incluir:

- datos de la empresa;
- datos del cliente;
- numero y fecha de presupuesto;
- estado o condicion de emision;
- detalle de items;
- subtotal, descuentos, IVA y total;
- notas y validez si aplica.

El PDF debe generarse desde backend. En el MVP puede generarse bajo demanda y devolverse como descarga. El almacenamiento persistente de PDFs puede quedar preparado para Proxmox o storage S3-compatible, pero no debe bloquear el flujo inicial.

## Infraestructura Y Despliegue

La estrategia aprobada es portable:

- Railway como produccion inicial recomendada.
- Proxmox como staging, backups, almacenamiento de PDFs y posible produccion self-hosted futura.
- Docker Compose para desarrollo local.

Uso recomendado del hardware Proxmox:

- SSD: PostgreSQL, backend, servicios activos y Redis futuro si hiciera falta.
- HDD 2 TB: PDFs, exports, snapshots y backups.

Debe contemplarse backup externo adicional. Proxmox no reemplaza una copia fuera del servidor.

## Testing

Backend:

- auth y JWT;
- aislamiento por tenant;
- CRUD de clientes por tenant;
- catalogo de costos por tenant;
- calculo decimal de presupuestos;
- copia historica de datos desde costo hacia item;
- transiciones de estado.

Frontend:

- login;
- render de listados principales;
- flujo basico de creacion de presupuesto;
- feedback de errores y confirmaciones.

## Riesgos Y Decisiones

Riesgos principales:

- Filtrado multitenant incompleto.
- Calculos monetarios con float.
- PDFs generados con datos inconsistentes.
- Alcance excesivo por intentar billing/onboarding publico demasiado pronto.

Decisiones tomadas:

- Alta manual de empresas para el MVP.
- Un solo rol admin.
- Catalogo por empresa con categorias fijas.
- IVA default por empresa y override por costo/item.
- Presupuestos con estados comerciales completos.
- Railway primero, Proxmox como apoyo y ruta self-hosted.

## Criterios De Aceptacion

El MVP se considera funcional cuando:

- Se puede crear una empresa y usuario admin manualmente.
- El admin puede iniciar sesion.
- Los datos quedan aislados por empresa.
- El admin puede crear clientes.
- El admin puede crear y editar costos por categoria.
- El admin puede crear presupuestos con items del catalogo.
- El sistema calcula subtotal, IVA, descuentos y total con decimal.
- Cambiar un costo no modifica presupuestos ya creados.
- El presupuesto puede pasar por `draft`, `issued`, `accepted` y `rejected`.
- El sistema genera un PDF descargable.
- La app corre localmente con Docker Compose.
- La estructura queda preparada para Railway y Proxmox.
