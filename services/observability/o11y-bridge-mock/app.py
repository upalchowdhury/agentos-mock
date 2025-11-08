"""O11y Bridge Mock - ATP to OTel/Arize exporter."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'db'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import TelemetryTrace, TelemetrySpan

app = FastAPI(title="O11y Bridge Mock", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://agentos:agentos@localhost:5432/agentos_mock")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


@app.get("/healthz")
async def health_check():
    return {"status": "healthy", "service": "o11y-bridge-mock"}


@app.get("/api/otel/preview")
async def get_otel_preview(trace_id: str):
    """Preview ATP to OTel mapping."""
    session = Session()

    try:
        trace = session.query(TelemetryTrace).filter_by(trace_id=trace_id).first()
        if not trace:
            raise HTTPException(status_code=404, detail="Trace not found")

        spans = session.query(TelemetrySpan).filter_by(trace_id=trace_id).all()

        # Map to OTel format (simplified)
        otel_spans = []
        for span in spans:
            otel_spans.append({
                "traceId": trace.trace_id,
                "spanId": span.span_id,
                "parentSpanId": span.parent_span_id,
                "name": f"{span.kind.value}/{span.model_provider or 'unknown'}",
                "kind": span.kind.value.upper(),
                "startTimeUnixNano": int(span.start_timestamp.timestamp() * 1e9),
                "endTimeUnixNano": int(span.end_timestamp.timestamp() * 1e9),
                "attributes": {
                    "agentos.model.provider": span.model_provider,
                    "agentos.model.name": span.model_name,
                    "agentos.tokens.in": span.tokens_in,
                    "agentos.tokens.out": span.tokens_out,
                    "agentos.signature.verified": span.signature_verified,
                    "agentos.status": span.status.value,
                },
                "status": {
                    "code": "STATUS_CODE_OK" if span.status.value == "SUCCESS" else "STATUS_CODE_ERROR"
                }
            })

        return {
            "format": "OpenTelemetry",
            "export_enabled": os.getenv("EXPORT_TO_OTEL", "false") == "true",
            "resourceSpans": [{
                "resource": {
                    "attributes": {
                        "service.name": "agentos",
                        "agentos.org_id": trace.org_id,
                        "agentos.agent_id": trace.agent_id
                    }
                },
                "scopeSpans": [{
                    "scope": {"name": "agentos-tracer"},
                    "spans": otel_spans
                }]
            }]
        }

    finally:
        session.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
