import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useGraphStore, type GraphData } from '../store/graph';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Search, Layers, GitGraph, ZoomIn, Download } from 'lucide-react';

export function MultiAgentMap() {
  const [searchParams] = useSearchParams();
  const traceId = searchParams.get('traceId');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    graphData,
    layout,
    colorBy,
    showToolNodes,
    showSystemNodes,
    setGraphData,
    setLayout,
    setColorBy,
    setShowToolNodes,
    setShowSystemNodes,
  } = useGraphStore();

  useEffect(() => {
    loadGraphData();
  }, [traceId]);

  async function loadGraphData() {
    try {
      setLoading(true);
      
      // Try to load graph data from API
      // For now, use mock data if API doesn't have /api/graph endpoint yet
      const mockData: GraphData = {
        trace: {
          trace_id: traceId || 'trace_demo_01',
          org_id: 'org_001',
          start_ts: new Date().toISOString(),
          end_ts: new Date().toISOString(),
        },
        nodes: [
          {
            id: 'A_router:span_01',
            label: 'A_router',
            role: 'agent',
            version: 'v12',
            prompt_excerpt: 'Route user query to appropriate retriever...',
            latency_ms: 1240,
            tokens_in: 210,
            tokens_out: 67,
            cost_cents: 12,
            confidence: 0.86,
            hallucination_score: 0.08,
            guardrail_passed: true,
            rbac_decision: 'allow',
            signature_verified: true,
            status: 'success',
            deterministic: true,
            risk_flags: [],
            policy_ids: ['org.default.budget-cap'],
            config_hash: 'H-abc123',
          },
          {
            id: 'B_retriever:span_02',
            label: 'B_retriever',
            role: 'agent',
            version: 'v8',
            prompt_excerpt: 'Search knowledge base for relevant context...',
            latency_ms: 820,
            tokens_in: 156,
            tokens_out: 342,
            cost_cents: 8,
            confidence: 0.92,
            hallucination_score: 0.04,
            guardrail_passed: true,
            rbac_decision: 'allow',
            signature_verified: true,
            status: 'success',
            deterministic: true,
            risk_flags: [],
            policy_ids: ['org.default.budget-cap'],
          },
          {
            id: 'C_planner:span_03',
            label: 'C_planner',
            role: 'agent',
            version: 'v5',
            prompt_excerpt: 'Generate execution plan based on retrieved data...',
            latency_ms: 1580,
            tokens_in: 445,
            tokens_out: 198,
            cost_cents: 15,
            confidence: 0.78,
            hallucination_score: 0.15,
            guardrail_passed: true,
            rbac_decision: 'allow',
            signature_verified: true,
            status: 'success',
            deterministic: false,
            risk_flags: ['high_hallucination'],
            policy_ids: ['org.default.budget-cap', 'org.pii.redaction'],
          },
        ],
        edges: [
          {
            id: 'E-101',
            from: 'A_router:span_01',
            to: 'B_retriever:span_02',
            protocol: 'a2a',
            size_bytes: 8123,
            signature_verified: true,
            latency_ms: 340,
            status: 'success',
            risk_flags: [],
            edge_confidence: 0.81,
          },
          {
            id: 'E-102',
            from: 'A_router:span_01',
            to: 'C_planner:span_03',
            protocol: 'a2a',
            size_bytes: 12450,
            signature_verified: true,
            latency_ms: 280,
            status: 'success',
            risk_flags: [],
            edge_confidence: 0.89,
          },
        ],
        stats: {
          node_count: 3,
          edge_count: 2,
          error_nodes: 0,
          avg_confidence: 0.85,
          avg_hallucination: 0.09,
        },
        paths: [
          {
            id: 'path_1',
            nodes: ['A_router:span_01', 'B_retriever:span_02', 'C_planner:span_03'],
            edges: ['E-101', 'E-102'],
            total_latency_ms: 3640,
            cumulative_hallucination: 0.27,
            min_confidence: 0.78,
            policy_outcomes: ['allow', 'allow'],
            red_flags: ['high_hallucination'],
          },
        ],
      };

      setGraphData(mockData);
    } catch (error) {
      console.error('Error loading graph data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!graphData) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-400">
          No graph data available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Layout:</span>
              <button
                onClick={() => setLayout(layout === 'layered' ? 'force' : 'layered')}
                className={`px-3 py-1.5 text-xs rounded flex items-center space-x-1 ${
                  layout === 'layered'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Layered</span>
              </button>
              <button
                onClick={() => setLayout(layout === 'force' ? 'layered' : 'force')}
                className={`px-3 py-1.5 text-xs rounded flex items-center space-x-1 ${
                  layout === 'force'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <GitGraph className="w-3 h-3" />
                <span>Force</span>
              </button>
            </div>

            {/* Color By */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Color:</span>
              <select
                value={colorBy}
                onChange={(e) => setColorBy(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="status">Status</option>
                <option value="role">Role</option>
                <option value="confidence">Confidence</option>
                <option value="hallucination">Hallucination</option>
              </select>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-1 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showToolNodes}
                  onChange={(e) => setShowToolNodes(e.target.checked)}
                  className="rounded"
                />
                <span>Tools</span>
              </label>
              <label className="flex items-center space-x-1 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSystemNodes}
                  onChange={(e) => setShowSystemNodes(e.target.checked)}
                  className="rounded"
                />
                <span>System</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded flex items-center space-x-1">
                <ZoomIn className="w-3 h-3" />
                <span>Fit</span>
              </button>
              <button className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded flex items-center space-x-1">
                <Download className="w-3 h-3" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-400">Nodes</div>
            <div className="text-2xl font-bold text-white">{graphData.stats.node_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-400">Edges</div>
            <div className="text-2xl font-bold text-white">{graphData.stats.edge_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-400">Avg Confidence</div>
            <div className="text-2xl font-bold text-green-400">
              {(graphData.stats.avg_confidence * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-400">Avg Hallucination</div>
            <div className="text-2xl font-bold text-yellow-400">
              {(graphData.stats.avg_hallucination * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-400">Error Nodes</div>
            <div className="text-2xl font-bold text-red-400">{graphData.stats.error_nodes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Graph Visualization Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Agent Graph: {graphData.trace.trace_id}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-950 rounded-lg p-8 min-h-[500px] flex items-center justify-center">
            <div className="text-center space-y-4">
              <GitGraph className="w-16 h-16 text-gray-600 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">D3 Graph Visualization</h3>
                <p className="text-sm text-gray-400 max-w-md">
                  Full D3.js interactive graph with force-directed and layered layouts,
                  hover tooltips, details drawer, and path analysis will be rendered here.
                </p>
                <div className="mt-4 p-4 bg-gray-900 rounded-lg text-left">
                  <div className="text-xs text-gray-500 mb-2">Mock Data Preview:</div>
                  {graphData.nodes.map((node) => (
                    <div key={node.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <div>
                        <div className="text-sm text-white">{node.label}</div>
                        <div className="text-xs text-gray-500">{node.prompt_excerpt?.substring(0, 40)}...</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          node.status === 'success' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {node.status}
                        </span>
                        {node.signature_verified && (
                          <span className="text-blue-400 text-xs">✓</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Path Analysis */}
      {graphData.paths && graphData.paths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Path Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {graphData.paths.map((path) => (
                <div key={path.id} className="p-4 bg-gray-900 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-gray-400">Total Latency</div>
                      <div className="text-sm font-semibold text-white">{path.total_latency_ms}ms</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Min Confidence</div>
                      <div className="text-sm font-semibold text-green-400">
                        {(path.min_confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Cumulative Hallucination</div>
                      <div className="text-sm font-semibold text-yellow-400">
                        {(path.cumulative_hallucination * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Red Flags</div>
                      <div className="text-sm font-semibold text-red-400">{path.red_flags.length}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Path: {path.nodes.map(n => n.split(':')[0]).join(' → ')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
