"""Mock data generator for AgentOS."""
import sys
import os
import random
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import yaml

# Add parent directories to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import (
    Base, TelemetryTrace, TelemetrySpan, TelemetryEdge, TelemetryAnomaly,
    CostAggregate, PolicyAudit, AgentRegistry,
    SpanKind, Protocol, SpanStatus, AnomalyType
)


class SeedGenerator:
    def __init__(self, config_path: str, database_url: str):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)

        self.engine = create_engine(database_url)
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()

        self.agents_by_id = {}
        self.traces = []
        self.spans = []
        self.edges = []

    def generate_hash(self, content: str) -> str:
        """Generate SHA256 hash for content."""
        return hashlib.sha256(content.encode()).hexdigest()[:32]

    def generate_all(self):
        """Generate all mock data."""
        print("🌱 Starting seed generation...")
        start_time = datetime.now()

        # Step 1: Register agents
        print("📝 Registering agents...")
        self.register_agents()

        # Step 2: Generate traces with spans and edges
        print("🔄 Generating traces, spans, and edges...")
        self.generate_traces_and_spans()
        
        # Add spans to session and flush before edges to satisfy foreign keys
        for span in self.spans:
            self.session.add(span)
        self.session.flush()
        
        # Now add edges that reference the flushed spans
        for edge in self.edges:
            self.session.add(edge)
        self.session.flush()

        # Step 3: Generate anomalies
        print("⚠️  Generating anomalies...")
        self.generate_anomalies()

        # Step 4: Generate cost aggregates
        print("💰 Generating cost aggregates...")
        self.generate_cost_aggregates()

        # Step 5: Generate policy audits
        print("📋 Generating policy audits...")
        self.generate_policy_audits()

        # Commit all data
        print("💾 Committing to database...")
        self.session.commit()

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print(f"\n✅ Seed generation complete in {duration:.2f}s")
        print(f"   - {len(self.agents_by_id)} agents registered")
        print(f"   - {len(self.traces)} traces generated")
        print(f"   - {len(self.spans)} spans generated")
        print(f"   - {len(self.edges)} edges generated")

    def register_agents(self):
        """Register all agents from config."""
        for agent_config in self.config['agents']:
            agent = AgentRegistry(
                agent_id=agent_config['agent_id'],
                org_id=agent_config['org_id'],
                project_id=agent_config['project_id'],
                name=agent_config['name'],
                description=agent_config['description'],
                runtime_type=agent_config['runtime_type'],
                protocol=Protocol[agent_config['protocol'].upper()],
                health_status="healthy",
                badges={
                    "verified_telemetry": random.random() > 0.2,
                    "policy_clean": random.random() > 0.15,
                    "cost_tagged": True
                },
                last_health_check=datetime.utcnow(),
                created_at=datetime.utcnow() - timedelta(days=random.randint(30, 180)),
                updated_at=datetime.utcnow()
            )
            self.session.add(agent)
            self.agents_by_id[agent_config['agent_id']] = agent_config

    def generate_traces_and_spans(self):
        """Generate traces with realistic multi-agent workflows."""
        num_traces = self.config['generation']['num_traces']
        workflows = self.config['workflows']

        base_time = datetime.utcnow() - timedelta(days=7)

        for i in range(num_traces):
            # Pick a workflow
            workflow = random.choice(workflows)
            workflow_agents = [self.agents_by_id[aid] for aid in workflow['agents'] if aid in self.agents_by_id]

            if not workflow_agents:
                continue

            # Primary agent for this trace
            primary_agent = workflow_agents[0]

            trace_id = f"trace_{uuid.uuid4().hex[:16]}"
            invocation_id = f"inv_{uuid.uuid4().hex[:12]}"

            # Random timestamp within last 7 days
            trace_start = base_time + timedelta(seconds=random.randint(0, 7 * 24 * 3600))

            # Config hash for deterministic replay (50% have it)
            config_hash = self.generate_hash(f"{trace_id}_config") if random.random() > 0.5 else None

            trace = TelemetryTrace(
                trace_id=trace_id,
                invocation_id=invocation_id,
                org_id=primary_agent['org_id'],
                project_id=primary_agent['project_id'],
                agent_id=primary_agent['agent_id'],
                version_id=f"v{random.randint(1, 5)}.{random.randint(0, 20)}.0",
                protocol=Protocol[primary_agent['protocol'].upper()],
                run_mode="production" if random.random() > 0.2 else "development",
                config_hash=config_hash,
                signature_verified=random.random() > 0.05,
                cost_cents=0,  # Will be calculated from spans
                start_timestamp=trace_start,
                end_timestamp=None  # Will be set after generating spans
            )

            self.session.add(trace)
            self.traces.append(trace)

            # Generate spans for this trace
            trace_spans = self.generate_spans_for_trace(
                trace, workflow_agents, trace_start
            )

            # Calculate total cost and end time
            total_cost_cents = sum(self.calculate_span_cost(s) for s in trace_spans)
            trace.cost_cents = total_cost_cents
            trace.end_timestamp = max(s.end_timestamp for s in trace_spans)

    def generate_spans_for_trace(
        self,
        trace: TelemetryTrace,
        workflow_agents: List[Dict],
        start_time: datetime
    ) -> List[TelemetrySpan]:
        """Generate hierarchical spans for a trace, including cross-agent calls."""
        num_spans = random.randint(*self.config['generation']['num_spans_per_trace_range'])
        trace_spans = []

        current_time = start_time
        parent_span = None

        # Generate root span
        root_agent = workflow_agents[0]
        root_span = self.create_span(
            trace_id=trace.trace_id,
            agent=root_agent,
            parent_span_id=None,
            start_time=current_time,
            kind=SpanKind.PROMPT
        )
        trace_spans.append(root_span)
        current_time = root_span.end_timestamp
        parent_span = root_span

        # Generate workflow spans (cross-agent calls)
        for i in range(1, min(len(workflow_agents), num_spans)):
            agent = workflow_agents[i]
            prev_agent = workflow_agents[i-1]

            # Create subagent span
            span = self.create_span(
                trace_id=trace.trace_id,
                agent=agent,
                parent_span_id=parent_span.span_id,
                start_time=current_time,
                kind=SpanKind.SUBAGENT
            )
            trace_spans.append(span)

            # Create edge between agents
            edge = self.create_edge(
                trace_id=trace.trace_id,
                from_agent=prev_agent,
                to_agent=agent,
                from_span=parent_span,
                to_span=span,
                timestamp=current_time
            )
            self.edges.append(edge)

            current_time = span.end_timestamp
            parent_span = span

        # Fill remaining spans with tools and prompts
        remaining_spans = num_spans - len(trace_spans)
        for _ in range(remaining_spans):
            agent = random.choice(workflow_agents)
            kind = random.choice([SpanKind.TOOL, SpanKind.PROMPT, SpanKind.NETWORK])

            span = self.create_span(
                trace_id=trace.trace_id,
                agent=agent,
                parent_span_id=parent_span.span_id if random.random() > 0.3 else None,
                start_time=current_time,
                kind=kind
            )
            trace_spans.append(span)
            current_time = span.end_timestamp

        return trace_spans

    def create_span(
        self,
        trace_id: str,
        agent: Dict,
        parent_span_id: str,
        start_time: datetime,
        kind: SpanKind
    ) -> TelemetrySpan:
        """Create a single span with realistic data."""
        span_id = f"span_{uuid.uuid4().hex[:16]}"

        # Duration based on kind
        if kind == SpanKind.PROMPT:
            duration_ms = random.randint(1000, 8000)
        elif kind == SpanKind.TOOL:
            duration_ms = random.randint(100, 2000)
        elif kind == SpanKind.SUBAGENT:
            duration_ms = random.randint(2000, 15000)
        else:
            duration_ms = random.randint(50, 1000)

        end_time = start_time + timedelta(milliseconds=duration_ms)

        # Token counts
        if kind in [SpanKind.PROMPT, SpanKind.SUBAGENT]:
            tokens_in = random.randint(100, 2000)
            tokens_out = random.randint(50, 1500)
        else:
            tokens_in = random.randint(0, 100)
            tokens_out = random.randint(0, 50)

        # Excerpts (masked)
        excerpts = f"[REDACTED] Request processed with {tokens_in} input tokens..."

        # Policy enforcement
        policy_enforced = []
        obligations = []
        if random.random() > 0.7:
            policy_enforced = ["pii_redaction", "rbac_check"]
            obligations = [{"type": "redaction", "fields": ["email", "ssn"]}]

        span = TelemetrySpan(
            span_id=span_id,
            trace_id=trace_id,
            parent_span_id=parent_span_id,
            kind=kind,
            model_provider=agent.get('model_provider'),
            model_name=agent.get('model_name'),
            model_params={"temperature": 0.7, "max_tokens": 1024},
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            excerpts=excerpts,
            policy_enforced=policy_enforced,
            obligations=obligations,
            redaction_mask_ids=["mask_001", "mask_002"] if obligations else [],
            signature_verified=random.random() > 0.05,
            status=SpanStatus.SUCCESS if random.random() > 0.05 else SpanStatus.ERROR,
            duration_ms=duration_ms,
            content_hash_in=self.generate_hash(f"{span_id}_input"),
            content_hash_out=self.generate_hash(f"{span_id}_output"),
            start_timestamp=start_time,
            end_timestamp=end_time
        )

        self.spans.append(span)
        return span

    def create_edge(
        self,
        trace_id: str,
        from_agent: Dict,
        to_agent: Dict,
        from_span: TelemetrySpan,
        to_span: TelemetrySpan,
        timestamp: datetime
    ) -> TelemetryEdge:
        """Create an edge between two agents."""
        edge_id = f"edge_{uuid.uuid4().hex[:16]}"

        edge = TelemetryEdge(
            edge_id=edge_id,
            trace_id=trace_id,
            from_agent_id=from_agent['agent_id'],
            from_agent_version=f"v{random.randint(1, 3)}.0.0",
            to_agent_id=to_agent['agent_id'],
            to_agent_version=f"v{random.randint(1, 3)}.0.0",
            from_span_id=from_span.span_id,
            to_span_id=to_span.span_id,
            channel=Protocol[to_agent['protocol'].upper()],
            instruction_type=random.choice(["invoke", "query", "stream", "batch"]),
            signature_verified=random.random() > self.config['generation']['signature_failure_rate'],
            size_bytes=random.randint(100, 50000),
            content_hash=self.generate_hash(f"{edge_id}_content"),
            timestamp=timestamp
        )

        self.edges.append(edge)
        return edge

    def calculate_span_cost(self, span: TelemetrySpan) -> int:
        """Calculate cost for a span in cents."""
        if not span.model_provider or not span.model_name:
            return 0

        cost_rates = self.config.get('cost_rates', {}).get(span.model_provider, {}).get(span.model_name, {})
        if not cost_rates:
            return 0

        input_cost = (span.tokens_in / 1000.0) * cost_rates.get('input', 0)
        output_cost = (span.tokens_out / 1000.0) * cost_rates.get('output', 0)

        return int((input_cost + output_cost) * 100)  # Convert to cents

    def generate_anomalies(self):
        """Generate anomalies for some spans."""
        anomaly_rate = self.config['generation']['anomaly_rate']

        for span in self.spans:
            if random.random() < anomaly_rate:
                anomaly_type = random.choice(list(AnomalyType))

                anomaly = TelemetryAnomaly(
                    anomaly_id=f"anom_{uuid.uuid4().hex[:16]}",
                    trace_id=span.trace_id,
                    span_id=span.span_id,
                    anomaly_type=anomaly_type,
                    severity=random.choice(["low", "medium", "high", "critical"]),
                    details={
                        "description": f"Detected {anomaly_type.value}",
                        "confidence": random.random()
                    },
                    detected_at=span.start_timestamp
                )
                self.session.add(anomaly)

    def generate_cost_aggregates(self):
        """Generate daily cost aggregates."""
        # Group by org, project, agent, provider, and date
        aggregates = {}

        for trace in self.traces:
            date_key = trace.start_timestamp.date()

            for span in self.spans:
                if span.trace_id != trace.trace_id:
                    continue

                if not span.model_provider:
                    continue

                key = (
                    trace.org_id,
                    trace.project_id,
                    trace.agent_id,
                    span.model_provider,
                    date_key
                )

                if key not in aggregates:
                    aggregates[key] = {
                        'cost_cents': 0,
                        'tokens_in': 0,
                        'tokens_out': 0,
                        'count': 0
                    }

                aggregates[key]['cost_cents'] += self.calculate_span_cost(span)
                aggregates[key]['tokens_in'] += span.tokens_in or 0
                aggregates[key]['tokens_out'] += span.tokens_out or 0
                aggregates[key]['count'] += 1

        # Create aggregate records
        for (org_id, project_id, agent_id, provider, date_key), stats in aggregates.items():
            agg = CostAggregate(
                org_id=org_id,
                project_id=project_id,
                agent_id=agent_id,
                provider=provider,
                date=datetime.combine(date_key, datetime.min.time()),
                total_cost_cents=stats['cost_cents'],
                total_tokens_in=stats['tokens_in'],
                total_tokens_out=stats['tokens_out'],
                invocation_count=stats['count']
            )
            self.session.add(agg)

    def generate_policy_audits(self):
        """Generate policy audit records."""
        budget_denial_rate = self.config['generation']['budget_denial_rate']

        for trace in self.traces:
            # Some traces have policy decisions
            if random.random() < 0.3:
                decision = "deny" if random.random() < budget_denial_rate else "allow"

                audit = PolicyAudit(
                    audit_id=f"audit_{uuid.uuid4().hex[:16]}",
                    trace_id=trace.trace_id,
                    policy_ids=["rbac_policy", "budget_policy", "redaction_policy"],
                    decision=decision,
                    obligations=[
                        {"type": "redaction", "fields": ["email"]},
                        {"type": "budget_cap", "remaining_cents": random.randint(0, 10000)}
                    ] if decision == "allow" else [],
                    decision_json={
                        "user_role": random.choice(["admin", "developer", "viewer"]),
                        "requested_budget": random.randint(100, 1000),
                        "reason": "Budget cap exceeded" if decision == "deny" else "Authorized"
                    },
                    evaluated_at=trace.start_timestamp
                )
                self.session.add(audit)


def main():
    config_path = os.path.join(os.path.dirname(__file__), "seed_config.yaml")
    database_url = os.getenv("DATABASE_URL", "postgresql://agentos:agentos@localhost:5432/agentos_mock")

    generator = SeedGenerator(config_path, database_url)
    generator.generate_all()


if __name__ == "__main__":
    main()
