import { useEffect, useState } from 'react';
import { api, type Agent } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { CheckCircle2, Loader2, Filter } from 'lucide-react';

export function Catalog() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    protocol: 'all',
    runtime_type: 'all',
    verified_telemetry: 'all',
  });

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [agents, filters]);

  async function loadAgents() {
    try {
      setLoading(true);
      const data = await api.searchCatalog({});
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...agents];

    if (filters.protocol !== 'all') {
      filtered = filtered.filter(a => a.protocol.toLowerCase() === filters.protocol);
    }

    if (filters.runtime_type !== 'all') {
      filtered = filtered.filter(a => a.runtime_type === filters.runtime_type);
    }

    if (filters.verified_telemetry !== 'all') {
      const verified = filters.verified_telemetry === 'true';
      filtered = filtered.filter(a => a.badges.verified_telemetry === verified);
    }

    setFilteredAgents(filtered);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent Catalog</h1>
        <p className="text-muted-foreground mt-2">
          Browse and filter registered agents by protocol, runtime, and badges
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Protocol</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={filters.protocol}
                onChange={(e) => setFilters({ ...filters, protocol: e.target.value })}
              >
                <option value="all">All Protocols</option>
                <option value="a2a">A2A</option>
                <option value="mcp">MCP</option>
                <option value="http">HTTP</option>
                <option value="grpc">gRPC</option>
                <option value="queue">Queue</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Runtime Type</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={filters.runtime_type}
                onChange={(e) => setFilters({ ...filters, runtime_type: e.target.value })}
              >
                <option value="all">All Runtimes</option>
                <option value="Model A">Model A</option>
                <option value="Model B">Model B</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Verified Telemetry</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={filters.verified_telemetry}
                onChange={(e) => setFilters({ ...filters, verified_telemetry: e.target.value })}
              >
                <option value="all">All Agents</option>
                <option value="true">Verified Only</option>
                <option value="false">Unverified Only</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAgents.length} of {agents.length} agents
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => (
          <Card key={agent.agent_id} className="hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{agent.name}</span>
                <div className={`h-3 w-3 rounded-full ${
                  agent.health_status === 'healthy' ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {agent.description || 'No description available'}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Agent ID</span>
                  <span className="font-mono text-xs">{agent.agent_id}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Runtime</span>
                  <Badge variant="outline">{agent.runtime_type}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Protocol</span>
                  <Badge>{agent.protocol}</Badge>
                </div>
              </div>

              {/* Badges */}
              <div className="pt-4 border-t space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">CAPABILITIES</div>
                <div className="flex flex-wrap gap-2">
                  {agent.badges.verified_telemetry && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified Telemetry
                    </Badge>
                  )}
                  {agent.badges.policy_clean && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Policy Clean
                    </Badge>
                  )}
                  {agent.badges.cost_tagged && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Cost Tagged
                    </Badge>
                  )}
                  {!agent.badges.verified_telemetry && !agent.badges.policy_clean && !agent.badges.cost_tagged && (
                    <span className="text-xs text-muted-foreground">No badges</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No agents match the current filters</p>
        </div>
      )}
    </div>
  );
}
