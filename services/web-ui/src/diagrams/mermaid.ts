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
`;

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
`;

export const mstate_policy = `
stateDiagram-v2
  [*] --> Evaluate
  Evaluate --> Allow : RBAC ok & budget ok
  Evaluate --> Deny  : RBAC fail
  Evaluate --> AllowWithObligations : PII found / redaction
  AllowWithObligations --> [*]
  Deny --> [*]
  Allow --> [*]
`;

export const mclass_entities = `
classDiagram
  class Trace {
    +string trace_id
    +string agent_id
    +string version_id
    +int cost_cents
    +bool signature_verified
  }
  class Span {
    +string span_id
    +string parent_span_id
    +string kind
    +int duration_ms
    +string status
  }
  class Edge {
    +string edge_id
    +string from_agent_id
    +string to_agent_id
    +string protocol
    +bool signature_verified
  }
  Trace "1" o-- "many" Span
  Trace "1" o-- "many" Edge
`;

export const mgraph_multiagent = `
graph TD
  subgraph User_Request
    U[User Input]
  end
  subgraph Agent_Router
    R[A_Router<br/>v12<br/>verified✓]
  end
  subgraph Agent_Retriever
    RT[B_Retriever<br/>v8<br/>verified✓]
  end
  subgraph Agent_Planner
    P[C_Planner<br/>v5<br/>verified✓]
  end
  subgraph External
    API[Web API<br/>unverified]
  end
  U -->|invoke| R
  R -->|a2a.search| RT
  RT -->|results| R
  R -->|a2a.plan| P
  P -->|http.fetch| API
  API -->|data| P
  P -->|plan| R
  R -->|response| U
  style R fill:#4ade80
  style RT fill:#4ade80
  style P fill:#4ade80
  style API fill:#f87171
`;
