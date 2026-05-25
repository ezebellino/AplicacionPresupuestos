# Platform Superadmin Icon Tooltips Design

## Contexto

La primera mejora de iconografia del `platform_admin` ya incorporo `lucide-react` en notificaciones y acciones obvias del superadmin. Eso mejoro reconocimiento visual, pero todavia faltan dos cosas:

- extender el uso a mas acciones administrativas claras;
- asegurar que cada icono tenga una leyenda comprensible al pasar el mouse.

Como el rol `superadmin` usa la aplicacion en escritorio para operacion diaria, el hover informativo suma valor real sin introducir una capa nueva de complejidad visual.

## Objetivo

Completar la iconografia del `superadmin` en acciones operativas claras y agregar tooltips nativos por hover para que cada icono tenga una explicacion inmediata.

## Alcance

Este bloque incluye:

- extender iconos a acciones obvias del `superadmin`;
- agregar `title` nativo en botones con iconografia;
- mantener el cambio limitado al rol `platform_admin`;
- conservar texto visible donde el icono solo no alcance.

Este bloque no incluye:

- tooltips custom;
- cambios del rol empresa;
- reescritura completa de todos los botones del dashboard;
- cambios de backend.

## Decisiones

### Tooltip

Se usara el atributo `title` nativo del navegador.

La razon es:

- costo tecnico minimo;
- comportamiento estable;
- cero dependencia nueva;
- suficiente para esta etapa.

### Ambito

Los tooltips y nuevos iconos se limitan a superficies del `superadmin`.

### Regla De Lectura

En desktop:

- botones con icono deben exponer `title`;
- si el boton ya tiene `aria-label`, debe seguir siendo consistente con el `title`;
- donde haya icono + texto, el tooltip refuerza la accion;
- donde haya boton compacto, el tooltip aclara significado.

En mobile:

- no se debe depender del hover para entender la accion;
- por eso se mantiene texto visible en acciones importantes.

## Acciones Candidatas

La iteracion aprobada incluye iconos y tooltip para acciones como:

- `Perfil`
- `Pendientes`
- `Historial`
- `Crear cuenta`
- `Contactada`
- `Rechazar`
- `Aprobar`
- `Registrar pago`
- `WhatsApp`
- `Email`

No hace falta convertir todas a icono-only. La prioridad es claridad, no compresion visual forzada.

## Cambios Esperados En Frontend

En `frontend/src/features/dashboard/DashboardPage.tsx`:

- agregar iconos faltantes del `superadmin`;
- agregar `title` a botones con iconografia;
- mantener consistencia entre `title`, texto visible y `aria-label` cuando exista;
- no modificar el flujo del rol empresa.

## Testing

Se debe verificar como minimo:

- que los botones del `superadmin` sigan renderizando y funcionando;
- que la campana de notificaciones no se rompa;
- que el rol empresa no cambie;
- que las acciones principales del `superadmin` mantengan texto visible cuando sea necesario.

## Riesgos

Los riesgos principales son:

- sobrecargar de iconos zonas que ya eran suficientemente claras;
- perder coherencia entre texto, tooltip y accion real;
- convertir sin querer botones del rol empresa.

La mitigacion es mantener el cambio acotado a botones del `platform_admin` y usar `title` nativo.

## Resultado Esperado

El `superadmin` debe tener una interfaz mas clara y explicita: iconos consistentes en acciones operativas y una leyenda inmediata al hover para reducir ambiguedad.
