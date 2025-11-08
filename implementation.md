You are an expert repo bootstrapper and code generator. Create a production-like,
GKE-deployable **mock** of AgentOS that demonstrates all core functionalities
with **mock data** (no real provider keys required):

NAME: AgentOS Mock (codename: `agentos-mock`)
GOAL: Demo-ready in < 2 days: UI, APIs, span-level mapping, inter-agent sequence
      diagrams, CostOps, OPA policy decisions, OTel/Arize exporter stubs, GKE deploy.

======================================================================
A) SCOPE (what to build now)
======================================================================
1) Services (FastAPI + Python unless noted)
   - services/runtime-mock: simulate Model A deploy/invoke with fake execution
   - services/registry-mock: register external agents (Model B) + health probe
   - services/observability/ingest-mock: ingest ATP events (mock traces/spans)
   - services/observability/api-mock: query traces/logs/costs/anomalies
   - services/observability/o11y-bridge-mock: ATP→OTel/Arize exporter (stub)
   - services/policy-mock: OPA ext-authz stub + obligations engine (redaction)
   - services/web-ui (React + Vite + Tailwind + shadcn/ui + Recharts + VisX):
       * Org/Project/Agent dashboards
       * Trace Explorer (waterfall/DAG)
       * Flamegraph view
       * Inter-Agent Sequence Diagram (A→B→C, signature badges)
       * Edge Inspector drawer (hashes, signatures, policy)
       * Catalog (agents/tools/prompts with badges)
       * “Replay” modal (mocked)
   - scripts/demo/seed: generate rich mock data (traces, spans, edges, costs)

2) Data store
   - Use Postgres for demo (or SQLite fallback) for:
     `telemetry_traces`, `telemetry_spans`, `telemetry_edges`,
     `telemetry_anomalies`, `cost_aggregates`, `policy_audit`, `agent_registry`.
   - Include SQL migrations (alembic) + seeds.

3) APIs (mock)
   - POST /api/runtime/deploy (returns version_id)
   - POST /api/invoke/:agent_id (emits mock trace and cost)
   - POST /api/telemetry/events (ATP ingest for mock traces/spans/edges)
   - GET  /api/traces/:trace_id
   - GET  /api/spans/:span_id
   - GET  /api/edges?trace_id=...
   - GET  /api/cost/summary?org_id=...&range=last_7d
   - POST /api/policy/evaluate (returns allow/deny with obligations)
   - POST /api/replay/:span_id (mock: returns identical output + “deterministic” badge)
   - GET  /api/catalog/search?filters=...
   - GET  /api/healthz

4) Telemetry schema: **ATP v0 + v0.1 extensions (mock)**
   - trace: trace_id, invocation_id, org_id, agent_id, version_id, protocol,
            run_mode, config_hash, signature_verified, cost_cents, start/end
   - span: span_id, parent_span_id, kind(prompt|tool|subagent|system|network),
           model.provider/name/params, tokens_in/out, excerpts (masked),
           policy_enforced[], obligations[], signature_verified, status,
           duration_ms, content_hash_in/out
   - edge: edge_id, from_agent_id/version, to_agent_id/version,
           from_span_id, to_span_id, channel(a2a|mcp|http|grpc|queue),
           instruction_type, signature_verified, size_bytes, content_hash

5) OTel/Arize stubs
   - Map ATP→OTel spans/logs/metrics fields (no external call required)
   - Provide toggle `EXPORT_TO_OTEL=false` to keep purely local
   - Provide generated JSON preview of the would-be export

6) Governance mock
   - OPA-like decision function with YAML policies:
     * RBAC allow/deny by org/project/agent
     * Obligations: redaction, allowlist(enforced domains), budget caps
   - Record audit with decision JSON and trace_id

7) GKE deployment
   - Helm chart `helm/agentos-mock` for all services
   - K8s manifests: Deployments, Services, Ingress (GKE), ConfigMaps, Secrets
   - Optional: Cloud SQL Postgres or in-cluster Postgres (bitnami/postgresql subchart)
   - Makefile + skaffold.yaml for build/push/deploy
   - Docs: `docs/DEPLOY_GKE.md` with exact `gcloud` commands

8) Demo UX requirements
   - Seed script generates:
     * 3 orgs, 6 projects, 12 agents (mix A/B), 150 traces, 1200 spans, 400 edges
     * Latency/cost distributions, injection attempts, allow/deny cases
   - UI has a “Demo Mode” switch to reload seeds and show guided tour

======================================================================
B) REPO LAYOUT
======================================================================
Create the following structure and fill files with working code:

agentos-mock/
├── services/
│   ├── runtime-mock/
│   │   ├── app.py (FastAPI)
│   │   ├── deploy.py (mock deploy/versioning)
│   │   ├── invoke.py (emit mock traces)
│   │   └── requirements.txt
│   ├── registry-mock/
│   │   ├── app.py (register, health probe, badges)
│   │   └── requirements.txt
│   ├── observability/
│   │   ├── ingest-mock/
│   │   │   ├── app.py (POST /api/telemetry/events)
│   │   │   └── requirements.txt
│   │   ├── api-mock/
│   │   │   ├── app.py (traces/spans/edges/cost)
│   │   │   └── requirements.txt
│   │   └── o11y-bridge-mock/
│   │       ├── app.py (ATP→OTel mapping preview)
│   │       └── requirements.txt
│   ├── policy-mock/
│   │   ├── app.py (POST /api/policy/evaluate)
│   │   ├── obligations.py (redaction/allowlist/budget)
│   │   ├── policies/
│   │   │   └── default.yaml
│   │   └── requirements.txt
│   └── web-ui/
│       ├── package.json (React+Vite)
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── TraceExplorer.tsx
│       │   │   ├── Flamegraph.tsx
│       │   │   ├── SequenceDiagram.tsx
│       │   │   ├── Catalog.tsx
│       │   │   └── Policies.tsx
│       │   ├── components/
│       │   │   ├── TraceWaterfall.tsx
│       │   │   ├── SpanInspector.tsx
│       │   │   ├── EdgeInspector.tsx
│       │   │   ├── Badges.tsx
│       │   │   ├── CostCharts.tsx
│       │   │   └── DemoTour.tsx
│       │   └── lib/api.ts (typed API client)
│       └── vite.config.ts
├── db/
│   ├── alembic.ini
│   ├── migrations/ (create tables for traces/spans/edges/anomalies/cost/audit/registry)
│   └── seeds/
│       ├── seed_config.yaml
│       └── generate_seeds.py
├── openapi/
│   └── api.yaml (cover all routes above)
├── helm/agentos-mock/ (chart with values.yaml per environment)
├── infra/
│   ├── gke/
│   │   ├── skaffold.yaml
│   │   ├── kustomization.yaml (optional)
│   │   └── ingress.yaml (GKE Ingress w/ managed cert stub)
│   ├── docker/
│   │   └── Dockerfiles for each service
│   └── k8s/ (if not using Helm for everything)
├── Makefile
├── docker-compose.yml (local run with Postgres)
├── .env.example
└── docs/
    ├── DEPLOY_GKE.md
    ├── DEMO_GUIDE.md (scripted YC demo path)
    └── ARCHITECTURE_MOCK.md (diagrams + data flow)

======================================================================
C) IMPLEMENTATION DETAILS
======================================================================
1) MOCK DATA GENERATION (scripts/demo/seed)
   - Generate realistic inter-agent graphs:
     * Agents A_writer, B_retriever, C_planner, D_router
     * Protocol mix: a2a/mcp/http
     * Span kinds: prompt/tool/subagent/system/network
   - Costs and token counts: use distributions per provider (OpenAI/Anthropic/Vertex/Bedrock)
   - Introduce anomalies:
     * Injection attempt spans (flagged), tool abuse, signature_verified=false edges
     * Budget cap denials in policy-mock

2) TRACE & EDGE CREATION
   - `generate_seeds.py` should:
     * Insert N traces with M spans each (hierarchies 3–6 levels deep)
     * Create edges for cross-agent calls with edge_id, hashes, signatures
     * Pre-compute `config_hash` and mark some runs as deterministic
     * Write daily rolling cost aggregates (org/project/agent)

3) WEB UI REQUIREMENTS
   - Dashboard: KPIs: invocations, p95 latency, error rate, cost trend, verified telemetry coverage
   - Trace Explorer: waterfall/DAG with step → SpanInspector (model params, excerpts masked, hashes)
   - Flamegraph: collapsible, hover shows duration/tokens/cost
   - Sequence Diagram: A→B→C lanes; edge badges (protocol, signature state), click to EdgeInspector
   - Catalog: cards w/ badges: Verified Telemetry, Policy-Clean, Cost-Tagged
   - Policies page: show mock policy YAML, live “evaluate” test runner
   - “Replay” button on span/edge opens modal; POST to /api/replay/:span_id returns mocked identical output + note when nondeterminism flagged

4) OPA/POLICY MOCK
   - policies/default.yaml examples:
     * deny if user.role not in allowed_invokers
     * obligations: redact fields matching patterns; enforce domain allowlist
     * budget caps with remaining_cents carried in baggage
   - app responds with:
     { allow: bool, obligations: [...], policy_ids: [...], trace_id }

5) ATP→OTEL/ARIZE EXPORTER (stub)
   - Provide mapping table and endpoint:
     GET /api/otel/preview?trace_id=... → JSON of spans as they would be exported
   - Environment toggle `EXPORT_TO_OTEL` for future real export

6) COSTOPS
   - Adapter constants only; do NOT call vendors
   - Summaries by org/project/agent and by provider

7) SECURITY & PRIVACY (demo-grade)
   - Always mask excerpts; store redaction_mask_ids
   - No secrets in logs
   - Multi-tenant scoped via org_id in queries

======================================================================
D) ACCEPTANCE (MUST PASS)
======================================================================
- Seed 150 traces / ~1200 spans / ~400 edges in <30s locally
- UI loads:
  * Dashboard <2s
  * Trace Explorer shows full chain with costs/tokens
  * Flamegraph renders; zoom/pan; span detail drawer
  * Sequence Diagram shows A→B→C edges with protocol/signature badges
  * Catalog filters by protocol/runtime/telemetry badge
- Policy test: simulated deny (403) visible with audit entry
- Replay: POST returns same output + “deterministic” tag for seeded spans
- OTel preview endpoint returns mapped JSON for at least one trace

======================================================================
E) DEV EX TRAS (QUALITY)
======================================================================
- Add Playwright smoke tests for UI routes
- Add pytest for policies, ATP mapping, cost adapters
- Provide Mermaid diagrams in docs/ARCHITECTURE_MOCK.md
- Provide `make demo` (seed + start) and `make clean`

======================================================================
F) COMMANDS & ENV
======================================================================
Local:
  cp .env.example .env
  docker compose up -d --build
  make demo  # runs migrations + seeds + boots all services
  open http://localhost:5173  # web-ui

GKE (docs/DEPLOY_GKE.md should include):
  gcloud auth login
  gcloud config set project <YOUR_PROJECT>
  gcloud container clusters create agentos-mock --zone us-central1-a --num-nodes=3
  gcloud container clusters get-credentials agentos-mock --zone us-central1-a
  make build-push  # builds images + pushes to gcr.io/<YOUR_PROJECT>/*
  helm upgrade --install agentos-mock ./helm/agentos-mock -n agentos --create-namespace \
    --set image.registry=gcr.io/<YOUR_PROJECT> \
    --set web.host=mock.<your-domain.com>
  # After LoadBalancer/Ingress provision, open web host and run the demo tour.

======================================================================
G) FILES TO FULLY IMPLEMENT (NO STUBS LEFT)
======================================================================
- All FastAPI apps with real handlers and OpenAPI docs
- UI pages/components listed above (React + Tailwind + shadcn/ui + VisX/Recharts)
- DB migrations + seeds producing rich inter-agent graphs
- Helm chart values for local/gke; image tags set in values.yaml
- Makefile targets:
  make build | make build-push | make deploy-gke | make demo | make clean
- Docs: DEPLOY_GKE.md, DEMO_GUIDE.md with a 5-minute YC demo script:
  1) Dashboard KPIs → 2) Catalog badge filters → 3) Sequence Diagram cross-agent hop
  → 4) Span Inspector (policy/redaction) → 5) Replay modal → 6) OTel preview JSON

CONSTRAINTS:
- Do NOT require external API keys.
- Mock everything deterministically where possible (seeds carry config_hash).
- Keep services lightweight; prioritize UX polish and speed.

Now generate the entire repository with code, configs, migrations, seeds, helm chart,
skaffold, dockerfiles, Makefile, and documentation as specified. Ensure `make demo`
works locally and `helm upgrade --install` works on GKE with default values.
