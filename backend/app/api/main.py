from fastapi import FastAPI


app = FastAPI(title="Presupuestos SaaS API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
