# AgentOS Mock

A demo-ready, production-like observability platform for multi-agent AI systems with **inter-agent telemetry tracking**, policy enforcement, and cost attribution.

## 🌟 Key Features

### Unique Differentiators
- **Inter-Agent Edge Tracking** - Track communication flows between agents with cryptographic verification
- **Sequence Diagrams** - Visualize A→B→C agent flows with protocol and signature badges
- **Protocol-Agnostic** - Supports A2A, MCP, HTTP, gRPC, Queue protocols
- **Policy Enforcement** - RBAC, budget caps, PII redaction with obligations engine
- **Cost Attribution** - Per-agent, per-model, per-provider cost tracking
- **Deterministic Replay** - Config-hash based reproducibility

### Components
- **Dashboard** - KPIs, cost trends, verified telemetry coverage
- **Trace Explorer** - Hierarchical span viewer with policy enforcement details
- **Sequence Diagram** - Interactive swimlanes showing inter-agent communication (D3.js)
- **Catalog** - Agent registry with badge filtering (Verified, Policy-Clean, Cost-Tagged)
- **Policies** - YAML-based policy viewer with live evaluation test runner

## 🚀 Quick Start (Local)

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Run demo (migrations + seeds + all services)
make demo

# 3. Open browser
open http://localhost:5173
```

Services will be available at:
- Web UI: http://localhost:5173
- API: http://localhost:8004
- Other services: Check `docker-compose.yml`

## 📦 What's Included

### Backend Services (FastAPI + Python)
- `runtime-mock` - Agent deployment and invocation
- `registry-mock` - Agent registration and health monitoring
- `observability/ingest-mock` - ATP event ingestion
- `observability/api-mock` - Query traces, spans, edges, costs
- `observability/o11y-bridge-mock` - ATP→OTel/Arize export preview
- `policy-mock` - OPA-style policy evaluation with obligations

### Frontend (React + Vite + Tailwind + D3.js)
- Modern React 18 with TypeScript
- Custom D3 visualizations for sequence diagrams
- shadcn/ui components
- Recharts for cost analytics
- Fully responsive design

### Database (PostgreSQL)
- 7 tables: traces, spans, edges, anomalies, cost_aggregates, policy_audit, agent_registry
- Alembic migrations
- Mock data generator (150 traces, 1200 spans, 400 edges)

### Deployment
- Docker Compose for local development
- Helm chart for GKE deployment
- Dockerfiles for all services
- Makefile for common operations

## 🎯 Mock Data

The seed generator creates realistic scenarios:
- **Agents**: Writer, Retriever, Planner, Router, Analyzer, Validator, etc.
- **Workflows**: Content Generation, Research, Code Review, ETL, Compliance
- **Providers**: OpenAI, Anthropic, Vertex AI, Bedrock
- **Anomalies**: Injection attempts, signature failures, budget denials
- **Costs**: Realistic token distributions and pricing

Generation time: **<30 seconds**

## 🏗️ Architecture

```
┌─────────────┐
│   Web UI    │ (React + D3)
│  Port 5173  │
└──────┬──────┘
       │
┌──────┴──────────────────────────────────────┐
│          API Services (FastAPI)              │
│  runtime│registry│ingest│api│bridge│policy  │
│  :8001  │ :8002  │:8003 │:8004│:8005│:8006  │
└──────┬──────────────────────────────────────┘
       │
┌──────┴──────┐
│ PostgreSQL  │
│   :5432     │
└─────────────┘
```

## 📊 Sequence Diagram (Star Feature)

The sequence diagram visualizes inter-agent communication:
- **Swimlanes** for each agent
- **Arrows** showing edges with protocol badges (A2A/MCP/HTTP)
- **Signature verification** indicators (✓ verified, ! failed)
- **Click edges** to open EdgeInspector with content hashes
- **D3.js** powered interactive visualization

Example flow:
```
Router  Retriever  Planner  Writer
  │
  ├─[A2A]──>│
  │         ├─[MCP]──>│
  │         │         ├─[HTTP]──>│
  │<────────┴─────────┴──────────┘
```

## 🔧 Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 15 (or use Docker)

### Local Development

```bash
# Backend services
cd services/runtime-mock
pip install -r requirements.txt
python app.py

# Frontend
cd services/web-ui
npm install
npm run dev

# Database
cd db
python -m alembic upgrade head
cd seeds && python generate_seeds.py
```

### Build Docker Images

```bash
make build
```

## ☸️ GKE Deployment

See [docs/DEPLOY_GKE.md](docs/DEPLOY_GKE.md) for detailed instructions.

Quick deploy:
```bash
# 1. Build and push images
make build-push PROJECT_ID=your-gcp-project

# 2. Deploy with Helm
make deploy-gke PROJECT_ID=your-gcp-project
```

## 📖 Documentation

- [DEPLOY_GKE.md](docs/DEPLOY_GKE.md) - GKE deployment guide
- [DEMO_GUIDE.md](docs/DEMO_GUIDE.md) - 5-minute demo script
- [implementation.md](implementation.md) - Original spec

## 🧪 API Endpoints

All services expose OpenAPI docs at `/docs`:
- http://localhost:8004/docs (Main API)

Key endpoints:
- `GET /api/traces` - List traces
- `GET /api/spans` - List spans
- `GET /api/edges` - List inter-agent edges
- `GET /api/cost/summary` - Cost aggregates
- `POST /api/policy/evaluate` - Policy decisions
- `POST /api/replay/:span_id` - Deterministic replay

## 🎨 UI Screenshots

### Dashboard
KPIs, cost charts, verified telemetry coverage

### Sequence Diagram
Interactive agent communication visualization with D3

### Trace Explorer
Hierarchical span viewer with policy enforcement

### Catalog
Agent registry with badge filtering

### Policies
YAML viewer + live policy test runner

## 🛠️ Makefile Commands

```bash
make demo          # Full local demo
make build         # Build Docker images
make build-push    # Build and push to GCP
make deploy-gke    # Deploy to GKE
make migrate       # Run DB migrations
make seed          # Generate mock data
make clean         # Clean up
```

## 🎬 Demo Script

See [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md) for a guided 5-minute walkthrough.

Highlights:
1. Dashboard → Show KPIs and cost tracking
2. Catalog → Filter by badges and protocols
3. **Sequence Diagram** → The star feature (inter-agent edges)
4. Trace Explorer → Span details with policies
5. Policies → Live evaluation test

## 🔒 Security & Privacy

- **PII Redaction**: Automatic masking of sensitive fields
- **Signature Verification**: Cryptographic edge integrity
- **Multi-tenancy**: Org-scoped queries
- **Budget Caps**: Policy-enforced spending limits
- **Audit Trail**: Every policy decision logged

## 📝 Tech Stack

**Backend**:
- FastAPI - High-performance async API framework
- SQLAlchemy - ORM for PostgreSQL
- Pydantic - Data validation
- Alembic - Database migrations

**Frontend**:
- React 18 - UI framework
- TypeScript - Type safety
- Vite - Fast build tool
- Tailwind CSS - Utility-first CSS
- shadcn/ui - Component library
- D3.js - Data visualization (sequence diagrams)
- Recharts - Charts for cost analytics

**Infrastructure**:
- Docker - Containerization
- Helm - Kubernetes package manager
- PostgreSQL - Primary database
- GKE - Kubernetes hosting

## 🤝 Contributing

This is a mock/demo project. For production use, consider:
- Real authentication/authorization
- External secret management
- Production-grade monitoring
- Rate limiting
- Horizontal pod autoscaling
- Database backups

## 📄 License

MIT License - See LICENSE file

## 🙏 Acknowledgments

Built for demonstrating multi-agent observability concepts with focus on:
- Inter-agent communication tracking
- Protocol diversity (A2A, MCP, HTTP, gRPC, Queue)
- Policy-driven governance
- Cost attribution and optimization
