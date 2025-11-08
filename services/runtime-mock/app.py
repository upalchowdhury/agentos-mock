"""Runtime Mock Service - Handles agent deployment and invocation."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid
import random
from datetime import datetime
import os
import sys

# Add db path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'db'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import TelemetryTrace, TelemetrySpan, Protocol, SpanKind, SpanStatus

app = FastAPI(title="Runtime Mock Service", version="0.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://agentos:agentos@localhost:5432/agentos_mock")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


class DeployRequest(BaseModel):
    agent_id: str
    org_id: str
    project_id: str
    runtime_config: Optional[Dict[str, Any]] = {}


class DeployResponse(BaseModel):
    version_id: str
    agent_id: str
    status: str
    deployment_url: str


class InvokeRequest(BaseModel):
    prompt: str
    parameters: Optional[Dict[str, Any]] = {}
    org_id: str
    project_id: str


class InvokeResponse(BaseModel):
    trace_id: str
    invocation_id: str
    output: str
    cost_cents: int
    duration_ms: int
    tokens_used: Dict[str, int]


@app.get("/healthz")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "runtime-mock"}


@app.post("/api/runtime/deploy", response_model=DeployResponse)
async def deploy_agent(request: DeployRequest):
    """Mock agent deployment endpoint."""
    version_id = f"v{random.randint(1, 5)}.{random.randint(0, 30)}.0"

    return DeployResponse(
        version_id=version_id,
        agent_id=request.agent_id,
        status="deployed",
        deployment_url=f"https://runtime.agentos.mock/{request.agent_id}/{version_id}"
    )


@app.post("/api/invoke/{agent_id}", response_model=InvokeResponse)
async def invoke_agent(agent_id: str, request: InvokeRequest):
    """Mock agent invocation with trace generation."""
    session = Session()

    try:
        # Generate trace and span
        trace_id = f"trace_{uuid.uuid4().hex[:16]}"
        invocation_id = f"inv_{uuid.uuid4().hex[:12]}"
        span_id = f"span_{uuid.uuid4().hex[:16]}"

        start_time = datetime.utcnow()
        duration_ms = random.randint(1000, 5000)

        tokens_in = len(request.prompt.split()) * 2
        tokens_out = random.randint(50, 500)

        # Calculate mock cost (example rates)
        cost_cents = int((tokens_in * 0.003) + (tokens_out * 0.006))

        # Create trace
        trace = TelemetryTrace(
            trace_id=trace_id,
            invocation_id=invocation_id,
            org_id=request.org_id,
            project_id=request.project_id,
            agent_id=agent_id,
            version_id=f"v1.{random.randint(0, 10)}.0",
            protocol=Protocol.A2A,
            run_mode="production",
            config_hash=None,
            signature_verified=True,
            cost_cents=cost_cents,
            start_timestamp=start_time,
            end_timestamp=start_time
        )

        # Create span
        span = TelemetrySpan(
            span_id=span_id,
            trace_id=trace_id,
            parent_span_id=None,
            kind=SpanKind.PROMPT,
            model_provider="OpenAI",
            model_name="gpt-4",
            model_params={"temperature": 0.7, "max_tokens": 1024},
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            excerpts=f"[REDACTED] {request.prompt[:100]}...",
            policy_enforced=[],
            obligations=[],
            redaction_mask_ids=[],
            signature_verified=True,
            status=SpanStatus.SUCCESS,
            duration_ms=duration_ms,
            content_hash_in=f"hash_{uuid.uuid4().hex[:16]}",
            content_hash_out=f"hash_{uuid.uuid4().hex[:16]}",
            start_timestamp=start_time,
            end_timestamp=start_time
        )

        session.add(trace)
        session.add(span)
        session.commit()

        return InvokeResponse(
            trace_id=trace_id,
            invocation_id=invocation_id,
            output="This is a mock response to your request. In production, this would be the actual agent output.",
            cost_cents=cost_cents,
            duration_ms=duration_ms,
            tokens_used={"input": tokens_in, "output": tokens_out}
        )

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
