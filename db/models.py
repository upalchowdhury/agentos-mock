"""Database models for AgentOS Mock."""
from sqlalchemy import (
    Column, String, Integer, BigInteger, Float, Boolean, DateTime, Text,
    JSON, ForeignKey, Enum as SQLEnum, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class SpanKind(str, enum.Enum):
    PROMPT = "prompt"
    TOOL = "tool"
    SUBAGENT = "subagent"
    SYSTEM = "system"
    NETWORK = "network"


class Protocol(str, enum.Enum):
    A2A = "a2a"
    MCP = "mcp"
    HTTP = "http"
    GRPC = "grpc"
    QUEUE = "queue"


class SpanStatus(str, enum.Enum):
    SUCCESS = "success"
    ERROR = "error"
    DENIED = "denied"


class AnomalyType(str, enum.Enum):
    INJECTION_ATTEMPT = "injection_attempt"
    TOOL_ABUSE = "tool_abuse"
    SIGNATURE_FAILURE = "signature_failure"
    BUDGET_EXCEEDED = "budget_exceeded"


class TelemetryTrace(Base):
    __tablename__ = "telemetry_traces"

    trace_id = Column(String(64), primary_key=True)
    invocation_id = Column(String(64), nullable=False)
    org_id = Column(String(64), nullable=False, index=True)
    project_id = Column(String(64), nullable=False, index=True)
    agent_id = Column(String(64), nullable=False, index=True)
    version_id = Column(String(64), nullable=False)
    protocol = Column(SQLEnum(Protocol), nullable=False)
    run_mode = Column(String(32), nullable=False)
    config_hash = Column(String(64), nullable=True)
    signature_verified = Column(Boolean, default=False)
    cost_cents = Column(Integer, default=0)
    start_timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_timestamp = Column(DateTime, nullable=True)

    # Relationships
    spans = relationship("TelemetrySpan", back_populates="trace", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_trace_org_time", "org_id", "start_timestamp"),
        Index("idx_trace_agent", "agent_id", "start_timestamp"),
    )


class TelemetrySpan(Base):
    __tablename__ = "telemetry_spans"

    span_id = Column(String(64), primary_key=True)
    trace_id = Column(String(64), ForeignKey("telemetry_traces.trace_id"), nullable=False, index=True)
    parent_span_id = Column(String(64), ForeignKey("telemetry_spans.span_id"), nullable=True)
    kind = Column(SQLEnum(SpanKind), nullable=False)

    # Model information
    model_provider = Column(String(32), nullable=True)
    model_name = Column(String(64), nullable=True)
    model_params = Column(JSON, nullable=True)

    # Token tracking
    tokens_in = Column(Integer, default=0)
    tokens_out = Column(Integer, default=0)

    # Content
    excerpts = Column(Text, nullable=True)
    policy_enforced = Column(JSON, nullable=True, default=list)
    obligations = Column(JSON, nullable=True, default=list)
    redaction_mask_ids = Column(JSON, nullable=True, default=list)

    # Status and verification
    signature_verified = Column(Boolean, default=False)
    status = Column(SQLEnum(SpanStatus), nullable=False, default=SpanStatus.SUCCESS)

    # Performance
    duration_ms = Column(Integer, nullable=False)

    # Hashes
    content_hash_in = Column(String(64), nullable=True)
    content_hash_out = Column(String(64), nullable=True)

    # Timestamps
    start_timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_timestamp = Column(DateTime, nullable=False)

    # Relationships
    trace = relationship("TelemetryTrace", back_populates="spans")
    children = relationship("TelemetrySpan", backref="parent", remote_side=[span_id])

    __table_args__ = (
        Index("idx_span_trace", "trace_id", "start_timestamp"),
        Index("idx_span_parent", "parent_span_id"),
    )


class TelemetryEdge(Base):
    __tablename__ = "telemetry_edges"

    edge_id = Column(String(64), primary_key=True)
    trace_id = Column(String(64), ForeignKey("telemetry_traces.trace_id"), nullable=False, index=True)

    # Agent information
    from_agent_id = Column(String(64), nullable=False)
    from_agent_version = Column(String(64), nullable=False)
    to_agent_id = Column(String(64), nullable=False)
    to_agent_version = Column(String(64), nullable=False)

    # Span linkage
    from_span_id = Column(String(64), ForeignKey("telemetry_spans.span_id"), nullable=False)
    to_span_id = Column(String(64), ForeignKey("telemetry_spans.span_id"), nullable=False)

    # Edge metadata
    channel = Column(SQLEnum(Protocol), nullable=False)
    instruction_type = Column(String(64), nullable=True)
    signature_verified = Column(Boolean, default=False)
    size_bytes = Column(Integer, default=0)
    content_hash = Column(String(64), nullable=True)

    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_edge_trace", "trace_id", "timestamp"),
        Index("idx_edge_from_agent", "from_agent_id"),
        Index("idx_edge_to_agent", "to_agent_id"),
    )


class TelemetryAnomaly(Base):
    __tablename__ = "telemetry_anomalies"

    anomaly_id = Column(String(64), primary_key=True)
    trace_id = Column(String(64), ForeignKey("telemetry_traces.trace_id"), nullable=False, index=True)
    span_id = Column(String(64), ForeignKey("telemetry_spans.span_id"), nullable=True)

    anomaly_type = Column(SQLEnum(AnomalyType), nullable=False)
    severity = Column(String(16), nullable=False)
    details = Column(JSON, nullable=True)
    detected_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_anomaly_trace", "trace_id", "detected_at"),
        Index("idx_anomaly_type", "anomaly_type", "detected_at"),
    )


class CostAggregate(Base):
    __tablename__ = "cost_aggregates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(String(64), nullable=False, index=True)
    project_id = Column(String(64), nullable=True, index=True)
    agent_id = Column(String(64), nullable=True, index=True)
    provider = Column(String(32), nullable=True)

    date = Column(DateTime, nullable=False, index=True)
    total_cost_cents = Column(Integer, default=0)
    total_tokens_in = Column(BigInteger, default=0)
    total_tokens_out = Column(BigInteger, default=0)
    invocation_count = Column(Integer, default=0)

    __table_args__ = (
        Index("idx_cost_org_date", "org_id", "date"),
        Index("idx_cost_agent_date", "agent_id", "date"),
    )


class PolicyAudit(Base):
    __tablename__ = "policy_audit"

    audit_id = Column(String(64), primary_key=True)
    trace_id = Column(String(64), ForeignKey("telemetry_traces.trace_id"), nullable=True, index=True)

    policy_ids = Column(JSON, nullable=False, default=list)
    decision = Column(String(16), nullable=False)  # allow/deny
    obligations = Column(JSON, nullable=True, default=list)
    decision_json = Column(JSON, nullable=True)

    evaluated_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("idx_audit_trace", "trace_id", "evaluated_at"),
        Index("idx_audit_decision", "decision", "evaluated_at"),
    )


class AgentRegistry(Base):
    __tablename__ = "agent_registry"

    agent_id = Column(String(64), primary_key=True)
    org_id = Column(String(64), nullable=False, index=True)
    project_id = Column(String(64), nullable=False, index=True)

    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    runtime_type = Column(String(32), nullable=False)  # Model A / Model B
    protocol = Column(SQLEnum(Protocol), nullable=False)

    health_status = Column(String(16), nullable=False, default="unknown")
    badges = Column(JSON, nullable=True, default=dict)

    last_health_check = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_agent_org", "org_id", "project_id"),
    )
