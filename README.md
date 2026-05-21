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
- Variables: `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_API_BASE_URL`, `CORS_ALLOWED_ORIGINS`
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

Para el primer despliegue, crear una empresa interna de plataforma y promover su usuario admin actualizando `users.role = 'platform_admin'` en la base de datos. Luego ese usuario puede revisar solicitudes desde la UI. La creación efectiva de cuentas nuevas sigue siendo manual y controlada por el administrador de plataforma.
