# Platform Superadmin Profile Design

## Contexto

La aplicacion ya esta en produccion y hoy el `platform_admin` tiene operatoria real sobre solicitudes, membresias y cuentas SaaS. Sin embargo, la experiencia actual tiene una carencia importante: el superadmin no dispone de un acceso claro y propio para editar el perfil institucional de la plataforma desde la UI.

Hoy la base funcional para ese perfil ya existe en la vista `Empresa`, pero la navegacion del `platform_admin` la excluye y deja al rol sin una superficie coherente para cargar logo, web, telefono, email, direccion y notas.

## Objetivo Del Bloque 1

Recuperar una vista de perfil para el `platform_admin` sin afectar la operatoria actual de empresas cliente, y ubicar ese acceso en una barra superior liviana, separada del sidebar operativo.

## Alcance

Este bloque incluye:

- agregar un acceso `Perfil` visible solo para `platform_admin`;
- ubicar ese acceso en una barra superior derecha tipo "navbar fantasma";
- abrir `Perfil` como una vista completa dentro del dashboard;
- reutilizar la infraestructura actual de `Empresa` para editar datos institucionales;
- adaptar encabezados, subtitulos y framing visual para que hablen de la plataforma FacturEasy y no de una empresa cliente;
- mantener preview PDF y carga de logo dentro de esa vista.

Este bloque no incluye:

- sistema de notificaciones;
- campana o contador de pendientes;
- rediseno profundo del dashboard de plataforma;
- cambios de navegacion para usuarios empresa;
- nuevos permisos o nuevos roles.

## Decisiones De UX

### Navegacion

Para `platform_admin`, la navegacion queda separada en dos niveles:

- **sidebar principal** para operacion diaria:
  - Resumen
  - Clientes
  - Servicios
  - Presupuestos
  - Tesoreria
  - Plataforma
- **barra superior derecha** para acciones de cuenta:
  - Perfil
  - futuro espacio para notificaciones
  - toggle de tema
  - salir

`Perfil` no debe volver al sidebar del superadmin. La razon es conceptual: no es una vista operativa, sino institucional.

### Superficie De Perfil

`Perfil` se abre como vista completa del dashboard, no como modal ni drawer. Esto evita friccion para:

- cargar o reemplazar logo;
- editar varios campos seguidos;
- revisar el preview PDF;
- usar la seccion como espacio de configuracion estable.

### Exclusividad Por Rol

Todos los cambios de este bloque deben ser exclusivos del `platform_admin`.

Los usuarios empresa conservan:

- su sidebar actual;
- su acceso actual a `Empresa`;
- su flujo actual de edicion de perfil.

## Reuso Tecnico

No se creara una vista totalmente separada para `platform_admin`. Se reutilizara la base de `CompanyProfileView` y de la logica existente de `TenantProfile`.

Se introducira una variante por rol en el renderizado, con cambios de:

- etiqueta de acceso (`Perfil`);
- encabezado;
- copy de ayuda;
- framing visual del contenido.

La persistencia y el contrato HTTP se mantienen:

- `GET /admin/tenants/me`
- `PATCH /admin/tenants/me`

## Cambios Esperados En Frontend

### Dashboard

En `DashboardPage.tsx`:

- incluir `Perfil` como accion visible solo para `platform_admin` en la topbar;
- dejar `Plataforma` en el sidebar del superadmin;
- eliminar la exclusion actual que impide al `platform_admin` acceder a la superficie de perfil;
- permitir abrir la vista `company` tambien para `platform_admin`, pero mostrada como `Perfil`.

### CompanyProfileView

La vista debe aceptar contexto de rol o modo de presentacion para ajustar:

- titulo principal;
- descripcion de apoyo;
- etiquetas secundarias si hoy asumen "empresa cliente".

No debe duplicarse la logica del formulario.

### Mobile

En mobile:

- `Perfil` debe vivir dentro del menu hamburguesa del `platform_admin`;
- no se agregara una barra superior compleja;
- debe seguir siendo una vista completa al abrirse.

## Estados Y Errores

Se mantienen los estados actuales:

- guardando;
- exito;
- error por validacion o backend.

No se agregan nuevos tipos de alerta en este bloque.

## Testing

Se debe cubrir como minimo:

- que `platform_admin` vea el acceso `Perfil`;
- que ese acceso no aparezca para usuario empresa en la barra superior del superadmin;
- que al abrir `Perfil` se renderice la vista completa;
- que el guardado siga usando el endpoint existente de tenant profile;
- que la navegacion mobile del `platform_admin` incluya `Perfil`.

## Riesgos

Los riesgos principales de este bloque son:

- romper la navegacion actual del superadmin;
- introducir condiciones de rol inconsistentes entre desktop y mobile;
- duplicar accidentalmente textos o caminos de UI.

La mitigacion es mantener la logica de datos igual y limitar el cambio a navegacion y presentacion.

## Resultado Esperado

Al finalizar este bloque, el `platform_admin` debe poder entrar a FacturEasy, operar la plataforma y, desde una superficie propia y clara, editar la identidad institucional del producto sin mezclarse con la navegacion de empresas cliente.
