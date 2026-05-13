from fastapi import FastAPI

from app.api.routes import auth, clients, tenants


app = FastAPI(title="Presupuestos SaaS API")

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(clients.router, prefix="/clients", tags=["clients"])
app.include_router(tenants.router, prefix="/admin/tenants", tags=["admin"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
