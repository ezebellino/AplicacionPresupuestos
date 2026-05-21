# FacturEasy

FacturEasy es una aplicación SaaS multitenant para gestión de clientes, catálogo de servicios, presupuestos, PDF de facturación, envío por WhatsApp y tesorería operativa.

## Stack

- Backend: FastAPI, SQLAlchemy, Alembic, JWT, ReportLab.
- Frontend: React, TypeScript, Vite, Vitest, SweetAlert2.
- Base de datos recomendada para producción: PostgreSQL.

## Desarrollo local

Backend:

```powershell
cd backend
python -m pip install -e .[dev]
python -m alembic upgrade head
python -m uvicorn app.api.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 50111
```

## Variables de entorno

Copiar los ejemplos y completar valores reales:

- `backend/.env.example`
- `frontend/.env.example`

En producción, no usar SQLite en memoria. Configurar `DATABASE_URL` apuntando a PostgreSQL y un `JWT_SECRET` largo y privado.

## Deploy en Railway

Recomendación: crear dos servicios.

Backend:

- Root directory: `backend`
- Build/install: `python -m pip install -e .`
- Start command: `python -m uvicorn app.api.main:app --host 0.0.0.0 --port $PORT`
- Variables: `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_API_BASE_URL`, `CORS_ALLOWED_ORIGINS`, `PLATFORM_NOTIFICATION_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_USE_TLS`
- Ejecutar migraciones antes de publicar una versión nueva: `python -m alembic upgrade head`

Frontend:

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Output directory: `dist`
- Variable: `VITE_API_URL` apuntando al backend público

## Gates de calidad

Backend:

```powershell
cd backend
python -m pytest -v
```

Frontend:

```powershell
cd frontend
npm run typecheck
npm run test:run
npm run build
```

## Nota de seguridad

Los datos fiscales del tenant (`empresa`, `razón social`, `CUIT`) quedan bloqueados para edición directa. Los cambios se registran como solicitudes pendientes para revisión administrativa, evitando que un usuario cambie identidad fiscal sin control.

## Administración de plataforma

El rol `platform_admin` habilita la vista `Plataforma` dentro del dashboard. Desde ahí se revisan:

- Solicitudes públicas de alta SaaS enviadas desde el login.
- Solicitudes de cambio fiscal enviadas por empresas existentes.

Para el primer despliegue, crear o promover el usuario de plataforma con:

```powershell
cd backend
py -3 -m app.scripts.ensure_platform_admin --email presupuestos@zeqebellino.com --password TU_CLAVE_SEGURA
```

Luego cargar o sincronizar los 4 servicios de membresia del tenant plataforma:

```powershell
cd backend
py -3 -m app.scripts.ensure_platform_membership_services --email presupuestos@zeqebellino.com
```

Ese script deja listos estos importes:

- `Cobro Mensual`: `$ 5.000,00`
- `Cobro Trimestral`: `$ 14.250,00`
- `Cobro Semestral`: `$ 27.000,00`
- `Cobro Anual`: `$ 51.000,00`

Con eso, al registrar un pago desde `Plataforma`, FacturEasy genera automaticamente el cliente SaaS y el presupuesto correspondiente.
 
Si se configuran las variables SMTP, cada solicitud publica de alta y cada solicitud de cambio fiscal tambien envian un email al `PLATFORM_NOTIFICATION_EMAIL`. Si SMTP no esta configurado, la solicitud se guarda igual y queda disponible en el panel `Plataforma`.
