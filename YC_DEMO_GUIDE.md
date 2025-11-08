# AgentOS YC Demo Guide

## Quick Start

```bash
# One-command setup
./scripts/setup-yc-demo.sh
```

## Demo Architecture

The YC demo showcases the full **observe → govern → debug/replay → export/interop** loop:

### UI Components

1. **Left Sidebar** - Persistent navigation with:
   - Dashboard (Overview KPIs)
   - Trace Explorer (Waterfall view + span inspection)
   - Sequence Diagram (Agent-to-agent communication)
   - Flamegraph (Hierarchical performance view)
   - Policies & Audit (Policy evaluation + audit trail)
   - Catalog (Agent registry with badges)
   - OTel Preview (OpenTelemetry export)
   - Demo Mode (Control panel)

2. **Top Bar**:
   - Demo Tour button (guided walkthrough)
   - Simulate Incident button (creates error spikes)
   - YC Demo badge

3. **Status Pills** (in sidebar):
   - Alert count (anomalies)
   - Verified Telemetry % (signature verification)

### Backend Services

| Service | Port | Purpose |
|---------|------|---------|
| **web-ui** | 5173 | React frontend |
| **api-mock** | 8004 | Observability API (traces, spans, KPIs) |
| **policy-mock** | 8006 | Policy evaluation + audit |
| **o11y-bridge-mock** | 8005 | OTel export mapping |
| **ingest-mock** | 8003 | Telemetry ingestion |
| **postgres** | 5432 | Data store |

---

## YC Demo Script (5-10 minutes)

### 1. Dashboard - Observability Overview
**Navigate to:** http://localhost:5173/dashboard

**Talking Points:**
- "Here's our observability dashboard showing real-time KPIs"
- Point out **Verified Telemetry Coverage** at 97%
- Show cost by provider and agent breakdowns
- Highlight recent traces and P95 latency

### 2. Trace Explorer - Deep Inspection
**Navigate to:** http://localhost:5173/traces

**Actions:**
1. Select `trace_demo_01` from the list
2. Open the waterfall view showing per-span timing
3. Click on a span to open the **Span Inspector** drawer

**Talking Points:**
- "Each span shows tokens consumed, cost, and model provider"
- "See the signature verification badges - this is deterministic"
- "Policy obligations show what was redacted or restricted"
- **Click "Replay" button** → deterministic execution proof

### 3. Sequence Diagram - Agent Communication
**Navigate to:** http://localhost:5173/sequence

**Talking Points:**
- "This shows agent-to-agent communication flows"
- "Each arrow represents a protocol: A2A, MCP, HTTP, or gRPC"
- "Signature chips show cryptographic verification"
- Click on an edge → **EdgeInspector** shows hashes and payload size

### 4. Policies & Audit - Governance
**Navigate to:** http://localhost:5173/policies

**Actions:**
1. Show the policy YAML (RBAC, budget caps, PII redaction)
2. Click **"Evaluate Deny"** in the playground
3. Watch the 403 response appear
4. Scroll down to see the new audit row

**Talking Points:**
- "Policies enforce RBAC, budget caps, and data redaction"
- "Every evaluation is audited with obligations"
- "This creates a compliance trail for regulated industries"

### 5. Span Replay - Deterministic Execution
**Navigate back to:** http://localhost:5173/traces

**Actions:**
1. Find a span with a **Deterministic ✓** badge
2. Click **Replay**
3. Show the `diff: none` result with matching `config_hash`

**Talking Points:**
- "Replay ensures identical behavior for debugging"
- "Config hash guarantees reproducibility"
- "Critical for compliance and incident analysis"

### 6. OTel Preview - Interoperability
**Navigate to:** http://localhost:5173/otel/preview?traceId=trace_3f81f28aa7114ff0

**Talking Points:**
- "We export to OpenTelemetry for maximum compatibility"
- "Works with Grafana, Arize, Datadog, Honeycomb, etc."
- Click **Copy JSON** → "Ready to send to any OTEL collector"

### 7. Simulate Incident - Live Demo
**Click:** "Simulate Incident" button in top bar

**Expected:**
- Red alert banner appears: "Error% spiking in agent_writer"
- Click "investigate" → deep links to failing spans
- Show anomaly detection in action

**Talking Points:**
- "Real-time anomaly detection and alerting"
- "Automatic root cause analysis"
- "Jump directly from alert to failing trace"

---

## API Endpoints for Live Demo

```bash
# KPIs
curl http://localhost:8004/api/kpi/overview
curl http://localhost:8004/api/kpi/verified

# Traces
curl "http://localhost:8004/api/traces?limit=10"
curl "http://localhost:8004/api/traces/trace_3f81f28aa7114ff0"

# Spans
curl "http://localhost:8004/api/spans?trace_id=trace_3f81f28aa7114ff0"

# Replay
curl -X POST "http://localhost:8004/api/replay/span_7957566976064a37"

# OTel Export
curl "http://localhost:8004/api/otel/preview?trace_id=trace_3f81f28aa7114ff0"

# Policy Evaluation
curl -X POST http://localhost:8006/api/policy/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "org_001",
    "user_role": "viewer",
    "agent_id": "agent_writer",
    "action": "invoke",
    "budget_remaining_cents": 5000
  }'

# Policy Audit
curl "http://localhost:8006/api/policy/audit?limit=20"
```

---

## Key Value Props for YC

### 1. **Verified Telemetry** (97%+)
- Cryptographic signatures on all spans
- Immutable audit trail
- Compliance-ready

### 2. **Deterministic Replay**
- Reproduce bugs exactly
- Config-hash verified execution
- Critical for debugging production

### 3. **Policy-as-Code Governance**
- RBAC, budget caps, PII redaction
- Obligations enforced at runtime
- Auditable for SOC2/HIPAA

### 4. **Multi-Protocol Support**
- A2A, MCP, HTTP, gRPC, Queue
- Protocol-agnostic observability
- Future-proof architecture

### 5. **OpenTelemetry Compatibility**
- Export to any OTEL collector
- No vendor lock-in
- Works with existing tools

---

## Architecture Highlights

### Agent Communication Flow
```
User → Runtime → Agent A → Agent B → Agent C
         ↓          ↓         ↓         ↓
      Policy    Ingest    Ingest    Ingest
                  ↓         ↓         ↓
              Postgres ← O11y Bridge → OTel Export
```

### Data Model
- **Traces**: End-to-end invocation records
- **Spans**: Individual agent operations
- **Edges**: Agent-to-agent communication
- **Audits**: Policy evaluation decisions
- **Anomalies**: Detected incidents

---

## Demo Data Stats

- **12 agents** across 3 orgs
- **150 traces** with full telemetry
- **1,204 spans** with model usage
- **456 edges** showing agent communication
- **Policy audits** with obligations
- **Cost aggregates** by provider and agent

---

## Troubleshooting

### Services not starting
```bash
docker compose down -v
docker compose up -d postgres
sleep 5
make migrate && make seed
docker compose up -d
```

### Web UI not loading
```bash
cd services/web-ui
npm install
cd ../..
docker compose build web-ui
docker compose up -d web-ui
```

### API returning empty data
```bash
# Re-seed the database
make seed

# Check service logs
docker compose logs api-mock
docker compose logs policy-mock
```

### Port conflicts
```bash
# Check what's using the ports
lsof -i :5173  # web-ui
lsof -i :8004  # api-mock
lsof -i :8006  # policy-mock
lsof -i :5432  # postgres
```

---

## Next Steps After Demo

1. **Enhanced Seed Data** - Add `trace_demo_01` with specific scenarios
2. **Demo Tour** - Implement guided walkthrough component
3. **TraceWaterfall** - Enhanced waterfall visualization
4. **SpanInspector** - Detailed drawer with replay button
5. **EdgeInspector** - Communication details drawer
6. **Cost Charts** - Provider and agent cost breakdowns
7. **Helm Deployment** - GKE production setup

---

## Contact & Support

- **GitHub**: [agentos-mock](https://github.com/agentos/agentos-mock)
- **Docs**: See `docs/` directory
- **Status**: `IMPLEMENTATION_STATUS.md`

---

*Last Updated: 2025-11-07*
*Demo Version: YC Winter 2025*
