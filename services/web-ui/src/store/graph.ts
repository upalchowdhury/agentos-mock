import { create } from 'zustand';

export interface GraphNode {
  id: string;
  label: string;
  role: string;
  version?: string;
  prompt_excerpt?: string;
  latency_ms: number;
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
  confidence: number;
  hallucination_score: number;
  guardrail_passed: boolean;
  rbac_decision: string;
  signature_verified: boolean;
  status: string;
  deterministic: boolean;
  risk_flags: string[];
  policy_ids: string[];
  config_hash?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  protocol: string;
  size_bytes: number;
  signature_verified: boolean;
  latency_ms: number;
  status: string;
  risk_flags: string[];
  edge_confidence: number;
}

export interface GraphPath {
  id: string;
  nodes: string[];
  edges: string[];
  total_latency_ms: number;
  cumulative_hallucination: number;
  min_confidence: number;
  policy_outcomes: string[];
  red_flags: string[];
}

export interface GraphData {
  trace: {
    trace_id: string;
    org_id: string;
    start_ts: string;
    end_ts: string;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    node_count: number;
    edge_count: number;
    error_nodes: number;
    avg_confidence: number;
    avg_hallucination: number;
  };
  paths: GraphPath[];
}

interface GraphStore {
  graphData: GraphData | null;
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  selectedPath: GraphPath | null;
  layout: 'force' | 'layered';
  colorBy: 'status' | 'role' | 'confidence' | 'hallucination';
  showToolNodes: boolean;
  showSystemNodes: boolean;
  searchQuery: string;
  
  setGraphData: (data: GraphData | null) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setSelectedEdge: (edge: GraphEdge | null) => void;
  setSelectedPath: (path: GraphPath | null) => void;
  setLayout: (layout: 'force' | 'layered') => void;
  setColorBy: (colorBy: 'status' | 'role' | 'confidence' | 'hallucination') => void;
  setShowToolNodes: (show: boolean) => void;
  setShowSystemNodes: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  graphData: null,
  selectedNode: null,
  selectedEdge: null,
  selectedPath: null,
  layout: 'layered',
  colorBy: 'status',
  showToolNodes: true,
  showSystemNodes: true,
  searchQuery: '',
  
  setGraphData: (data) => set({ graphData: data }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setSelectedEdge: (edge) => set({ selectedEdge: edge }),
  setSelectedPath: (path) => set({ selectedPath: path }),
  setLayout: (layout) => set({ layout }),
  setColorBy: (colorBy) => set({ colorBy }),
  setShowToolNodes: (show) => set({ showToolNodes: show }),
  setShowSystemNodes: (show) => set({ showSystemNodes: show }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
