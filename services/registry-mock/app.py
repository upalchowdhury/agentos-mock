"""Registry Mock Service - Agent registration and health monitoring."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'db'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import AgentRegistry, Protocol

app = FastAPI(title="Registry Mock Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://agentos:agentos@localhost:5432/agentos_mock")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


class RegisterAgentRequest(BaseModel):
    agent_id: str
    org_id: str
    project_id: str
    name: str
    description: Optional[str] = None
    runtime_type: str
    protocol: str


class RegisterAgentResponse(BaseModel):
    agent_id: str
    status: str
    badges: Dict[str, bool]


class HealthProbeResponse(BaseModel):
    agent_id: str
    health_status: str
    last_check: datetime


class AgentInfo(BaseModel):
    agent_id: str
    name: str
    description: Optional[str]
    runtime_type: str
    protocol: str
    health_status: str
    badges: Dict[str, bool]
    created_at: datetime


@app.get("/healthz")
async def health_check():
    return {"status": "healthy", "service": "registry-mock"}


@app.post("/api/registry/register", response_model=RegisterAgentResponse)
async def register_agent(request: RegisterAgentRequest):
    """Register a new agent."""
    session = Session()

    try:
        # Check if agent exists
        existing = session.query(AgentRegistry).filter_by(agent_id=request.agent_id).first()

        if existing:
            existing.updated_at = datetime.utcnow()
            existing.name = request.name
            existing.description = request.description
            session.commit()
            agent = existing
        else:
            agent = AgentRegistry(
                agent_id=request.agent_id,
                org_id=request.org_id,
                project_id=request.project_id,
                name=request.name,
                description=request.description,
                runtime_type=request.runtime_type,
                protocol=Protocol[request.protocol.upper()],
                health_status="unknown",
                badges={
                    "verified_telemetry": False,
                    "policy_clean": False,
                    "cost_tagged": False
                },
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(agent)
            session.commit()

        return RegisterAgentResponse(
            agent_id=agent.agent_id,
            status="registered",
            badges=agent.badges
        )

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@app.get("/api/registry/agents/{agent_id}", response_model=AgentInfo)
async def get_agent(agent_id: str):
    """Get agent information."""
    session = Session()

    try:
        agent = session.query(AgentRegistry).filter_by(agent_id=agent_id).first()

        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")

        return AgentInfo(
            agent_id=agent.agent_id,
            name=agent.name,
            description=agent.description,
            runtime_type=agent.runtime_type,
            protocol=agent.protocol.value,
            health_status=agent.health_status,
            badges=agent.badges,
            created_at=agent.created_at
        )

    finally:
        session.close()


@app.get("/api/registry/agents", response_model=List[AgentInfo])
async def list_agents(org_id: Optional[str] = None, project_id: Optional[str] = None):
    """List all agents."""
    session = Session()

    try:
        query = session.query(AgentRegistry)

        if org_id:
            query = query.filter_by(org_id=org_id)
        if project_id:
            query = query.filter_by(project_id=project_id)

        agents = query.all()

        return [
            AgentInfo(
                agent_id=agent.agent_id,
                name=agent.name,
                description=agent.description,
                runtime_type=agent.runtime_type,
                protocol=agent.protocol.value,
                health_status=agent.health_status,
                badges=agent.badges,
                created_at=agent.created_at
            )
            for agent in agents
        ]

    finally:
        session.close()


@app.post("/api/registry/health/{agent_id}", response_model=HealthProbeResponse)
async def health_probe(agent_id: str):
    """Perform health probe on agent."""
    session = Session()

    try:
        agent = session.query(AgentRegistry).filter_by(agent_id=agent_id).first()

        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")

        # Mock health check
        agent.health_status = "healthy"
        agent.last_health_check = datetime.utcnow()
        session.commit()

        return HealthProbeResponse(
            agent_id=agent.agent_id,
            health_status=agent.health_status,
            last_check=agent.last_health_check
        )

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
