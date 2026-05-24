# Platform Superadmin Platform View Design

## Contexto

La vista `Plataforma` del `platform_admin` ya concentra la operatoria principal del SaaS:

- solicitudes de alta;
- cambios fiscales;
- membresias de empresas cliente.

Hoy esa operatoria existe, pero esta presentada como una pantalla larga y acumulativa. A medida que el flujo de plataforma crece, esa forma empieza a degradar la experiencia: cuesta escanear, cuesta priorizar y cuesta operar desde mobile o resoluciones intermedias.

La necesidad no es sumar mas funcionalidad de backend en esta etapa. La necesidad es reorganizar la superficie actual para que el `superadmin` tenga un centro de control claro, rapido y orientado a accion.

## Objetivo

Redisenar la vista `Plataforma` del `platform_admin` para convertirla en un modulo organizado por subsecciones internas, con un resumen operativo inicial, contadores visibles y foco en pendientes reales.

## Alcance

Este bloque incluye:

- reemplazar la pagina larga actual por una vista con subsecciones internas;
- abrir `Plataforma` por defecto en `Resumen`;
- agregar navegacion interna responsive exclusiva del `platform_admin`;
- mostrar contadores por subseccion;
- construir un `Resumen` operativo enfocado en pendientes y caja mensual;
- reorganizar `Solicitudes`, `Cambios fiscales` y `Membresias` con foco en operacion diaria;
- mantener el principio de `operacion primero, historial secundario`.

Este bloque no incluye:

- endpoints nuevos;
- persistencia nueva;
- rediseno del rol empresa;
- analytics avanzados o graficos nuevos;
- cambios de negocio sobre aprobacion, rechazo o cobro;
- notificaciones nuevas fuera de la campana ya implementada.

## Estructura Objetivo

La vista `Plataforma` debe quedar dividida en cuatro subsecciones:

- `Resumen`
- `Solicitudes`
- `Cambios fiscales`
- `Membresias`

Estas subsecciones viven dentro de una unica vista principal del sidebar. No se convierten en nuevas entradas del menu lateral.

## Navegacion Interna

### Desktop

En desktop, la navegacion interna debe presentarse como un segmented control o tabs compactas dentro de la vista `Plataforma`.

Cada opcion debe incluir contador:

- `Resumen`
- `Solicitudes (n)`
- `Cambios fiscales (n)`
- `Membresias (n)`

### Mobile

En mobile o ancho compacto, la misma navegacion debe colapsar a un selector mas compacto, sin introducir scroll horizontal incomodo ni duplicar navegacion.

### Regla De Apertura

Cuando el `platform_admin` entra a `Plataforma`, la subseccion inicial debe ser `Resumen`.

## Resumen

La subseccion `Resumen` debe priorizar:

- estado operativo del SaaS;
- pendientes accionables;
- monto estimado a cobrar durante el mes.

### KPIs

Debe mostrar como minimo:

- `Solicitudes pendientes`
- `Cambios fiscales pendientes`
- `Membresias activas`
- `Membresias vencidas`
- `Vencen en 3 dias`
- `A cobrar este mes`

### Monto A Cobrar Este Mes

El indicador `A cobrar este mes` no debe representar solo membresias activas. Debe representar lo que corresponde cobrar en el mes operativo actual, incluyendo:

- membresias vencidas;
- membresias que vencen dentro de 3 dias;
- y, si el modelo actual lo permite sin ambiguedad, membresias exigibles dentro del ciclo mensual actual.

En esta iteracion se prioriza una lectura practica y consistente antes que una contabilidad compleja.

### Atencion Inmediata

Debajo de los KPIs debe existir un bloque corto de `Atencion inmediata`, con items accionables para:

- solicitudes nuevas pendientes;
- cambios fiscales pendientes;
- empresas con membresia vencida;
- empresas con membresia por vencer en 3 dias.

Cada item debe ofrecer CTA para abrir la subseccion correspondiente.

## Solicitudes

### Vista Principal

La subseccion `Solicitudes` debe mostrar solo items pendientes por defecto.

No deben mezclarse en la vista principal:

- aprobadas;
- rechazadas;
- ya contactadas si no requieren accion operativa.

### Acciones

Cada solicitud debe mantener sus acciones operativas actuales:

- `Crear cuenta`
- `Contactada`
- `Rechazar`

### Historico

Debe existir una via secundaria para consultar resueltas o historial, sin contaminar la lista principal. Puede resolverse con un filtro secundario o un boton tipo `Ver historial`.

## Cambios Fiscales

### Vista Principal

La subseccion `Cambios fiscales` debe mostrar solo pendientes por defecto.

Los cambios ya aprobados o rechazados no deben compartir el flujo principal.

### Acciones

Cada item debe mantener sus acciones operativas:

- `Aprobar`
- `Rechazar`

### Historico

Al igual que en `Solicitudes`, debe existir acceso secundario a items resueltos o historicos.

## Membresias

### Objetivo

La subseccion `Membresias` debe ser la superficie operativa de cobro del `platform_admin`.

### Desktop

En desktop debe presentarse como tabla compacta.

La tabla debe mostrar, como minimo:

- empresa;
- estado;
- proximo vencimiento;
- ultimo pago;
- periodo o plan mas reciente.

### Mobile

En mobile debe degradar a cards operativas en lugar de una tabla ancha.

### Filtros

Debe incluir filtros rapidos:

- `Todas`
- `Vencidas`
- `Por vencer`
- `Activas`

### Acciones

Cada membresia debe ofrecer CTA operativos:

- `Registrar pago`
- `WhatsApp`
- `Email` si el flujo vigente ya esta disponible

No se crea un flujo nuevo de mensajeria en esta etapa. Solo se reorganiza la superficie actual para hacerlo mas claro.

### Historico

Los pagos historicos y acciones resueltas deben quedar accesibles de forma secundaria, no mezclados con el trabajo prioritario del dia.

## Regla De Producto

La vista `Plataforma` debe seguir una regla consistente:

- mostrar primero lo pendiente y accionable;
- dejar el historico como acceso secundario;
- evitar mezclar informacion operativa con estados cerrados.

## Reuso Tecnico

No se agregaran contratos HTTP nuevos para este bloque.

La vista debe reusar el estado ya disponible en `DashboardPage.tsx`, en particular:

- `platformSignupRequests`
- `platformChangeRequests`
- `platformMemberships`

La reorganizacion es principalmente de estructura, composicion y presentacion.

## Cambios Esperados En Frontend

### DashboardPage

En `DashboardPage.tsx`:

- introducir estado interno para subseccion activa de `Plataforma`;
- renderizar navegacion interna responsive;
- derivar contadores por subseccion;
- separar renderizado de `Resumen`, `Solicitudes`, `Cambios fiscales` y `Membresias`;
- mantener compatibilidad con la campana de notificaciones para abrir `Plataforma`.

### Componentizacion

Si el tamano del archivo lo justifica, se pueden extraer componentes internos o helpers pequenos para:

- tabs o selector de subsecciones;
- tarjetas KPI;
- bloque `Atencion inmediata`;
- tabla/cards de membresias.

La extraccion debe ser pragmatica y alineada con el patron ya usado en el archivo.

## Responsive

La nueva vista debe mejorar el uso en:

- desktop amplio;
- notebooks;
- resoluciones intermedias;
- celular.

La implementacion debe evitar:

- tablas que obliguen a scroll lateral permanente en mobile;
- tabs apretadas e ilegibles;
- duplicacion de navegacion interna y externa.

## Testing

Se debe cubrir como minimo:

- que `Plataforma` abra en `Resumen` para `platform_admin`;
- que la navegacion interna cambie entre subsecciones;
- que los contadores reflejen pendientes reales;
- que `Solicitudes` muestre pendientes por defecto;
- que `Cambios fiscales` muestre pendientes por defecto;
- que `Membresias` permita filtrar por estado;
- que el `Resumen` renderice KPIs y bloque de atencion inmediata;
- que la UX siga siendo funcional en layout mobile.

## Riesgos

Los riesgos principales son:

- sobrecargar `DashboardPage.tsx` con demasiada logica visual;
- mover elementos y romper flujos operativos que ya funcionan;
- crear una vista prolija pero menos accionable que la actual.

La mitigacion es mantener:

- el backend intacto;
- las acciones existentes sin cambio de negocio;
- el foco en una reorganizacion clara y medible.

## Resultado Esperado

Al entrar a `Plataforma`, el `platform_admin` debe ver primero un resumen ejecutivo y operativo del SaaS, luego poder entrar rapidamente a solicitudes, cambios fiscales o membresias sin recorrer una pantalla larga ni mezclar pendientes con historico.
