# AgentOS Mock - 5-Minute Demo Script

This guide provides a scripted walkthrough optimized for demonstrations (e.g., YC pitch).

## Demo Flow (5 minutes)

### 1. Dashboard Overview (60 seconds)

**Navigate to:** Dashboard page

**Key Points:**
- "AgentOS provides comprehensive observability for multi-agent systems"
- **Point to KPI cards:**
  - Total invocations across all agents
  - Cost tracking in real-time
  - Latency metrics (P95)
  - Error rates
- **Highlight:** "Verified Telemetry Coverage shows what percentage of our agent interactions have cryptographic signatures"

**Visual:** Cost charts by provider and agent

**Quote:** "Unlike traditional observability, we track costs at the agent and provider level - critical for FinOps in AI systems"

---

### 2. Agent Catalog (45 seconds)

**Navigate to:** Catalog page

**Key Points:**
- "Here's our registry of all agents across the organization"
- **Demo filters:**
  - Filter by protocol (A2A, MCP, HTTP)
  - Filter by Verified Telemetry badge
- **Click on an agent card**

**Highlight Badges:**
- ✓ **Verified Telemetry** - Cryptographically signed traces
- ✓ **Policy-Clean** - Passes all governance checks
- ✓ **Cost-Tagged** - Full cost attribution

**Quote:** "We support heterogeneous agent protocols - A2A, MCP, HTTP, gRPC, queues - unified observability regardless of how agents communicate"

---

### 3. Sequence Diagram (90 seconds) **⭐ STAR FEATURE**

**Navigate to:** Sequence Diagram page

**Key Points:**
- "This is the unique value prop - **inter-agent edge tracking**"
- **Select a trace** with multiple agents (e.g., Router → Retriever → Planner → Writer)

**Walkthrough:**
1. **Point to swimlanes:** "Each lane is an agent - Router, Retriever, Planner, Writer"
2. **Point to arrows:** "These are edges - actual inter-agent communications"
3. **Highlight protocol badges:** "A2A, MCP, HTTP - we track the channel used"
4. **Point to signature badges:**
   - Green checkmark = verified
   - Red exclamation = signature failure (potential tampering)

**Click on an edge** to open EdgeInspector:
- **Content hash** - for integrity
- **Signature verification** status
- **Size and instruction type**
- **From/To span IDs** - full lineage

**Quote:** "Most observability tools treat agents as black boxes. We track every hop, every handoff, with cryptographic verification. This is critical for trust and debugging in multi-agent workflows."

---

### 4. Trace Explorer (60 seconds)

**Navigate to:** Trace Explorer page

**Key Points:**
- **Select a trace** from the list
- **Show hierarchical span view** with expand/collapse

**Expand a span:**
- Model provider and name
- Token counts (in/out)
- **Redacted excerpts** - "PII automatically masked"
- **Policies enforced** - badges showing which policies applied
- Duration and status

**Quote:** "Every span shows model parameters, token usage for cost attribution, and policy enforcement - compliance built-in, not bolted-on"

---

### 5. Policy Enforcement (45 seconds)

**Navigate to:** Policies page

**Key Points:**
- **Show YAML policies:**
  - RBAC (role-based access)
  - Budget caps per role
  - PII redaction patterns
  - Domain allowlists

**Run live policy test:**
1. Set role = "Developer"
2. Set action = "invoke"
3. Set budget = 5000 cents ($50)
4. **Click "Run Policy Evaluation"**

**Result:**
- Shows **ALLOW** or **DENY**
- Lists **obligations** (redact email, enforce budget cap, domain allowlist)

**Quote:** "Policies aren't just governance theater - they enforce real-time budget limits, redact PII, and restrict external API calls. Every decision is audited."

---

### 6. Replay & Determinism (30 seconds) **BONUS**

**Back to:** Trace Explorer

**Key Points:**
- Find a trace with `config_hash` (deterministic)
- **Click "Replay" button** (if UI supports)

**Show:**
- "Deterministic" badge
- Config hash displayed
- Output matches original exactly

**Quote:** "For debugging and compliance, we support deterministic replay - same inputs, same outputs, provable."

---

## Quick Demo Talking Points

### Problem Statement:
"Multi-agent systems are the future of AI - but they're a black box. When Agent A calls Agent B calls Agent C, who failed? Who's spending money? Was the data tampered with?"

### Solution Highlights:
1. **Inter-agent edge tracking** with cryptographic verification
2. **Protocol-agnostic** - A2A, MCP, HTTP, gRPC, queues
3. **Policy enforcement** - budget caps, PII redaction, RBAC
4. **Cost attribution** - per-agent, per-model, per-provider
5. **Deterministic replay** for debugging

### Why Now:
"Every company is building multi-agent systems. Tools like LangChain, AutoGPT, CrewAI - but no one has observability. You can't manage what you can't measure."

### Competitive Advantage:
"Traditional APM (Datadog, New Relic) treats LLM calls as black boxes. LLM observability tools (LangSmith, Helicone) don't understand multi-agent graphs. We do both."

---

## Demo Tips

1. **Start with Sequence Diagram** if time is limited (30 sec version)
2. **Always show a signature failure** edge - it's visceral
3. **Use real agent names** (Writer, Planner) not IDs
4. **Emphasize cost** - executives care about $$
5. **End with policy test** - shows it's not just logging

---

## Technical Demo (Extended - 10 min)

If you have technical audience:

1. **Show API docs** - FastAPI Swagger UI at `/api/docs`
2. **Demonstrate ATP → OTel mapping** - export preview
3. **Show anomaly detection** - injection attempts flagged
4. **Explain signature scheme** - content hashing + verification
5. **Walk through seed data generation** - realistic workflows

---

## Local Demo Setup

```bash
# Start everything
make demo

# Wait for services to be ready (~30 seconds)
# Open browser to http://localhost:5173

# If you need to reset data:
make clean
make demo
```

---

## Demo Data Highlights

The mock data includes:
- **150 traces** across 12 agents
- **1200 spans** with hierarchies 3-6 levels deep
- **400 inter-agent edges** showing realistic workflows
- **Multiple protocols**: A2A, MCP, HTTP, gRPC
- **Anomalies**: Injection attempts, signature failures, budget denials
- **Cost distribution**: OpenAI, Anthropic, Vertex, Bedrock

Recommended demo traces:
- Look for traces with 4+ agents (Router → Retriever → Planner → Writer)
- Pick traces with signature failures for impact
- Use traces with policy enforcement for compliance story
