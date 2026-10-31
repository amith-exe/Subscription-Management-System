from fastapi import FastAPI

app = FastAPI(title="Subscription Analytics Prototype")

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.post("/predict")
def predict(rows: list[dict]) -> dict[str, list[float]]:
    """Placeholder contract for a future trained churn model."""
    return {"risk": [0.0 for _ in rows]}
