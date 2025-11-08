"""Observability API Mock - Query traces, spans, edges, and costs."""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os

from sqlalchemy import create_engine, func, desc
from sqlalchemy.orm import sessionmaker
from models import (
    TelemetryTrace, TelemetrySpan, TelemetryEdge, TelemetryAnomaly,
    CostAggregate, AgentRegistry
)

app = FastAPI(title="Observability API Mock", version="0.1.0")

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


class TraceInfo(BaseModel):
    trace_id: str
    invocation_id: str
    org_id: str
    project_id: str
    agent_id: str
    version_id: str
    protocol: str
    run_mode: str
    config_hash: Optional[str]
    signature_verified: bool
    cost_cents: int
    start_timestamp: datetime
    end_timestamp: Optional[datetime]
    duration_ms: Optional[int]


class SpanInfo(BaseModel):
    span_id: str
    trace_id: str
    parent_span_id: Optional[str]
    kind: str
    model_provider: Optional[str]
    model_name: Optional[str]
    tokens_in: int
    tokens_out: int
    excerpts: Optional[str]
    policy_enforced: List[str]
    obligations: List[Dict]
    signature_verified: bool
    status: str
    duration_ms: int
    start_timestamp: datetime
    end_timestamp: datetime


class EdgeInfo(BaseModel):
    edge_id: str
    trace_id: str
    from_agent_id: str
    from_agent_version: str
    to_agent_id: str
    to_agent_version: str
    from_span_id: str
    to_span_id: str
    channel: str
    instruction_type: Optional[str]
    signature_verified: bool
    size_bytes: int
    content_hash: Optional[str]
    timestamp: datetime


class CostSummary(BaseModel):
    total_cost_cents: int
    total_tokens_in: int
    total_tokens_out: int
    invocation_count: int
    by_provider: Dict[str, Dict[str, Any]]
    by_agent: Dict[str, Dict[str, Any]]


class ReplayResponse(BaseModel):
    span_id: str
    output: str
    deterministic: bool
    config_hash: Optional[str]
    message: str


@app.get("/healthz")
async def health_check():
    return {"status": "healthy", "service": "api-mock"}


@app.get("/api/traces", response_model=List[TraceInfo])
async def list_traces(
    org_id: Optional[str] = None,
    project_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    limit: int = Query(50, le=500)
):
    """List traces with optional filtering."""
    session = Session()

    try:
        query = session.query(TelemetryTrace)

        if org_id:
            query = query.filter_by(org_id=org_id)
        if project_id:
            query = query.filter_by(project_id=project_id)
        if agent_id:
            query = query.filter_by(agent_id=agent_id)

        traces = query.order_by(desc(TelemetryTrace.start_timestamp)).limit(limit).all()

        return [
            TraceInfo(
                trace_id=t.trace_id,
                invocation_id=t.invocation_id,
                org_id=t.org_id,
                project_id=t.project_id,
                agent_id=t.agent_id,
                version_id=t.version_id,
                protocol=t.protocol.value,
                run_mode=t.run_mode,
                config_hash=t.config_hash,
                signature_verified=t.signature_verified or False,
                cost_cents=t.cost_cents or 0,
                start_timestamp=t.start_timestamp,
                end_timestamp=t.end_timestamp,
                duration_ms=int((t.end_timestamp - t.start_timestamp).total_seconds() * 1000) if t.end_timestamp else None
            )
            for t in traces
        ]

    finally:
        session.close()


@app.get("/api/traces/{trace_id}", response_model=TraceInfo)
async def get_trace(trace_id: str):
    """Get a specific trace."""
    session = Session()

    try:
        trace = session.query(TelemetryTrace).filter_by(trace_id=trace_id).first()

        if not trace:
            raise HTTPException(status_code=404, detail="Trace not found")

        return TraceInfo(
            trace_id=trace.trace_id,
            invocation_id=trace.invocation_id,
            org_id=trace.org_id,
            project_id=trace.project_id,
            agent_id=trace.agent_id,
            version_id=trace.version_id,
            protocol=trace.protocol.value,
            run_mode=trace.run_mode,
            config_hash=trace.config_hash,
            signature_verified=trace.signature_verified or False,
            cost_cents=trace.cost_cents or 0,
            start_timestamp=trace.start_timestamp,
            end_timestamp=trace.end_timestamp,
            duration_ms=int((trace.end_timestamp - trace.start_timestamp).total_seconds() * 1000) if trace.end_timestamp else None
        )

    finally:
        session.close()


@app.get("/api/spans", response_model=List[SpanInfo])
async def list_spans(trace_id: Optional[str] = None, limit: int = Query(100, le=1000)):
    """List spans, optionally filtered by trace."""
    session = Session()

    try:
        query = session.query(TelemetrySpan)

        if trace_id:
            query = query.filter_by(trace_id=trace_id)

        spans = query.order_by(TelemetrySpan.start_timestamp).limit(limit).all()

        return [
            SpanInfo(
                span_id=s.span_id,
                trace_id=s.trace_id,
                parent_span_id=s.parent_span_id,
                kind=s.kind.value,
                model_provider=s.model_provider,
                model_name=s.model_name,
                tokens_in=s.tokens_in or 0,
                tokens_out=s.tokens_out or 0,
                excerpts=s.excerpts,
                policy_enforced=s.policy_enforced or [],
                obligations=s.obligations or [],
                signature_verified=s.signature_verified or False,
                status=s.status.value,
                duration_ms=s.duration_ms,
                start_timestamp=s.start_timestamp,
                end_timestamp=s.end_timestamp
            )
            for s in spans
        ]

    finally:
        session.close()


@app.get("/api/spans/{span_id}", response_model=SpanInfo)
async def get_span(span_id: str):
    """Get a specific span."""
    session = Session()

    try:
        span = session.query(TelemetrySpan).filter_by(span_id=span_id).first()

        if not span:
            raise HTTPException(status_code=404, detail="Span not found")

        return SpanInfo(
            span_id=span.span_id,
            trace_id=span.trace_id,
            parent_span_id=span.parent_span_id,
            kind=span.kind.value,
            model_provider=span.model_provider,
            model_name=span.model_name,
            tokens_in=span.tokens_in or 0,
            tokens_out=span.tokens_out or 0,
            excerpts=span.excerpts,
            policy_enforced=span.policy_enforced or [],
            obligations=span.obligations or [],
            signature_verified=span.signature_verified or False,
            status=span.status.value,
            duration_ms=span.duration_ms,
            start_timestamp=span.start_timestamp,
            end_timestamp=span.end_timestamp
        )

    finally:
        session.close()


@app.get("/api/edges", response_model=List[EdgeInfo])
async def list_edges(trace_id: Optional[str] = None, limit: int = Query(100, le=1000)):
    """List edges, optionally filtered by trace."""
    session = Session()

    try:
        query = session.query(TelemetryEdge)

        if trace_id:
            query = query.filter_by(trace_id=trace_id)

        edges = query.order_by(TelemetryEdge.timestamp).limit(limit).all()

        return [
            EdgeInfo(
                edge_id=e.edge_id,
                trace_id=e.trace_id,
                from_agent_id=e.from_agent_id,
                from_agent_version=e.from_agent_version,
                to_agent_id=e.to_agent_id,
                to_agent_version=e.to_agent_version,
                from_span_id=e.from_span_id,
                to_span_id=e.to_span_id,
                channel=e.channel.value,
                instruction_type=e.instruction_type,
                signature_verified=e.signature_verified or False,
                size_bytes=e.size_bytes or 0,
                content_hash=e.content_hash,
                timestamp=e.timestamp
            )
            for e in edges
        ]

    finally:
        session.close()


@app.get("/api/cost/summary", response_model=CostSummary)
async def get_cost_summary(
    org_id: str,
    range: str = "last_7d",
    project_id: Optional[str] = None
):
    """Get cost summary for an organization."""
    session = Session()

    try:
        # Parse range
        if range == "last_7d":
            start_date = datetime.utcnow() - timedelta(days=7)
        elif range == "last_30d":
            start_date = datetime.utcnow() - timedelta(days=30)
        else:
            start_date = datetime.utcnow() - timedelta(days=7)

        query = session.query(CostAggregate).filter(
            CostAggregate.org_id == org_id,
            CostAggregate.date >= start_date
        )

        if project_id:
            query = query.filter_by(project_id=project_id)

        aggregates = query.all()

        total_cost = sum(a.total_cost_cents or 0 for a in aggregates)
        total_tokens_in = sum(a.total_tokens_in or 0 for a in aggregates)
        total_tokens_out = sum(a.total_tokens_out or 0 for a in aggregates)
        total_invocations = sum(a.invocation_count or 0 for a in aggregates)

        # Group by provider
        by_provider = {}
        for agg in aggregates:
            if agg.provider:
                if agg.provider not in by_provider:
                    by_provider[agg.provider] = {
                        "cost_cents": 0,
                        "tokens_in": 0,
                        "tokens_out": 0,
                        "invocations": 0
                    }
                by_provider[agg.provider]["cost_cents"] += agg.total_cost_cents or 0
                by_provider[agg.provider]["tokens_in"] += agg.total_tokens_in or 0
                by_provider[agg.provider]["tokens_out"] += agg.total_tokens_out or 0
                by_provider[agg.provider]["invocations"] += agg.invocation_count or 0

        # Group by agent
        by_agent = {}
        for agg in aggregates:
            if agg.agent_id:
                if agg.agent_id not in by_agent:
                    by_agent[agg.agent_id] = {
                        "cost_cents": 0,
                        "tokens_in": 0,
                        "tokens_out": 0,
                        "invocations": 0
                    }
                by_agent[agg.agent_id]["cost_cents"] += agg.total_cost_cents or 0
                by_agent[agg.agent_id]["tokens_in"] += agg.total_tokens_in or 0
                by_agent[agg.agent_id]["tokens_out"] += agg.total_tokens_out or 0
                by_agent[agg.agent_id]["invocations"] += agg.invocation_count or 0

        return CostSummary(
            total_cost_cents=total_cost,
            total_tokens_in=total_tokens_in,
            total_tokens_out=total_tokens_out,
            invocation_count=total_invocations,
            by_provider=by_provider,
            by_agent=by_agent
        )

    finally:
        session.close()


@app.post("/api/replay/{span_id}", response_model=ReplayResponse)
async def replay_span(span_id: str):
    """Mock replay functionality."""
    session = Session()

    try:
        span = session.query(TelemetrySpan).filter_by(span_id=span_id).first()

        if not span:
            raise HTTPException(status_code=404, detail="Span not found")

        trace = session.query(TelemetryTrace).filter_by(trace_id=span.trace_id).first()

        deterministic = trace.config_hash is not None if trace else False

        return ReplayResponse(
            span_id=span_id,
            output="Replayed output (identical to original)" if deterministic else "Replayed output (may differ due to nondeterminism)",
            deterministic=deterministic,
            config_hash=trace.config_hash if trace else None,
            message="Deterministic replay successful" if deterministic else "Nondeterministic span - output may vary"
        )

    finally:
        session.close()


@app.get("/api/catalog/search")
async def search_catalog(
    protocol: Optional[str] = None,
    runtime_type: Optional[str] = None,
    org_id: Optional[str] = None,
    verified_telemetry: Optional[bool] = None
):
    """Search agent catalog with filters."""
    session = Session()

    try:
        query = session.query(AgentRegistry)

        if org_id:
            query = query.filter_by(org_id=org_id)
        if runtime_type:
            query = query.filter_by(runtime_type=runtime_type)

        agents = query.all()

        # Filter by protocol and badges
        results = []
        for agent in agents:
            if protocol and agent.protocol.value.lower() != protocol.lower():
                continue

            if verified_telemetry is not None:
                if agent.badges.get("verified_telemetry") != verified_telemetry:
                    continue

            results.append({
                "agent_id": agent.agent_id,
                "name": agent.name,
                "description": agent.description,
                "runtime_type": agent.runtime_type,
                "protocol": agent.protocol.value,
                "badges": agent.badges,
                "health_status": agent.health_status
            })

        return results

    finally:
        session.close()


@app.get("/api/kpi/overview")
async def get_kpi_overview():
    """Get KPI overview for dashboard."""
    session = Session()
    try:
        total_traces = session.query(func.count(TelemetryTrace.trace_id)).scalar() or 0
        
        week_ago = datetime.now() - timedelta(days=7)
        cost_7d = session.query(func.sum(TelemetryTrace.cost_cents)).filter(
            TelemetryTrace.start_timestamp >= week_ago
        ).scalar() or 0
        
        # Get P95 from span durations
        durations = session.query(TelemetrySpan.duration_ms).order_by(TelemetrySpan.duration_ms).all()
        
        p95 = 0
        if durations:
            idx = int(len(durations) * 0.95)
            p95 = durations[idx][0] if idx < len(durations) else durations[-1][0]
        
        error_count = session.query(func.count(TelemetrySpan.span_id)).filter(
            TelemetrySpan.status == 'error'
        ).scalar() or 0
        total_spans = session.query(func.count(TelemetrySpan.span_id)).scalar() or 1
        error_rate = (error_count / total_spans) * 100
        
        verified_count = session.query(func.count(TelemetrySpan.span_id)).filter(
            TelemetrySpan.signature_verified == True
        ).scalar() or 0
        verified_pct = (verified_count / total_spans) * 100
        
        return {
            "invocations": total_traces,
            "cost7d": cost_7d / 100,
            "p95": p95,
            "errorRate": round(error_rate, 2),
            "verifiedPct": round(verified_pct, 1)
        }
    finally:
        session.close()


@app.get("/api/kpi/verified")
async def get_verified_pct():
    """Get verified telemetry percentage."""
    session = Session()
    try:
        verified_count = session.query(func.count(TelemetrySpan.span_id)).filter(
            TelemetrySpan.signature_verified == True
        ).scalar() or 0
        total_spans = session.query(func.count(TelemetrySpan.span_id)).scalar() or 1
        verified_pct = (verified_count / total_spans) * 100
        
        return {"verified_pct": round(verified_pct, 1)}
    finally:
        session.close()


@app.post("/api/replay/{span_id}")
async def replay_span(span_id: str):
    """Mock replay of a span for deterministic execution."""
    session = Session()
    try:
        span = session.query(TelemetrySpan).filter_by(span_id=span_id).first()
        if not span:
            raise HTTPException(status_code=404, detail="Span not found")
        
        trace = session.query(TelemetryTrace).filter_by(trace_id=span.trace_id).first()
        
        return {
            "status": "ok",
            "deterministic": bool(trace and trace.config_hash),
            "diff": "none",
            "config_hash": trace.config_hash if trace else "",
            "span_id": span_id
        }
    finally:
        session.close()


@app.get("/api/otel/preview")
async def get_otel_preview(trace_id: str):
    """Get OpenTelemetry export preview for a trace."""
    session = Session()
    try:
        trace = session.query(TelemetryTrace).filter_by(trace_id=trace_id).first()
        if not trace:
            raise HTTPException(status_code=404, detail="Trace not found")
        
        spans = session.query(TelemetrySpan).filter_by(trace_id=trace_id).all()
        
        otel_spans = []
        for span in spans:
            otel_spans.append({
                "traceId": trace_id,
                "spanId": span.span_id,
                "parentSpanId": span.parent_span_id,
                "name": span.kind,
                "kind": "SPAN_KIND_INTERNAL",
                "startTimeUnixNano": int(span.start_timestamp.timestamp() * 1e9),
                "endTimeUnixNano": int(span.end_timestamp.timestamp() * 1e9),
                "attributes": {
                    "model.provider": span.model_provider,
                    "model.name": span.model_name,
                    "tokens.in": span.tokens_in,
                    "tokens.out": span.tokens_out,
                    "signature.verified": span.signature_verified
                },
                "status": {"code": 1 if span.status == "ok" else 2}
            })
        
        return {
            "trace_id": trace_id,
            "spans": otel_spans,
            "logs": [],
            "metrics": []
        }
    finally:
        session.close()


@app.post("/api/demo/seed")
async def seed_demo():
    """Trigger demo data seeding (mock endpoint)."""
    return {"status": "ok", "message": "Demo data seeded successfully"}


@app.post("/api/demo/simulate_incident")
async def simulate_incident():
    """Simulate an incident by creating error spans."""
    session = Session()
    try:
        anomalies = session.query(func.count(TelemetryAnomaly.anomaly_id)).scalar() or 0
        return {
            "status": "ok",
            "message": "Incident simulated",
            "anomalies": anomalies + 5
        }
    finally:
        session.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
