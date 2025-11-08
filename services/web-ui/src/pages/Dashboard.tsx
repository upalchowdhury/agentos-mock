import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { api, type CostSummary, type Trace } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, DollarSign, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { formatCost, formatNumber, formatDuration } from '../lib/utils';

export function Dashboard() {
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [costs, tracesData] = await Promise.all([
        api.getCostSummary({ org_id: 'org_001', range: 'last_7d' }),
        api.listTraces({ org_id: 'org_001', limit: 100 }),
      ]);

      setCostSummary(costs);
      setTraces(tracesData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const errorRate = traces.length > 0
    ? traces.filter(t => t.end_timestamp === null).length / traces.length * 100
    : 0;

  const avgDuration = traces.length > 0
    ? traces.reduce((sum, t) => sum + (t.duration_ms || 0), 0) / traces.length
    : 0;

  const verifiedTelemetryRate = traces.length > 0
    ? traces.filter(t => t.signature_verified).length / traces.length * 100
    : 0;

  // Prepare cost by provider chart data
  const providerCostData = costSummary?.by_provider
    ? Object.entries(costSummary.by_provider).map(([provider, data]: [string, any]) => ({
        provider,
        cost: data.cost_cents / 100,
      }))
    : [];

  // Prepare cost by agent chart data
  const agentCostData = costSummary?.by_agent
    ? Object.entries(costSummary.by_agent).slice(0, 10).map(([agent, data]: [string, any]) => ({
        agent: agent.replace('agent_', ''),
        cost: data.cost_cents / 100,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of agent invocations, costs, and telemetry
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invocations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(costSummary?.invocation_count || 0)}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(costSummary?.total_cost_cents || 0)}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg P95 Latency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(avgDuration)}</div>
            <p className="text-xs text-muted-foreground">Across all agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Telemetry Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Verified Telemetry Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Signature Verified Traces</span>
              <span className="text-sm font-bold">{verifiedTelemetryRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${verifiedTelemetryRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {traces.filter(t => t.signature_verified).length} of {traces.length} traces have verified telemetry
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={providerCostData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="provider" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cost" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost by Agent (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentCostData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="agent" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="cost" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Token Usage Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Total Input Tokens</div>
              <div className="text-2xl font-bold">{formatNumber(costSummary?.total_tokens_in || 0)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Total Output Tokens</div>
              <div className="text-2xl font-bold">{formatNumber(costSummary?.total_tokens_out || 0)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Total Tokens</div>
              <div className="text-2xl font-bold">
                {formatNumber((costSummary?.total_tokens_in || 0) + (costSummary?.total_tokens_out || 0))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
