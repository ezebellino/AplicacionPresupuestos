from __future__ import annotations

import time
from uuid import uuid4

from fastapi import Request
from starlette.responses import Response

from app.core.logging import get_logger, log_event


logger = get_logger("http")


async def request_logging_middleware(request: Request, call_next) -> Response:
    request_id = str(uuid4())
    request.state.request_id = request_id
    started_at = time.perf_counter()

    log_event(
        logger,
        event="request_started",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        query=request.url.query or None,
        client_ip=request.client.host if request.client else None,
    )

    try:
        response = await call_next(request)
    except Exception as exc:
        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        log_event(
            logger,
            level=40,
            event="request_failed",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            duration_ms=duration_ms,
            error_type=type(exc).__name__,
            error_message=str(exc),
        )
        raise

    response.headers["X-Request-ID"] = request_id
    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    log_event(
        logger,
        event="request_completed",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )
    return response
