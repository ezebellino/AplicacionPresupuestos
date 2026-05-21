#!/bin/sh
set -e

python -m app.scripts.prepare_alembic_version_table
python -m alembic upgrade head

if [ -n "${PLATFORM_BOOTSTRAP_EMAIL:-}" ]; then
  if [ -n "${PLATFORM_BOOTSTRAP_PASSWORD:-}" ]; then
    python -m app.scripts.ensure_platform_admin \
      --email "${PLATFORM_BOOTSTRAP_EMAIL}" \
      --password "${PLATFORM_BOOTSTRAP_PASSWORD}"
  else
    python -m app.scripts.ensure_platform_admin \
      --email "${PLATFORM_BOOTSTRAP_EMAIL}"
  fi

  python -m app.scripts.ensure_platform_membership_services \
    --email "${PLATFORM_BOOTSTRAP_EMAIL}"
fi

exec python -m uvicorn app.api.main:app --host 0.0.0.0 --port "${PORT:-8000}"
