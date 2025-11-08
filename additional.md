You are an expert repo refactorer. Update the existing `agentos-mock` project
to add a left sidebar and the YC demo workflows with MOCK data only.

# OBJECTIVE
Ship a polished YC demo UX that shows the full loop:
observe → govern → debug/replay → export/interop.
Keep the top navbar; ADD a persistent left sidebar.

# SCOPE
A) Web UI (React + Vite + Tailwind + shadcn/ui + VisX/Recharts)
B) Backend mocks (FastAPI) to support new screens
C) Seed data & demo tour
D) “Simulate Incident” path
E) Helm/values updates so routes work on GKE behind one host

# UI IA (left sidebar)
- Overview (Dashboard)
- Trace Explorer
- Sequence Diagram
- Flamegraph
- Policies & Audit
- Catalog
- OTel/Arize Preview
- Demo Mode (seed/reset)

Show tiny status pills in sidebar:
- Alerts (count of open anomalies)
- Verified Telemetry % (from `/api/kpi/verified`)

# ACCEPTANCE (must be visible in UI)
1) Sidebar renders on all pages; collapsible at md breakpoints.
2) 5-step YC demo flows in <10 clicks (see “DEMO SCRIPT” below).
3) “Replay” modal returns deterministic mock for selected span.
4) “Policy test” performs deny with obligations and writes audit row.
5) OTel Preview shows JSON mapping for the active trace.
6) “Simulate Incident” adds error spikes + visible alert banner.

# CODE TASKS

## 1) Web UI: structure & components
- Create `services/web-ui/src/layouts/AppLayout.tsx`
  - Two-column layout: sidebar (fixed 260px), content (scroll)
  - Sidebar items (icons from lucide-react): Dashboard, Trace Explorer, Sequence Diagram,
    Flamegraph, Policies & Audit, Catalog, OTel Preview, Demo Mode
  - Top-right: "Demo Tour" button and “Simulate Incident” button

- Add global store (Zustand) `src/store/ui.ts`
  - `sidebarCollapsed: boolean`
  - `alerts: {open: number}` and `verifiedPct: number`
  - Actions to set from API

- Pages to implement/upgrade:
  - `pages/Dashboard.tsx` (already exists) – add KPI pills + cards for:
    Verified Telemetry Coverage, Cost by Provider, Cost by Agent
  - `pages/TraceExplorer.tsx`
    - Left panel: list of recent traces (search by id/agent)
    - Right panel: **TraceWaterfall** with per-step cost/tokens & status
    - Span click → **SpanInspector** drawer (hashes, model params, redaction badges, “Replay”)
  - `pages/SequenceDiagram.tsx`
    - Swimlanes A→B→C; edges show protocol (A2A/MCP/HTTP) + signature chips
    - Edge click → **EdgeInspector** drawer (hashes, signature, payload size)
  - `pages/Flamegraph.tsx` – render hierarchical span flamegraph (VisX)
  - `pages/Policies.tsx` – show policy YAML, “Evaluate” playground; audit table below
  - `pages/Catalog.tsx` – cards with **Verified Telemetry**, **Policy-Clean**, **Cost-Tagged**
  - `pages/OtelPreview.tsx` – JSON viewer of `/api/otel/preview?trace_id=...`
  - `pages/DemoMode.tsx` – buttons: Reseed, Load Demo Tour

- Components (export from `src/components`):
  - `Sidebar.tsx` (active state syncs with router)
  - `TraceWaterfall.tsx`, `SpanInspector.tsx`
  - `SequenceGraph.tsx`, `EdgeInspector.tsx`
  - `CostCharts.tsx`, `Badges.tsx`, `AlertBanner.tsx`
  - `DemoTour.tsx` (guided steps using tiny state machine; no dependency on IntroJS)

- API client: `src/lib/api.ts` (typed)
  - `getKPIs() -> {invocations, cost7d, p95, errorRate, verifiedPct}`
  - `listTraces(params)`, `getTrace(id)`, `getSpans(traceId)`, `getEdges(traceId)`
  - `replaySpan(spanId)`, `evaluatePolicy(payload)`, `getAudit(params)`
  - `getOtelPreview(traceId)`, `seedDemo()`, `simulateIncident()`

## 2) Backend (FastAPI mocks)
Implement/extend endpoints in these apps. Return realistic structs.

- `services/observability/api-mock/app.py`
  - GET `/api/kpi/overview`
  - GET `/api/kpi/verified`
  - GET `/api/traces/:trace_id` → {trace, steps[]}
  - GET `/api/spans/:span_id`
  - GET `/api/edges?trace_id=...`
  - GET `/api/cost/summary?org_id=...&range=last_7d`
  - POST `/api/replay/:span_id` → {status:"ok", deterministic:true, diff:"none", config_hash:"..."}
  - POST `/api/demo/simulate_incident` → create error spikes + anomaly rows

- `services/policy-mock/app.py`
  - POST `/api/policy/evaluate` → {allow:false, obligations:["redact","block:external_domain"], policy_ids:["org.default.001"], trace_id:"..."}
  - GET `/api/policy/audit?limit=50`

- `services/observability/o11y-bridge-mock/app.py`
  - GET `/api/otel/preview?trace_id=...` → return mapped JSON of OTel spans/logs/metrics

- `services/runtime-mock/invoke.py` (ensure it emits ATP to ingest)
- `services/observability/ingest-mock/app.py` (already accepts POST; ensure it can ingest edges)

## 3) Seeds (rich demo)
- File: `db/seeds/generate_seeds.py`
  - Create: 3 orgs, 6 projects, 12 agents (A_writer, B_retriever, C_planner, D_router, etc.)
  - 150 traces; ~1200 spans; 400 edges
  - Include: signature_verified mix, injection attempts, tool-abuse retries, cost outliers
  - At least one trace flagged `deterministic` with `config_hash`
  - Precompute aggregates for KPIs and CostCharts
- Add `make demo` target:
  - runs alembic migrations
  - loads seed data
  - boots web-ui + APIs
- Add `make simulate-incident` → calls `/api/demo/simulate_incident`

## 4) Demo Tour (UI)
- `DemoTour.tsx` renders a small overlay with steps and “Next”
  Steps:
   1) Dashboard KPIs & **Verified Telemetry 97%**
   2) Trace Explorer → select “trace_demo_01”
   3) Sequence Diagram → show A→B→C with signature badges
   4) Policies & Audit → press “Evaluate deny” → audit row appears
   5) Trace Explorer → Span → **Replay** button → deterministic ✓
   6) OTel Preview → JSON export for current trace

## 5) Simulate Incident
- Top bar button calls `/api/demo/simulate_incident`
- Show `AlertBanner` (“Error% spiking; click to investigate”) → deep links to Trace Explorer filtered to failing agent
- Add seeded failing span with `status=error` and cost spike

## 6) Styling & polish
- Use shadcn/ui Cards & Badges
- Keep charts neutral (no custom colors)
- Mask all excerpts; show `redaction_mask_ids` in SpanInspector
- Chips: “Deterministic ✓” or “Nondet ⚠︎”

## 7) Routing
- Use React Router; routes:
  - `/dashboard` (default)
  - `/traces`, `/traces/:traceId`
  - `/sequence?traceId=...`
  - `/flamegraph?traceId=...`
  - `/policies`
  - `/catalog`
  - `/otel/preview?traceId=...`
  - `/demo`

## 8) GKE & Helm
- Chart `helm/agentos-mock`:
  - Single Ingress serving web-ui at `/` and api paths (`/api`, `/otel`, `/policy`) via nginx rewrites
  - Values to set hosts: `web.host`, `api.basePath=/api`
- Add Make targets:
  - `make build-push`
  - `make deploy-gke`
- Doc updates in `docs/DEPLOY_GKE.md` showing exact `helm upgrade --install ...`

# DEMO SCRIPT (for YC)
1) Open **Dashboard** → call out KPIs & Verified Telemetry bar.
2) Click **Trace Explorer** → open `trace_demo_01`; point out per-step cost/tokens.
3) Click **Sequence Diagram** → show A→B→C hops, protocol & signature chips.
4) Go to **Policies & Audit** → click **Evaluate** (deny) → 403 + audit row.
5) Back to **Trace Explorer** → open slow span → click **Replay** → deterministic ✓.
6) Open **OTel Preview** → show JSON export of mapped spans for Arize/Grafana.
7) Click **Simulate Incident** → banner pops → deep link back to failing span.

# QUALITY BARS
- Dashboard loads < 2s with seeded data.
- OTel preview returns within 500ms.
- Replay returns in < 300ms (mock).
- No external keys; all MOCK and deterministic where possible.

Proceed to implement all changes and update docs. Run:
- `make demo` (local)
- `make build-push && make deploy-gke` (GKE)
