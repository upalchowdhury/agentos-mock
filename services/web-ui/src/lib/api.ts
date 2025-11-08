/**
 * Typed API client for AgentOS Mock
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8004';

export interface Trace {
  trace_id: string;
  invocation_id: string;
  org_id: string;
  project_id: string;
  agent_id: string;
  version_id: string;
  protocol: string;
  run_mode: string;
  config_hash?: string;
  signature_verified: boolean;
  cost_cents: number;
  start_timestamp: string;
  end_timestamp?: string;
  duration_ms?: number;
}

export interface Span {
  span_id: string;
  trace_id: string;
  parent_span_id?: string;
  kind: string;
  model_provider?: string;
  model_name?: string;
  tokens_in: number;
  tokens_out: number;
  excerpts?: string;
  policy_enforced: string[];
  obligations: any[];
  signature_verified: boolean;
  status: string;
  duration_ms: number;
  start_timestamp: string;
  end_timestamp: string;
}

export interface Edge {
  edge_id: string;
  trace_id: string;
  from_agent_id: string;
  from_agent_version: string;
  to_agent_id: string;
  to_agent_version: string;
  from_span_id: string;
  to_span_id: string;
  channel: string;
  instruction_type?: string;
  signature_verified: boolean;
  size_bytes: number;
  content_hash?: string;
  timestamp: string;
}

export interface CostSummary {
  total_cost_cents: number;
  total_tokens_in: number;
  total_tokens_out: number;
  invocation_count: number;
  by_provider: Record<string, any>;
  by_agent: Record<string, any>;
}

export interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  runtime_type: string;
  protocol: string;
  badges: Record<string, boolean>;
  health_status: string;
}

export interface KPIOverview {
  invocations: number;
  cost7d: number;
  p95: number;
  errorRate: number;
  verifiedPct: number;
}

export interface PolicyAudit {
  audit_id: string;
  trace_id: string;
  timestamp: string;
  allow: boolean;
  policy_ids: string[];
  obligations: string[];
  agent_id: string;
}

export interface ReplayResult {
  status: string;
  deterministic: boolean;
  diff: string;
  config_hash: string;
  span_id: string;
}

export interface OtelPreview {
  trace_id: string;
  spans: any[];
  logs: any[];
  metrics: any[];
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Traces
  async listTraces(params?: {
    org_id?: string;
    project_id?: string;
    agent_id?: string;
    limit?: number;
  }): Promise<Trace[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.fetch<Trace[]>(`/api/traces?${query}`);
  }

  async getTrace(traceId: string): Promise<Trace> {
    return this.fetch<Trace>(`/api/traces/${traceId}`);
  }

  // Spans
  async listSpans(params?: {
    trace_id?: string;
    limit?: number;
  }): Promise<Span[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.fetch<Span[]>(`/api/spans?${query}`);
  }

  async getSpan(spanId: string): Promise<Span> {
    return this.fetch<Span>(`/api/spans/${spanId}`);
  }

  // Edges
  async listEdges(params?: {
    trace_id?: string;
    limit?: number;
  }): Promise<Edge[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.fetch<Edge[]>(`/api/edges?${query}`);
  }

  // Cost
  async getCostSummary(params: {
    org_id: string;
    range?: string;
    project_id?: string;
  }): Promise<CostSummary> {
    const query = new URLSearchParams(params as any).toString();
    return this.fetch<CostSummary>(`/api/cost/summary?${query}`);
  }

  // Catalog
  async searchCatalog(params?: {
    protocol?: string;
    runtime_type?: string;
    org_id?: string;
    verified_telemetry?: boolean;
  }): Promise<Agent[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.fetch<Agent[]>(`/api/catalog/search?${query}`);
  }

  // KPIs
  async getKPIOverview(): Promise<KPIOverview> {
    return this.fetch<KPIOverview>('/api/kpi/overview');
  }

  async getVerifiedPct(): Promise<{ verified_pct: number }> {
    return this.fetch<{ verified_pct: number }>('/api/kpi/verified');
  }

  // Replay
  async replaySpan(spanId: string): Promise<ReplayResult> {
    return this.fetch<ReplayResult>(`/api/replay/${spanId}`, { method: 'POST' });
  }

  // Policy
  async evaluatePolicy(payload: any): Promise<{
    allow: boolean;
    obligations: string[];
    policy_ids: string[];
    trace_id: string;
  }> {
    return this.fetch('/api/policy/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getPolicyAudit(params?: { limit?: number }): Promise<PolicyAudit[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.fetch<PolicyAudit[]>(`/api/policy/audit?${query}`);
  }

  // OTel
  async getOtelPreview(traceId: string): Promise<OtelPreview> {
    return this.fetch<OtelPreview>(`/api/otel/preview?trace_id=${traceId}`);
  }

  // Demo
  async seedDemo(): Promise<{ status: string; message: string }> {
    return this.fetch('/api/demo/seed', { method: 'POST' });
  }

  async simulateIncident(): Promise<{ status: string; message: string; anomalies: number }> {
    return this.fetch('/api/demo/simulate_incident', { method: 'POST' });
  }
}

export const api = new ApiClient();
