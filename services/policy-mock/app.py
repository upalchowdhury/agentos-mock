"""Policy Mock Service - OPA-style policy evaluation with obligations."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
import os
import sys
import yaml
import re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'db'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import PolicyAudit

app = FastAPI(title="Policy Mock Service", version="0.1.0")

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


class PolicyEvaluateRequest(BaseModel):
    org_id: str
    user_role: str
    agent_id: str
    action: str
    content: Optional[Dict[str, Any]] = {}
    budget_remaining_cents: Optional[int] = 10000


class Obligation(BaseModel):
    type: str
    fields: Optional[List[str]] = []
    allowed_domains: Optional[List[str]] = []
    budget_limit_cents: Optional[int] = None


class PolicyEvaluateResponse(BaseModel):
    allow: bool
    decision: str
    obligations: List[Obligation]
    policy_ids: List[str]
    trace_id: Optional[str] = None
    audit_id: str
    message: str


# Load default policies
POLICIES_PATH = os.path.join(os.path.dirname(__file__), "policies", "default.yaml")


def load_policies():
    """Load policies from YAML file."""
    if os.path.exists(POLICIES_PATH):
        with open(POLICIES_PATH, 'r') as f:
            return yaml.safe_load(f)
    return get_default_policies()


def get_default_policies():
    """Return default policy configuration."""
    return {
        "policies": [
            {
                "id": "rbac_policy",
                "name": "RBAC Access Control",
                "rules": {
                    "admin": ["invoke", "deploy", "delete", "view"],
                    "developer": ["invoke", "deploy", "view"],
                    "viewer": ["view"]
                }
            },
            {
                "id": "budget_policy",
                "name": "Budget Cap Enforcement",
                "budget_caps": {
                    "admin": 100000,
                    "developer": 50000,
                    "viewer": 10000
                }
            },
            {
                "id": "redaction_policy",
                "name": "PII Redaction",
                "redaction_patterns": ["email", "ssn", "phone", "credit_card"]
            },
            {
                "id": "domain_allowlist_policy",
                "name": "Allowed Domains",
                "allowed_domains": ["api.openai.com", "api.anthropic.com", "*.googleapis.com"]
            }
        ]
    }


@app.get("/healthz")
async def health_check():
    return {"status": "healthy", "service": "policy-mock"}


@app.post("/api/policy/evaluate", response_model=PolicyEvaluateResponse)
async def evaluate_policy(request: PolicyEvaluateRequest):
    """Evaluate policy and return decision with obligations."""
    session = Session()

    try:
        policies = load_policies()
        audit_id = f"audit_{uuid.uuid4().hex[:16]}"

        # RBAC check
        rbac_policy = next((p for p in policies["policies"] if p["id"] == "rbac_policy"), None)
        allowed_actions = rbac_policy["rules"].get(request.user_role, []) if rbac_policy else []

        if request.action not in allowed_actions:
            # Deny
            audit = PolicyAudit(
                audit_id=audit_id,
                trace_id=None,
                policy_ids=["rbac_policy"],
                decision="deny",
                obligations=[],
                decision_json={
                    "user_role": request.user_role,
                    "action": request.action,
                    "reason": "Insufficient permissions"
                },
                evaluated_at=datetime.utcnow()
            )
            session.add(audit)
            session.commit()

            return PolicyEvaluateResponse(
                allow=False,
                decision="deny",
                obligations=[],
                policy_ids=["rbac_policy"],
                audit_id=audit_id,
                message=f"Access denied: {request.user_role} cannot perform {request.action}"
            )

        # Budget check
        budget_policy = next((p for p in policies["policies"] if p["id"] == "budget_policy"), None)
        budget_cap = budget_policy["budget_caps"].get(request.user_role, 10000) if budget_policy else 10000

        if request.budget_remaining_cents < 100:
            audit = PolicyAudit(
                audit_id=audit_id,
                trace_id=None,
                policy_ids=["budget_policy"],
                decision="deny",
                obligations=[],
                decision_json={
                    "user_role": request.user_role,
                    "budget_remaining": request.budget_remaining_cents,
                    "reason": "Budget exhausted"
                },
                evaluated_at=datetime.utcnow()
            )
            session.add(audit)
            session.commit()

            return PolicyEvaluateResponse(
                allow=False,
                decision="deny",
                obligations=[],
                policy_ids=["budget_policy"],
                audit_id=audit_id,
                message="Budget cap exceeded"
            )

        # Allow with obligations
        obligations = []

        # Redaction obligation
        redaction_policy = next((p for p in policies["policies"] if p["id"] == "redaction_policy"), None)
        if redaction_policy:
            obligations.append(Obligation(
                type="redaction",
                fields=redaction_policy["redaction_patterns"]
            ))

        # Domain allowlist obligation
        domain_policy = next((p for p in policies["policies"] if p["id"] == "domain_allowlist_policy"), None)
        if domain_policy:
            obligations.append(Obligation(
                type="allowlist",
                allowed_domains=domain_policy["allowed_domains"]
            ))

        # Budget obligation
        obligations.append(Obligation(
            type="budget_cap",
            budget_limit_cents=budget_cap
        ))

        audit = PolicyAudit(
            audit_id=audit_id,
            trace_id=None,
            policy_ids=["rbac_policy", "budget_policy", "redaction_policy", "domain_allowlist_policy"],
            decision="allow",
            obligations=[o.dict() for o in obligations],
            decision_json={
                "user_role": request.user_role,
                "action": request.action,
                "budget_remaining": request.budget_remaining_cents,
                "reason": "Authorized with obligations"
            },
            evaluated_at=datetime.utcnow()
        )
        session.add(audit)
        session.commit()

        return PolicyEvaluateResponse(
            allow=True,
            decision="allow",
            obligations=obligations,
            policy_ids=["rbac_policy", "budget_policy", "redaction_policy", "domain_allowlist_policy"],
            audit_id=audit_id,
            message="Access granted with obligations"
        )

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@app.get("/api/policy/policies")
async def get_policies():
    """Get all policies."""
    return load_policies()


@app.get("/api/policy/audit")
async def get_policy_audit(limit: int = 50):
    """Get policy audit log."""
    session = Session()
    try:
        audits = session.query(PolicyAudit).order_by(PolicyAudit.evaluated_at.desc()).limit(limit).all()
        
        results = []
        for audit in audits:
            results.append({
                "audit_id": audit.audit_id,
                "trace_id": audit.trace_id,
                "timestamp": audit.evaluated_at.isoformat(),
                "allow": audit.decision == "allow",
                "policy_ids": audit.policy_ids,
                "obligations": [str(o) for o in audit.obligations] if audit.obligations else [],
                "agent_id": audit.decision_json.get("agent_id", "unknown") if audit.decision_json else "unknown"
            })
        
        return results
    finally:
        session.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
