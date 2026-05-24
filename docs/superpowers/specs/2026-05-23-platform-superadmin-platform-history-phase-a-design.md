# Platform Superadmin Platform History Phase A Design

## Contexto

La nueva vista `Plataforma` del `platform_admin` ya quedo reorganizada en subsecciones internas:

- `Resumen`
- `Solicitudes`
- `Cambios fiscales`
- `Membresias`

Esa estructura ordena mucho mejor la operatoria, pero todavia le falta un segundo nivel importante: distinguir claramente entre trabajo pendiente y registros historicos ya resueltos.

Hoy el criterio de producto aprobado es:

- operacion primero;
- historico secundario;
- no mezclar pendientes con estados cerrados en la vista principal.

## Objetivo

Agregar una capa `Pendientes / Historial` dentro de cada subseccion operativa de `Plataforma`, manteniendo el flujo diario limpio y agregando trazabilidad sin introducir cambios de backend.

## Alcance

Esta Fase A incluye:

- agregar selector interno `Pendientes / Historial` en:
  - `Solicitudes`
  - `Cambios fiscales`
  - `Membresias`
- mantener `Pendientes` como modo por defecto;
- mostrar historico dentro de la misma subseccion, sin overlays ni nuevas rutas;
- reutilizar datos ya disponibles en frontend.

Esta Fase A no incluye:

- edicion de pagos de membresia;
- anulacion o eliminacion de pagos;
- recalculo backend de vencimientos;
- endpoints nuevos;
- cambios de negocio en aprobacion, rechazo o cobro.

Eso quedara para una Fase B posterior.

## Regla De UX

Cada subseccion operativa de `Plataforma` debe abrir por defecto en `Pendientes`.

El usuario puede alternar a `Historial` dentro de la misma pantalla mediante un control liviano, idealmente tabs o segmented control pequeno.

No debe abrirse un modal, ni una pantalla aparte, ni una navegacion secundaria fuera de contexto.

## Solicitudes

### Pendientes

Se mantiene la vista actual de solicitudes accionables:

- `Crear cuenta`
- `Contactada`
- `Rechazar`

### Historial

Debe listar solicitudes ya resueltas o fuera de flujo diario, incluyendo como minimo:

- empresa;
- contacto;
- estado final;
- email o telefono si ya se usan hoy en el item;
- nota operativa o mensaje si existe.

En esta fase no se exige fecha de resolucion si el dato no esta claramente disponible en el payload actual.

## Cambios Fiscales

### Pendientes

Se mantiene la vista actual con:

- `Aprobar`
- `Rechazar`

### Historial

Debe listar cambios fiscales ya resueltos o fuera de flujo principal, incluyendo como minimo:

- empresa;
- campos propuestos;
- estado final;
- razon o nota si existe.

En esta fase no se exige metadata nueva que no venga en el contrato actual.

## Membresias

### Pendientes

Se mantiene la vista operativa actual con filtros:

- `Todas`
- `Vencidas`
- `Por vencer`
- `Activas`

Y con acciones actuales de cobro o envio.

### Historial

Debe enfocarse en historial de pagos registrados, no en historial abstracto de estados.

Cada item del historial debe mostrar, como minimo:

- empresa;
- fecha del pago;
- periodo (`Mensual`, `Trimestral`, `Semestral`, `Anual`);
- monto si existe;
- presupuesto asociado si existe.

En esta Fase A, el historial es solo de lectura.

## Reuso Tecnico

No se agregan endpoints nuevos.

La implementacion debe derivarse de los datos ya cargados en frontend:

- `signupRequests`
- `changeRequests`
- `memberships`
- `membership.payments`

La logica nueva es de presentacion, agrupado y filtrado.

## Cambios Esperados En Frontend

En `frontend/src/features/dashboard/DashboardPage.tsx`:

- agregar estado local para el modo `Pendientes / Historial` de cada subseccion;
- mostrar segmented controls internos;
- separar listas accionables de listas historicas;
- mantener el comportamiento responsive ya implementado.

No hace falta crear una nueva superficie mayor. Puede resolverse extendiendo `PlatformAdminView`.

## Responsive

La capa `Pendientes / Historial` debe:

- verse clara en desktop;
- seguir siendo usable en mobile;
- no agregar scroll horizontal innecesario;
- no duplicar controles en distintas partes de la pantalla.

## Testing

Se debe cubrir como minimo:

- que cada subseccion abra en `Pendientes`;
- que `Solicitudes` permita alternar a `Historial`;
- que `Cambios fiscales` permita alternar a `Historial`;
- que `Membresias` permita alternar a `Historial`;
- que `Historial` de `Membresias` muestre pagos registrados;
- que `Pendientes` siga mostrando solo items accionables.

## Riesgos

Los riesgos principales son:

- mezclar demasiado contenido en una misma subseccion;
- romper la legibilidad mobile;
- aparentar que el historial es editable cuando en esta fase no lo es.

La mitigacion es:

- mantener `Pendientes` como vista default;
- usar controles internos simples;
- dejar `Historial` claramente como vista secundaria de consulta.

## Resultado Esperado

El `platform_admin` debe poder trabajar lo urgente primero y, sin salir de contexto, consultar rapidamente el historico de solicitudes, cambios fiscales y pagos de membresias cuando necesite trazabilidad.
