from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.middleware import request_logging_middleware
from app.api.routes import auth, clients, cost_items, expenses, quotes, tenants
from app.core.config import settings
from app.core.logging import configure_logging


configure_logging()
app = FastAPI(title="Presupuestos SaaS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(request_logging_middleware)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(clients.router, prefix="/clients", tags=["clients"])
app.include_router(cost_items.router, prefix="/cost-items", tags=["cost-items"])
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
app.include_router(quotes.router, prefix="/quotes", tags=["quotes"])
app.include_router(tenants.router, prefix="/admin/tenants", tags=["admin"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
