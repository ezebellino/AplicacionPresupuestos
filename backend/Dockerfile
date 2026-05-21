FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

RUN python -m pip install --upgrade pip && \
    python -m pip install -e .

CMD ["sh", "-c", "python -m uvicorn app.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
