# Logs técnicos seguros de notificaciones SMTP

## Alcance

Instrumentar `notify_platform` con el logger JSON existente, sin duplicar
auditoría funcional ni cambiar UX, persistencia, destinatarios o reglas de negocio.
Sin colas, reintentos ni envíos productivos en este bloque.

## Contrato

- `platform_notification_smtp_accepted` (INFO): terminó el intercambio SMTP;
  no confirma entrega en bandeja ni lectura del destinatario.
- `platform_notification_skipped` (INFO), `reason=missing_configuration`:
  falta host, destinatario o remitente; no se abre conexión.
- `platform_notification_failed` (WARNING): motivo fijo `authentication_failed`,
  `timeout`, `smtp_error` o `unexpected_error`. Se conserva el retorno `False`.
- Nunca registrar credenciales, host, direcciones, asunto, cuerpo, respuestas
  del servidor, texto/tipo arbitrario de excepción ni traceback.
- La preparación del mensaje queda dentro del manejo de fallos para que un
  encabezado inválido tampoco interrumpa la solicitud ya persistida.

## Validación

Pruebas sin red con SMTP simulado: aceptación, TLS/autenticación opcionales,
configuración incompleta, autenticación rechazada, timeout, error SMTP/genérico,
mensaje inválido y logs sin datos sensibles. Integración HTTP con SQLite en
memoria verifica que un alta sigue pendiente y persistida si falla el correo.
Ejecutar pruebas focalizadas y suite backend con SMTP deshabilitado por entorno.

Comandos desde `backend/` (PowerShell), usando un entorno temporal:

```powershell
$env:SMTP_HOST = ''
$env:PLATFORM_NOTIFICATION_EMAIL = ''
uv run --no-project --python 3.12 --with-editable '.[dev]' python -m pytest tests/test_notification_service.py -q
uv run --no-project --python 3.12 --with-editable '.[dev]' python -m pytest -q
```

El Python predeterminado local es 3.10 (incompatible con el proyecto). La
instalación local 3.13 presentó un fallo nativo en `asyncio` durante logging;
por eso se valida con 3.12 aislado, sin cambiar dependencias ni runtime productivo.

Después de PR/merge y deploy, coordinar una solicitud de prueba, correlacionar
el resultado técnico y verificar recepción real (incluido spam) en el buzón.
Esa verificación productiva queda pendiente y es independiente de estos tests.
