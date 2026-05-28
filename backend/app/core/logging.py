from __future__ import annotations

import json
import logging
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID


LOGGER_NAME = "factureasy.api"


def configure_logging() -> logging.Logger:
    logger = logging.getLogger(LOGGER_NAME)
    if logger.handlers:
        return logger

    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger


def get_logger(name: str | None = None) -> logging.Logger:
    base_logger = configure_logging()
    if not name or name == LOGGER_NAME:
        return base_logger
    return logging.getLogger(f"{LOGGER_NAME}.{name}")


def log_business_event(logger: logging.Logger, *, event: str, **fields: object) -> None:
    log_event(logger, event=event, **fields)


def log_event(logger: logging.Logger, *, level: int = logging.INFO, event: str, **fields: object) -> None:
    payload = {"event": event, **{key: _normalize(value) for key, value in fields.items()}}
    logger.log(level, json.dumps(payload, ensure_ascii=True, separators=(",", ":")))


def _normalize(value: object):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (UUID, Decimal)):
        return str(value)
    if isinstance(value, Enum):
        return _normalize(value.value)
    if isinstance(value, dict):
        return {str(key): _normalize(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_normalize(item) for item in value]
    return str(value)
