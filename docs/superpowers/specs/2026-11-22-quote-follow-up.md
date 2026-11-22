# Seguimiento de presupuestos emitidos

## Objetivo y comportamiento

Evitar que una respuesta recibida por WhatsApp quede sin registrar en FacturEasy.

1. Inicio muestra «Para dar seguimiento»: todos los emitidos cuyo recordatorio venció, ordenados por fecha de seguimiento. Presenta cinco y permite mostrar más. «Todos los emitidos» permite registrar una respuesta anticipada.
2. El primer aviso aparece 72 horas después de emitir. Se puede posponer 1, 3 o 7 días desde el momento de guardar. Un aviso agrupado en otras secciones permite volver al panel. Son avisos dentro de la aplicación, sin email ni notificaciones push.
3. Aceptó/Rechazó exige confirmar cliente, número y total. Se reutilizan las transiciones existentes. Aceptar no registra un cobro. Cancelar o fallar la API no retira el presupuesto del panel.
4. Consultar por WhatsApp prepara un mensaje y exige revisar un teléfono internacional. El usuario completa el envío. Abrir WhatsApp no acredita entrega, respuesta ni cambia estados o recordatorios.

La ayuda integrada y el recorrido explican estas acciones. Los administradores de plataforma no reciben estos recordatorios de operación comercial.

## Datos y permisos

- Migración 0016_quote_follow_up, posterior a 0015_audit_events: columna nullable follow_up_at, sin backfill ni actualización de estados/importes.
- POST /quotes/{id}/follow-up admite exclusivamente days entero 1, 3 o 7. Autenticación y tenant del usuario resuelto en servidor; búsquedas por tenant e identificador. Sólo admite emitidos. Registra auditoría.
- Aceptar/rechazar limpia follow_up_at. Se mantienen cálculos y snapshots históricos.
- Para registros antiguos sin issued_at se usa created_at para programar; la interfaz indica que la fecha de emisión no está disponible.
- El reloj del panel se actualiza cada minuto y al recuperar foco; las fechas de posposición provienen del servidor. Los cambios realizados desde otro dispositivo se recuperan al recargar la aplicación; no hay sincronización en tiempo real.

## Validación

- Backend: 127 pruebas aprobadas con Python 3.12 y base aislada; permisos, aislamiento, validación de payload, persistencia en detalle/listado, auditoría, estados e importes, limpieza tras respuesta.
- Migración probada sobre SQLite descartable con datos previos: upgrade, downgrade y upgrade preservan estados/importes. Esto no sustituye una prueba de migración sobre PostgreSQL de staging.
- Frontend: límite de 72 horas, UTC/offsets, registros antiguos, posposición, todos los emitidos, confirmación/cancelación, bloqueo de doble clic y fallo de API. Suite completa: 76 pruebas. Typecheck y build correctos; build avisa del bundle principal mayor a 500 kB.
- Navegador local con fetch interceptado y datos sintéticos: 390×844 y 1440×1000 sin desbordamiento horizontal. Confirmación/cancelación real, actualización de contadores, posposición 7 días, aviso desde Clientes, validación de teléfono y URL de WhatsApp. window.open interceptado: no se enviaron mensajes ni se escribió en producción.
- No se verificó apertura de WhatsApp en teléfono físico.

## Publicación y reversión

Preparar PR, sin merge ni deploy en esta etapa. El entrypoint backend ya ejecuta alembic upgrade head antes de iniciar Uvicorn. Al publicar, verificar primero backend/migración y luego frontend: una versión frontend nueva con backend anterior no puede guardar posposiciones. La columna adicional es compatible con código anterior; para revertir la aplicación puede conservarse. Bajar la migración elimina las fechas de recordatorio, por lo que sólo debe hacerse tras retirar el código que la usa y con respaldo adecuado.
