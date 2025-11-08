
> Goal: generate a **GKE-deployable mock** of AgentOS that demonstrates end‑to‑end **observe → govern → debug/replay → export** with **mock data only** (no external keys). Includes **sidebar UI**, **Mermaid diagrams**, **D3 Multi‑Agent Map** with rich tooltips & drawer, **path analysis**, **OTel preview**, and a **5‑minute YC demo script**.

---

## 0) High-Level Objective

Build `agentos-mock` — a demo-grade, production‑like system that shows:
- **Dashboard KPIs & Verified Telemetry Coverage**
- **Trace Explorer** (waterfall + span inspector)
- **Sequence Diagram** (Mermaid & live)
- **D3 Multi‑Agent Map** with hover widgets and right‑side details drawer
- **Policies & Audit** (RBAC/obligations; deny example)
- **Deterministic Replay** (mock parity)
- **OTel/Arize Preview** (JSON mapping)
- **Demo Mode** (seed/reset) & **Simulate Incident**

The app must run locally via `docker compose` and on **GKE** via **Helm**. Everything is **mocked** but realistic.

---

## 1) Repo Layout

Create or update to the following layout and **fully implement** all files:

```
agentos-mock/
├── services/
│   ├── runtime-mock/
│   │   ├── app.py
│   │   ├── deploy.py
│   │   ├── invoke.py
│   │   └── requirements.txt
│   ├── registry-mock/
│   │   ├── app.py
│   │   └── requirements.txt
│   ├── observability/
│   │   ├── ingest-mock/
│   │   │   ├── app.py
│   │   │   └── requirements.txt
│   │   ├── api-mock/
│   │   │   ├── app.py
│   │   │   └── requirements.txt
│   │   └── o11y-bridge-mock/
│   │       ├── app.py
│   │       └── requirements.txt
│   ├── policy-mock/
│   │   ├── app.py
│   │   ├── obligations.py
│   │   ├── policies/
│   │   │   ├── default.yaml
│   │   │   └── examples/
│   │   │       ├── deny_external_domains.yaml
│   │   │       └── budget_cap.yaml
│   │   └── requirements.txt
│   └── web-ui/  (React + Vite + Tailwind + shadcn/ui + Recharts + VisX + D3 + lucide-react)
│       ├── package.json
│       ├── src/
│       │   ├── layouts/AppLayout.tsx
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── TraceExplorer.tsx
│       │   │   ├── SequenceDiagram.tsx
│       │   │   ├── MultiAgentMap.tsx
│       │   │   ├── Flamegraph.tsx
│       │   │   ├── Policies.tsx
│       │   │   ├── Catalog.tsx
│       │   │   ├── OtelPreview.tsx
│       │   │   ├── DemoMode.tsx
│       │   │   └── Architecture.tsx
│       │   ├── components/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── AlertBanner.tsx
│       │   │   ├── Badges.tsx
│       │   │   ├── CostCharts.tsx
│       │   │   ├── DemoTour.tsx
│       │   │   ├── TraceWaterfall.tsx
│       │   │   ├── SpanInspector.tsx
│       │   │   ├── SequenceGraph.tsx
│       │   │   ├── EdgeInspector.tsx
│       │   │   ├── Mermaid.tsx
│       │   │   └── graph/
│       │   │       ├── D3Graph.tsx
│       │   │       ├── ForceLayout.ts
│       │   │       ├── LayeredLayout.ts
│       │   │       ├── Tooltip.tsx
│       │   │       ├── DetailsDrawer.tsx
│       │   │       ├── PathPanel.tsx
│       │   │       ├── Legend.tsx
│       │   │       └── Minimap.tsx
│       │   ├── diagrams/mermaid.ts
│       │   ├── lib/api.ts
│       │   ├── lib/format.ts
│       │   ├── lib/scales.ts
│       │   ├── store/ui.ts
│       │   └── store/graph.ts
│       └── vite.config.ts
├── db/
│   ├── alembic.ini
│   ├── migrations/
│   └── seeds/
│       ├── seed_config.yaml
│       └── generate_seeds.py
├── openapi/api.yaml
├── helm/agentos-mock/   (Helm chart)
├── infra/
│   ├── gke/
│   │   ├── skaffold.yaml
│   │   ├── ingress.yaml
│   │   └── kustomization.yaml (optional)
│   ├── k8s/ (if needed beyond Helm)
│   └── docker/ (Dockerfiles per service)
├── docker-compose.yml
├── Makefile
├── .env.example
└── docs/
    ├── DEPLOY_GKE.md
    ├── DEMO_GUIDE.md
    └── ARCHITECTURE_MOCK.md
```

---

## 2) Backend — APIs (FastAPI, Mock Only)

### Observability API (`services/observability/api-mock/app.py`)
Implement endpoints:
- `GET /api/healthz`
- `GET /api/kpi/overview` → `{ invocations, cost7d, p95, errorRate }`
- `GET /api/kpi/verified` → `{ verifiedPct }`
- `GET /api/traces/:trace_id` → `{ trace, steps[] }`
- `GET /api/spans/:span_id` → span details with model params, redaction masks
- `GET /api/edges?trace_id=` → edge list
- `GET /api/cost/summary?org_id=&range=last_7d`
- `POST /api/replay/:span_id` → `{ status:'ok', deterministic:true|false, diff, config_hash }`
- `POST /api/demo/simulate_incident` → inserts error spikes and anomaly rows
- `GET /api/otel/preview?trace_id=` → JSON mapping of ATP→OTel spans/logs/metrics
- `GET /api/graph?trace_id=` → **Multi‑Agent Map** payload:
  ```json
  {
    "trace": { "trace_id": "TRC-001", "org_id": "demo", "start_ts": "...", "end_ts": "..." },
    "nodes": [{
      "id":"A_router:span_01","label":"A_router","role":"agent",
      "version":"v12","prompt_excerpt":"Route user query…","latency_ms":1240,
      "tokens_in":210,"tokens_out":67,"cost_cents":12,"confidence":0.86,
      "hallucination_score":0.08,"guardrail_passed":true,"rbac_decision":"allow",
      "signature_verified":true,"status":"success","deterministic":true,
      "risk_flags":[],"policy_ids":["org.default.budget-cap"],"config_hash":"H-abc123"
    }],
    "edges": [{
      "id":"E-101","from":"A_router:span_01","to":"B_retriever:span_07",
      "protocol":"a2a","size_bytes":8123,"signature_verified":true,
      "latency_ms":340,"status":"success","risk_flags":[],"edge_confidence":0.81
    }],
    "stats": { "node_count": 38, "edge_count": 52, "error_nodes": 1,
               "avg_confidence": 0.79, "avg_hallucination": 0.12 },
    "paths": [{
      "id": "path_1",
      "nodes": ["A_router:span_01","B_retriever:span_07","C_planner:span_09"],
      "edges": ["E-101","E-102"],
      "total_latency_ms": 2100,
      "cumulative_hallucination": 0.19,
      "min_confidence": 0.64,
      "policy_outcomes": ["allow","allow"],
      "red_flags": []
    }]
  }
  ```
- `GET /api/graph/search?q=` → fuzzy search nodes by `label`/`id`

### Policy API (`services/policy-mock/app.py`)
- `POST /api/policy/evaluate` → `{ allow, obligations[], policy_ids[], trace_id }`
- `GET /api/policy/audit?limit=50` → last decisions
- Include example policies (YAML) under `policies/examples/`:
  - `deny_external_domains.yaml`
  - `budget_cap.yaml`

### Ingest API (`services/observability/ingest-mock/app.py`)
- `POST /api/telemetry/events` → accept ATP v0/v0.1 mock events (traces, spans, edges)

### Runtime Mock (`services/runtime-mock/invoke.py`)
- On invoke, emit ATP to ingest; return envelope with `trace_id`, `latency_ms`, `status`, excerpts (masked).

---

## 3) Database & Seeds

Use Postgres (or SQLite for local). Create tables:
- `telemetry_traces`, `telemetry_spans`, `telemetry_edges`, `telemetry_anomalies`
- `cost_aggregates`, `policy_audit`, `agent_registry`
- `graph_snapshots(trace_id, payload_json)` — denormalized graph for `/api/graph`

Seed script `db/seeds/generate_seeds.py` must create:
- 3 orgs, 6 projects, 12 agents (mix of A/B)
- 150 traces, ~1200 spans, 400 edges
- At least **one complex trace** (≥40 nodes, ≥50 edges) with mixed roles
- Confidence/hallucination distributions; 3+ red-flag nodes (guardrail fail, RBAC deny, timeout)
- One deterministic span with `config_hash` (for replay demo)
- Aggregates for dashboard/cost charts

Make targets:
```
make demo            # migrations + seeds + run all services (docker compose)
make simulate-incident
```

---

## 4) Web UI — Navigation & Pages

### Global Layout
- Keep top navbar; **add left sidebar** (fixed 260px, collapsible) with items:
  - Dashboard · Trace Explorer · Sequence Diagram · **Multi‑Agent Map** · Flamegraph · Policies & Audit · Catalog · **Architecture** · OTel Preview · Demo Mode
- Sidebar shows small pills: **Alerts (count)** and **Verified Telemetry %**

### Pages (implement fully)
1) **Dashboard** — KPI cards, Verified Telemetry bar, Cost by Provider, Cost by Agent
2) **Trace Explorer** — list + waterfall; Span click → **Span Inspector** (drawer) with model/params, costs, masks, “Replay”
3) **Sequence Diagram** — toggle **Mermaid View / Live Graph**; edge protocol & signature chips
4) **Multi‑Agent Map (D3)** — see Section 5
5) **Flamegraph** — hierarchical span view
6) **Policies & Audit** — policy YAML examples; “Evaluate” to create deny record; audit table
7) **Catalog** — cards with badges: **Verified Telemetry**, **Policy‑Clean**, **Cost‑Tagged**
8) **Architecture** — Mermaid gallery (Section 6); export PNG
9) **OTel Preview** — show ATP→OTel JSON for current trace; copy button
10) **Demo Mode** — reseed button; “Demo Tour” launcher
11) **Simulate Incident** — top button; shows alert banner and deep links to failing span

---

## 5) D3 Multi‑Agent Map (Rich Tooltips + Drawer + Path Analysis)

Create `pages/MultiAgentMap.tsx` and components under `components/graph/`:

- **D3Graph.tsx**: main renderer (SVG; auto‑switch to Canvas for >800 nodes). Zoom/pan; fit‑to‑screen; reset.
- **Layouts**: `ForceLayout.ts` (d3‑force) and `LayeredLayout.ts` (dagre). Toggle in toolbar.
- **Tooltip.tsx** (hover): shows label/role, prompt excerpt (masked), latency, tokens, cost, **confidence**, **hallucination**, badges for **guardrail**, **RBAC**, **status**; small sparkline.
- **DetailsDrawer.tsx** (click): right side sheet with tabs **Overview | Telemetry | Policy | Cost | Logs**; buttons: **Replay**, **Open Trace**, **Open Policy**, **OTel Preview**.
- **Legend.tsx**: encodes color scales (by status/role/confidence/hallucination) + protocol markers; solid ring = signature verified; dashed = not verified; red flag dot for risk.
- **Minimap.tsx**: small overview with viewport rectangle.
- **PathPanel.tsx**: computes and displays selected path KPIs:
  - **Total latency**, **min confidence**, **cumulative hallucination risk**, **policy outcomes** (allow/deny), and list of **red flags** along the path.
  - Provide a “Select path” dropdown sourced from `/api/graph` → `paths[]`. On change, highlight nodes/edges of the path and scroll drawer to **Path** tab.

**Toolbar controls (top of page):**
- Search input (debounced → `/api/graph/search`)
- Layout toggle: **Layered (default)** / **Force**
- Color by: **status | role | confidence | hallucination**
- Checkboxes: **Show tool nodes**, **Show system nodes**
- Buttons: **Fit**, **Reset**, **Export PNG**, **Export SVG**

**Interaction:**
- Hover → Tooltip
- Click node/edge → Drawer with details
- Shift‑click two nodes → compute & display **shortest path** (by hops) and show metrics in PathPanel
- “Open in Trace Explorer” button deep‑links to `/traces/:traceId`

---

## 6) Mermaid Diagrams in UI

Create `components/Mermaid.tsx` with props `{ chart, theme, toolbar }`; support **Copy** and **Export PNG**.  
Add `pages/Architecture.tsx` with tabs and the following diagram strings in `diagrams/mermaid.ts`:

```ts
export const mseq_agents = `
sequenceDiagram
  autonumber
  participant User
  participant Router as A_Router (Agent)
  participant Retriever as B_Retriever (Agent)
  participant Planner as C_Planner (Agent)
  participant Tool as WebTool(API)
  User->>Router: /invoke (trace_id=TRC-001)
  note right of Router: signature_verified = true
  Router->>Retriever: a2a.search(query) [edge_id=E-101]
  Retriever-->>Router: results (signature_verified=true)
  Router->>Planner: a2a.plan(results) [edge_id=E-102]
  Planner->>Tool: http.fetch(url) [edge_id=E-103]
  Tool-->>Planner: payload (size=24KB)
  Planner-->>Router: plan + citations
  Router-->>User: final response (config_hash=H-abc123)
`

export const mflow_ingest = `
flowchart LR
  subgraph Client
    UI[Web UI] -->|ATP events| GW[Gateway]
  end
  GW --> INJ[Observability Ingest]
  INJ --> DB[(Telemetry DB)]
  INJ --> O11Y[ATP->OTel Bridge]
  O11Y --> COL[OTel Collector]
  COL --> GRAF[Grafana/Arize]
  GW --> OPA[OPA/Obligations]
  OPA --> AUD[Policy Audit Log]
`

export const mstate_policy = `
stateDiagram-v2
  [*] --> Evaluate
  Evaluate --> Allow : RBAC ok & budget ok
  Evaluate --> Deny  : RBAC fail
  Evaluate --> AllowWithObligations : PII found / redaction
  AllowWithObligations --> [*]
  Deny --> [*]
  Allow --> [*]
`

export const mclass_entities = `
classDiagram
  class Trace { +string trace_id +string agent_id +string version_id +int cost_cents +bool signature_verified }
  class Span  { +string span_id +string parent_span_id +string kind +int duration_ms +string status }
  class Edge  { +string edge_id +string from_agent_id +string to_agent_id +string protocol +bool signature_verified }
  Trace "1" o-- "many" Span
  Trace "1" o-- "many" Edge
`
```

---

## 7) OTel/Arize Preview (Stub)

Add `GET /api/otel/preview?trace_id=` returning the would‑be OTel spans/logs/metrics as JSON. UI page `/otel/preview` renders a copyable viewer.

---

## 8) Make, Docker, Helm, GKE

**Makefile targets:**
```
make demo                 # local: compose up, run migrations, seed
make simulate-incident    # trigger incident via API
make build-push           # build & push all images to registry (param: REGISTRY?=gcr.io/<PROJECT>)
make deploy-gke           # helm upgrade --install agentos-mock ./helm/agentos-mock
```

**Helm chart:**
- One public host, path‑based routing:
  - `/` → web-ui
  - `/api` → observability api
  - `/policy` → policy api
  - `/otel` → o11y-bridge mock
- Values:
  - `image.registry`, `web.host`, `api.basePath=/api`
- Option: Cloud SQL Postgres or in‑cluster Postgres (bitnami subchart)

**docs/DEPLOY_GKE.md (include exact commands):**
```
gcloud auth login
gcloud config set project <YOUR_PROJECT>
gcloud container clusters create agentos-mock --zone us-central1-a --num-nodes=3
gcloud container clusters get-credentials agentos-mock --zone us-central1-a

export REGISTRY=gcr.io/<YOUR_PROJECT>
make build-push
helm upgrade --install agentos-mock ./helm/agentos-mock -n agentos --create-namespace \
  --set image.registry=$REGISTRY \
  --set web.host=mock.<your-domain.com>
```

---

## 9) Demo Tour & YC Script

**Demo Tour** (`components/DemoTour.tsx`) steps:
1) Dashboard KPIs & **Verified Telemetry 97%**.
2) Trace Explorer → open `trace_demo_01`; span costs & tokens.
3) Sequence Diagram → A→B→C; protocol & signature badges.
4) Policies & Audit → **Evaluate deny** → 403; audit row appears.
5) Trace Explorer → open slow span → **Replay** → **Deterministic ✓**.
6) OTel Preview → show export JSON.
7) Multi‑Agent Map → hover a red‑flag node; open drawer; open **Path Analysis**; show cumulative risk.

**Simulate Incident:** button in top bar. Shows `AlertBanner` with link to failing span.


---

## 10) Acceptance Criteria (must pass)

- Seed ≥150 traces / ~1200 spans / 400 edges in <30s locally.
- Dashboard loads <2s; OTel preview <500ms; Replay <300ms (mock).
- Policies: deny example writes audit row; obligations shown.
- Multi‑Agent Map:
  - Hover tooltips show prompt excerpt, latency, confidence, hallucination, guardrail/RBAC badges.
  - Drawer shows full details + actions.
  - **PathPanel** computes totals and highlights path.
  - Color by: status/role/confidence/hallucination.
  - Auto‑switch to Canvas for >800 nodes.
- GKE deploy works via Helm with a single host and path routing.
- No external keys; excerpts are masked; no PII in headers/logs.

---

## 11) Quality Bars & Tests

- **Playwright** smoke tests:
  - `/dashboard` renders KPI cards
  - `/traces` shows waterfall and opens Span Inspector
  - `/map` renders ≥30 nodes; hover shows “Confidence”; click opens drawer
  - Color switch affects node styles
- **Pytest** unit tests:
  - policy evaluation outputs deny with obligations
  - OTel mapping contains required resource attrs
  - graph path analysis returns correct aggregates

---

## 12) Commands (local)

```
cp .env.example .env
docker compose up -d --build
make demo
open http://localhost:5173
```

---

## 13) Notes & Constraints

- Everything is **mocked**: use deterministic seeds where possible (`config_hash`).
- Keep UI responsive; avoid heavy libraries beyond listed.
- Charts must not set custom colors (let the lib pick defaults).
- Respect redaction: only masked excerpts displayed; store `redaction_mask_ids`.

---

**Build now. Ensure `make demo` works locally and `make deploy-gke` works with defaults.**

