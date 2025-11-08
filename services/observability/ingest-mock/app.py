"""Telemetry Ingest Mock - ATP event ingestion."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import os

app = FastAPI(title="Telemetry Ingest Mock", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TelemetryEvent(BaseModel):
    event_type: str
    trace_id: str
    data: Dict[str, Any]


@app.get("/healthz")
async def health_check():
    return {"status": "healthy", "service": "ingest-mock"}


@app.post("/api/telemetry/events")
async def ingest_events(events: List[TelemetryEvent]):
    """Ingest ATP telemetry events."""
    # In production, this would process and store events
    return {
        "status": "success",
        "events_received": len(events),
        "message": "Events ingested successfully"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
