.PHONY: help build build-push deploy-gke demo clean seed migrate install-deps start-db start-services

# Variables
PROJECT_ID ?= YOUR_GCP_PROJECT_ID
REGISTRY ?= gcr.io/$(PROJECT_ID)
TAG ?= latest

help:
	@echo "AgentOS Mock - Available Commands"
	@echo "=================================="
	@echo "  make demo          - Run full local demo (migrations + seeds + services)"
	@echo "  make build         - Build all Docker images"
	@echo "  make build-push    - Build and push images to GCP"
	@echo "  make deploy-gke    - Deploy to GKE using Helm"
	@echo "  make migrate       - Run database migrations"
	@echo "  make seed          - Generate mock data"
	@echo "  make clean         - Clean up local environment"

demo: install-deps start-db migrate seed start-services
	@echo ""
	@echo "✅ Demo running at http://localhost:5173"
	@echo "   API available at http://localhost:8004"
	@echo ""
	@echo "To view logs: docker compose logs -f"
	@echo "To stop: docker compose down"

install-deps:
	@echo "📦 Installing Python dependencies..."
	@pip install -q -r db/requirements.txt 2>/dev/null || pip3 install -q -r db/requirements.txt

start-db:
	@echo "🗄️  Starting PostgreSQL..."
	@docker compose up -d postgres
	@echo "⏳ Waiting for PostgreSQL to be ready..."
	@sleep 12

migrate:
	@echo "📊 Running database migrations..."
	@cd db && python -m alembic upgrade head 2>/dev/null || python3 -m alembic upgrade head

seed:
	@echo "🌱 Generating mock data..."
	@cd db/seeds && python generate_seeds.py 2>/dev/null || python3 generate_seeds.py

start-services:
	@echo "🚀 Starting all services..."
	@docker compose up -d

build:
	@echo "🏗️  Building Docker images..."
	docker build -f infra/docker/Dockerfile.runtime-mock -t agentos-runtime-mock:$(TAG) .
	docker build -f infra/docker/Dockerfile.registry-mock -t agentos-registry-mock:$(TAG) .
	docker build -f infra/docker/Dockerfile.ingest-mock -t agentos-ingest-mock:$(TAG) .
	docker build -f infra/docker/Dockerfile.api-mock -t agentos-api-mock:$(TAG) .
	docker build -f infra/docker/Dockerfile.bridge-mock -t agentos-bridge-mock:$(TAG) .
	docker build -f infra/docker/Dockerfile.policy-mock -t agentos-policy-mock:$(TAG) .
	docker build -f infra/docker/Dockerfile.web-ui -t agentos-web-ui:$(TAG) .

build-push: build
	@echo "📤 Pushing images to $(REGISTRY)..."
	@for service in runtime-mock registry-mock ingest-mock api-mock bridge-mock policy-mock web-ui; do \
		docker tag agentos-$$service:$(TAG) $(REGISTRY)/agentos-$$service:$(TAG); \
		docker push $(REGISTRY)/agentos-$$service:$(TAG); \
	done
	@echo "✅ All images pushed to GCP"

deploy-gke:
	@echo "☸️  Deploying to GKE..."
	helm upgrade --install agentos-mock ./helm/agentos-mock \
		-n agentos --create-namespace \
		--set image.registry=$(REGISTRY) \
		--set image.tag=$(TAG) \
		--set web.host=mock.pluralfocus.com
	@echo "✅ Deployment complete!"
	@echo "Run 'kubectl get pods -n agentos' to check pod status"

clean:
	@echo "🧹 Cleaning up..."
	docker compose down -v
	@echo "✅ Cleanup complete"
