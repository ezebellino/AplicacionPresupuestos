from fastapi import FastAPI

from app.api.routes import auth, tenants


app = FastAPI(title="Presupuestos SaaS API")

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(tenants.router, prefix="/admin/tenants", tags=["admin"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
