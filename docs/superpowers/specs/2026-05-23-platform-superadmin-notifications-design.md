# Platform Superadmin Notifications Design

## Contexto

El `platform_admin` ya opera solicitudes de alta, cambios fiscales y membresias desde la vista `Plataforma`. Sin embargo, hoy no tiene una bandeja visible y persistente que le marque pendientes operativos en cuanto entra a la aplicacion.

La necesidad no es construir un historial de actividad ni un centro de mensajes. La necesidad es una bandeja de trabajo breve, visible y accionable.

## Objetivo

Agregar un sistema de notificaciones exclusivo para `platform_admin` que senale solo eventos operativos pendientes de accion y permita llegar rapido a la accion correcta desde una campana en la topbar.

## Alcance

Este bloque incluye:

- una campana visible solo para `platform_admin`;
- un contador con la cantidad total de items pendientes;
- un panel lateral derecho que se abre al hacer click;
- agrupacion de notificaciones por tipo de pendiente;
- CTA por item para llevar a la accion correspondiente.

Este bloque no incluye:

- historial de actividad;
- notificaciones informativas ya resueltas;
- notificaciones para el rol empresa;
- envio push, email o tiempo real;
- persistencia nueva en base de datos solo para notificaciones.

## Regla Principal

La campana solo debe mostrar eventos operativos pendientes de accion.

Cuando un item deja de requerir accion, desaparece de la bandeja.

## Fuentes De Notificacion

La primera iteracion debe incluir exactamente estas fuentes:

1. solicitudes de alta pendientes;
2. cambios fiscales pendientes;
3. membresias vencidas;
4. membresias que vencen dentro de 3 dias.

No deben entrar otros tipos de eventos en esta iteracion.

## Modelo De Conteo

El badge de la campana debe mostrar la cantidad total de items pendientes, no la cantidad de grupos.

Ejemplo:

- 2 solicitudes de alta pendientes
- 1 cambio fiscal pendiente
- 3 membresias vencidas

La campana debe mostrar `6`.

## Experiencia De Usuario

### Topbar

La campana vive en la topbar del `platform_admin`, junto a:

- Perfil
- toggle de tema
- Salir

No debe aparecer para usuarios empresa.

### Apertura

Al hacer click en la campana:

- se abre un panel lateral derecho;
- el panel no navega fuera de la pantalla actual;
- el contenido debe poder escanearse rapido.

### Estructura Del Panel

El panel debe agrupar por seccion:

- `Altas pendientes`
- `Cambios fiscales`
- `Membresias por vencer o vencidas`

Cada seccion debe ocultarse si no tiene items.

### Acciones

Cada item debe ofrecer una accion clara:

- solicitud de alta: `Revisar solicitud`
- cambio fiscal: `Ver cambio`
- membresia vencida o proxima a vencer: `Registrar pago`

La accion no necesita resolverse dentro del panel. Puede llevar al usuario a la vista `Plataforma` y dejar seleccionado o visible el bloque correcto.

## Reuso Tecnico

No se agregara una tabla nueva de notificaciones.

Las notificaciones deben derivarse de datos ya disponibles:

- `platformSignupRequests`
- `platformChangeRequests`
- `platformMemberships`

La logica vive en frontend, construyendo una coleccion derivada de pendientes a partir del estado existente.

## Reglas De Negocio

### Solicitudes de alta

Se notifica cuando `status === "pending"`.

Estados como `contacted`, `approved` o `rejected` no deben aparecer.

### Cambios fiscales

Se notifica cuando `status === "pending"`.

Estados revisados, aprobados o rechazados no deben aparecer.

### Membresias

Se notifica cuando:

- `membership_due_date` ya vencio; o
- `membership_due_date` vence dentro de los proximos 3 dias.

La referencia temporal debe usar fecha calendario estable, sin depender del reloj visual del navegador de forma ambigua.

## Cambios Esperados En Frontend

### DashboardPage

En `DashboardPage.tsx`:

- derivar una lista de notificaciones desde el estado del `platform_admin`;
- calcular `pendingNotificationCount`;
- renderizar campana y badge en topbar;
- manejar apertura y cierre del panel lateral;
- resolver los CTA para cambiar `activeView` y enfocar la operacion correcta.

### Navegacion

Los CTA no deben crear una vista nueva en esta iteracion.

Deben reutilizar:

- `activeView = 'platform'`
- foco visual o scroll al bloque relevante cuando sea posible

Si el foco al bloque agrega demasiada complejidad, en esta iteracion alcanza con abrir `Plataforma` y dejar visible la seccion principal correcta.

## Mobile

En mobile:

- la campana debe seguir existiendo para `platform_admin`;
- el panel debe abrirse como overlay o drawer lateral adaptado a pantalla compacta;
- el contador debe seguir visible.

No se debe empujar esta funcionalidad al menu hamburguesa, porque perderia inmediatez.

## Testing

Se debe cubrir como minimo:

- que la campana aparezca solo para `platform_admin`;
- que el badge muestre total de items y no total de grupos;
- que una solicitud `pending` sume al contador;
- que un cambio fiscal `pending` sume al contador;
- que una membresia vencida sume al contador;
- que una membresia a 3 dias del vencimiento sume al contador;
- que items resueltos no aparezcan;
- que al hacer click en la campana se abra el panel;
- que al hacer click en un CTA se navegue a `Plataforma`.

## Riesgos

Los riesgos principales son:

- mezclar notificaciones con historial;
- inflar el contador con estados que no son accionables;
- introducir demasiada logica visual dentro de `DashboardPage.tsx`.

La mitigacion es mantener el bloque acotado a datos derivados, sin storage nuevo y con criterios de inclusion estrictos.

## Resultado Esperado

Al entrar al dashboard, el `platform_admin` debe ver de inmediato si tiene pendientes reales de plataforma y poder entrar a resolverlos sin recorrer manualmente todo el panel operativo.
