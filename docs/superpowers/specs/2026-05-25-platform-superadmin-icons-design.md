# Platform Superadmin Icons Design

## Contexto

El `platform_admin` ya tiene mejoras funcionales claras en `Perfil`, `Notificaciones` y `Plataforma`, pero la capa visual todavia conserva algunos placeholders o textos que funcionan como reemplazo de iconos.

El caso mas evidente es la campana de notificaciones, que hoy no se representa como un icono real. Eso vuelve la UI menos clara y menos profesional de lo que deberia ser para el uso diario del `superadmin`.

## Objetivo

Incorporar una libreria de iconos liviana y consistente para mejorar la legibilidad de acciones del `superadmin`, empezando por notificaciones y botones operativos obvios, sin tocar el rol empresa.

## Alcance

Este bloque incluye:

- instalar `lucide-react`;
- reemplazar el placeholder textual de notificaciones por un icono de campana real;
- usar iconos solo en superficies del `platform_admin`;
- aplicar iconos en acciones obvias del superadmin cuando mejoren escaneo y reconocimiento.

Este bloque no incluye:

- rediseño global del dashboard;
- cambio de iconografia del rol empresa;
- reemplazo total de todos los botones por iconos;
- nuevos flujos de negocio.

## Decisiones

### Libreria

Se usara `lucide-react`.

La razon es:

- buena compatibilidad con React/Vite;
- peso bajo;
- set de iconos suficiente para acciones administrativas;
- consistencia visual para futuras iteraciones.

### Ambito

La iconografia se limita al `superadmin` en esta iteracion.

No se debe expandir al resto del producto todavia.

### Casos Iniciales

Los primeros usos aprobados son:

- `Bell` para notificaciones;
- `User` o equivalente para `Perfil`;
- `Mail` para email;
- `MessageCircle` para WhatsApp;
- `Check`, `X`, `Clock`, `History` cuando ayuden a leer acciones o estados del `superadmin`.

## Regla De UX

Los iconos deben complementar la accion, no volverla ambigua.

Donde el boton ya es muy claro por texto y el icono no aporta, se puede conservar texto solo.

En acciones compactas o repetidas, el icono ayuda a:

- escaneo rapido;
- menor fatiga visual;
- mejor uso de espacio.

## Cambios Esperados En Frontend

En `frontend/src/features/dashboard/DashboardPage.tsx`:

- importar iconos de `lucide-react`;
- actualizar la campana del panel superior del `platform_admin`;
- revisar botones del `superadmin` donde el icono sume claridad sin introducir ruido;
- mantener accesibilidad con `aria-label` cuando corresponda.

En `frontend/package.json`:

- agregar `lucide-react` como dependencia.

## Testing

Se debe verificar como minimo:

- que la campana siga visible para `platform_admin`;
- que el contador siga funcionando;
- que no se rompa la navegacion de notificaciones;
- que el rol empresa no cambie por este ajuste.

## Riesgos

Los riesgos principales son:

- introducir iconos de manera inconsistente;
- cambiar demasiados botones en una sola pasada;
- perder claridad por exceso de iconografia.

La mitigacion es mantener el alcance corto:

- una sola libreria;
- solo `superadmin`;
- solo acciones donde el icono mejora lectura real.

## Resultado Esperado

El `platform_admin` debe percibir una UI mas clara y actual, empezando por una campana real de notificaciones y acciones administrativas con mejor reconocimiento visual.
