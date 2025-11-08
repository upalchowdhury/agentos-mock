#!/bin/bash
set -e

echo "🚀 Setting up AgentOS YC Demo..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Install web UI dependencies
echo -e "${YELLOW}📦 Installing web UI dependencies...${NC}"
cd services/web-ui
npm install zustand@^4.4.7 @visx/visx@^3.3.0
cd ../..

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Build and start services
echo -e "${YELLOW}🔨 Building Docker images...${NC}"
docker compose build

echo -e "${YELLOW}🗄️  Starting services...${NC}"
docker compose down -v
docker compose up -d postgres

echo -e "${YELLOW}⏳ Waiting for PostgreSQL...${NC}"
sleep 5

echo -e "${YELLOW}📊 Running migrations and seeding data...${NC}"
make migrate
make seed

echo -e "${YELLOW}🚀 Starting all services...${NC}"
docker compose up -d

echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo "🌐 Web UI: http://localhost:5173"
echo "🔌 API: http://localhost:8004"
echo "🛡️  Policy: http://localhost:8006"
echo ""
echo "📋 Demo Pages:"
echo "  - Dashboard: http://localhost:5173/dashboard"
echo "  - Trace Explorer: http://localhost:5173/traces"
echo "  - Sequence Diagram: http://localhost:5173/sequence"
echo "  - Flamegraph: http://localhost:5173/flamegraph"
echo "  - Policies: http://localhost:5173/policies"
echo "  - Catalog: http://localhost:5173/catalog"
echo "  - OTel Preview: http://localhost:5173/otel/preview"
echo "  - Demo Mode: http://localhost:5173/demo"
echo ""
echo "🧪 Test Endpoints:"
echo "  curl http://localhost:8004/api/kpi/overview"
echo "  curl http://localhost:8004/api/kpi/verified"
echo "  curl 'http://localhost:8004/api/otel/preview?trace_id=trace_3f81f28aa7114ff0'"
echo ""
echo "🎉 YC Demo ready!"
