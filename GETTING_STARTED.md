# Getting Started with AgentOS Mock

## Quick Start (< 5 minutes)

### 1. Install Dependencies

Make sure you have:
- Docker Desktop running
- Python 3.11+ (for database setup)
- Node.js 20+ (optional, only if running UI locally)

### 2. Start the Demo

```bash
cd agentos-mock

# Copy environment file
cp .env.example .env

# Start PostgreSQL
docker-compose up -d postgres

# Wait for PostgreSQL to be ready (about 10 seconds)
sleep 10

# Install database dependencies
cd db
pip install -r requirements.txt

# Run migrations
python -m alembic upgrade head

# Generate mock data (150 traces, 1200 spans, 400 edges)
cd seeds
python generate_seeds.py

# Go back to root
cd ../..

# Start all services
docker-compose up -d

# Wait for services to start
sleep 15

# Open browser
open http://localhost:5173
```

## What You'll See

### Dashboard
- **Invocation count**: ~150 (from seed data)
- **Total cost**: Variable (based on mock token counts)
- **Cost charts**: By provider (OpenAI, Anthropic, Vertex, Bedrock)
- **Verified telemetry**: ~95% coverage

### Catalog (12 Agents)
- Content Writer (A2A protocol)
- Knowledge Retriever (MCP protocol)
- Task Planner (A2A protocol)
- Request Router (HTTP protocol)
- Data Analyzer (gRPC protocol)
- Quality Validator, Code Summarizer, Code Reviewer
- ETL Orchestrator, Data Cleaner
- Compliance Checker, Audit Logger

### Sequence Diagram (⭐ Star Feature)
1. Click on a trace from the selector
2. You'll see agent swimlanes (Router → Retriever → Planner → Writer)
3. Arrows show inter-agent communication
4. Protocol badges (A2A, MCP, HTTP) on each arrow
5. Green checkmarks = verified signatures
6. Red exclamation marks = signature failures
7. Click any arrow to see Edge Inspector with content hashes

### Trace Explorer
- Hierarchical span view
- Expand spans to see:
  - Model provider and name
  - Token counts
  - Redacted excerpts
  - Policy enforcement
  - Duration and status

### Policies
- View YAML policy configuration
- Test policy evaluation:
  - Select role (admin/developer/viewer)
  - Select action (view/invoke/deploy/delete)
  - Set budget remaining
  - Click "Run Policy Evaluation"
  - See ALLOW/DENY with obligations

## Common Commands

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api-mock
docker-compose logs -f web-ui

# Restart a service
docker-compose restart api-mock

# Stop all services
docker-compose down

# Complete cleanup (removes database)
docker-compose down -v

# Regenerate seed data
cd db/seeds
python generate_seeds.py

# Check service health
curl http://localhost:8004/healthz
curl http://localhost:8001/healthz
```

## Troubleshooting

### Services won't start
```bash
# Check Docker is running
docker ps

# Check logs for errors
docker-compose logs

# Common issue: Port conflicts
# Solution: Change ports in docker-compose.yml or stop conflicting services
```

### Database connection errors
```bash
# Ensure PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
# Wait 10 seconds, then run migrations and seeds again
```

### No data showing in UI
```bash
# Regenerate seeds
cd db/seeds
export DATABASE_URL="postgresql://agentos:agentos@localhost:5432/agentos_mock"
python generate_seeds.py

# Restart API service
docker-compose restart api-mock
```

### Frontend build errors
```bash
cd services/web-ui

# Install dependencies
npm install

# Run development mode (faster)
npm run dev

# Access at http://localhost:5173
```

## Development Workflow

### Backend Changes

1. Edit service code in `services/<service-name>/app.py`
2. Rebuild and restart:
   ```bash
   docker-compose build <service-name>-mock
   docker-compose restart <service-name>-mock
   ```

### Frontend Changes

1. Edit files in `services/web-ui/src/`
2. Rebuild and restart:
   ```bash
   docker-compose build web-ui
   docker-compose restart web-ui
   ```

Or run in dev mode:
```bash
cd services/web-ui
npm run dev
# Auto-reloads on changes
```

### Database Changes

1. Edit `db/models.py`
2. Create migration:
   ```bash
   cd db
   alembic revision --autogenerate -m "Description"
   ```
3. Apply migration:
   ```bash
   alembic upgrade head
   ```

## GKE Deployment

See [docs/DEPLOY_GKE.md](docs/DEPLOY_GKE.md) for detailed instructions.

Quick version:
```bash
# 1. Set your GCP project
export PROJECT_ID="your-project-id"

# 2. Build and push images
make build-push PROJECT_ID=$PROJECT_ID

# 3. Deploy to your existing GKE cluster
make deploy-gke PROJECT_ID=$PROJECT_ID
```

## Demo Script

See [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md) for a 5-minute demo walkthrough.

Perfect for:
- YC pitches
- Customer demos
- Internal presentations

## Architecture Overview

```
Frontend (React + D3.js)
    ↓
API Gateway (Port 8004)
    ↓
┌─────────────────────────────────────┐
│  Microservices (FastAPI)            │
│  - Runtime (8001)                   │
│  - Registry (8002)                  │
│  - Ingest (8003)                    │
│  - API (8004)                       │
│  - Bridge (8005)                    │
│  - Policy (8006)                    │
└─────────────────────────────────────┘
    ↓
PostgreSQL (5432)
    ↓
Mock Data:
- 150 traces
- 1200 spans
- 400 inter-agent edges
- 12 agents
- 3 orgs, 6 projects
```

## Key Files

- `docker-compose.yml` - Local development orchestration
- `Makefile` - Common commands
- `db/models.py` - Database schema
- `db/seeds/generate_seeds.py` - Mock data generator
- `services/web-ui/src/pages/SequenceDiagram.tsx` - Star feature
- `helm/agentos-mock/` - Kubernetes deployment

## Next Steps

1. ✅ Run `make demo` to start locally
2. ✅ Explore the UI at http://localhost:5173
3. ✅ Review [DEMO_GUIDE.md](docs/DEMO_GUIDE.md)
4. ✅ Customize seed data in `db/seeds/seed_config.yaml`
5. ✅ Deploy to GKE using [DEPLOY_GKE.md](docs/DEPLOY_GKE.md)

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Verify health: `curl http://localhost:8004/healthz`
3. Reset: `make clean && make demo`

## Credits

Built with:
- FastAPI + SQLAlchemy + PostgreSQL (Backend)
- React + TypeScript + D3.js + Tailwind (Frontend)
- Docker + Helm + GKE (Deployment)
