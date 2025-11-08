import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { api, type Edge, type Trace, type Span, type Agent } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { EdgeInspector } from '../components/EdgeInspector';
import { Badge } from '../components/ui/badge';
import { Loader2 } from 'lucide-react';

interface SequenceEvent {
  span_id: string;
  timestamp: number;
  y: number;
}

export function SequenceDiagram() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [spans, setSpans] = useState<Span[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTrace && edges.length > 0 && spans.length > 0) {
      renderSequenceDiagram();
    }
  }, [selectedTrace, edges, spans]);

  async function loadData() {
    try {
      setLoading(true);
      const [tracesData, agentsData] = await Promise.all([
        api.listTraces({ limit: 50 }),
        api.searchCatalog({}),
      ]);

      setTraces(tracesData);
      setAgents(agentsData);

      if (tracesData.length > 0) {
        await selectTrace(tracesData[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function selectTrace(trace: Trace) {
    setSelectedTrace(trace);
    try {
      const [edgesData, spansData] = await Promise.all([
        api.listEdges({ trace_id: trace.trace_id }),
        api.listSpans({ trace_id: trace.trace_id }),
      ]);

      setEdges(edgesData);
      setSpans(spansData);
    } catch (error) {
      console.error('Error loading trace details:', error);
    }
  }

  function renderSequenceDiagram() {
    if (!svgRef.current || edges.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 1200;
    const height = 600;
    const margin = { top: 60, right: 40, bottom: 40, left: 40 };

    // Get unique agents from edges
    const agentIds = new Set<string>();
    edges.forEach((edge) => {
      agentIds.add(edge.from_agent_id);
      agentIds.add(edge.to_agent_id);
    });

    const agentList = Array.from(agentIds).map((id) => ({
      agent_id: id,
      agent: agents.find((a) => a.agent_id === id),
    }));

    const laneWidth = (width - margin.left - margin.right) / agentList.length;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Draw swimlanes
    agentList.forEach((agentData, i) => {
      const x = i * laneWidth;

      // Lane background
      g.append('rect')
        .attr('x', x)
        .attr('y', 0)
        .attr('width', laneWidth)
        .attr('height', height - margin.top - margin.bottom)
        .attr('fill', i % 2 === 0 ? '#f8fafc' : '#f1f5f9')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1);

      // Agent header
      g.append('text')
        .attr('x', x + laneWidth / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .attr('font-weight', 'bold')
        .attr('font-size', '14px')
        .text(agentData.agent?.name || agentData.agent_id);

      g.append('text')
        .attr('x', x + laneWidth / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#64748b')
        .text(agentData.agent?.protocol || '');

      // Vertical lifeline
      g.append('line')
        .attr('x1', x + laneWidth / 2)
        .attr('x2', x + laneWidth / 2)
        .attr('y1', 0)
        .attr('y2', height - margin.top - margin.bottom)
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');
    });

    // Calculate y-scale based on timestamps
    const minTime = d3.min(edges, (e) => new Date(e.timestamp).getTime()) || 0;
    const maxTime = d3.max(edges, (e) => new Date(e.timestamp).getTime()) || 0;

    const yScale = d3
      .scaleLinear()
      .domain([minTime, maxTime])
      .range([50, height - margin.top - margin.bottom - 50]);

    // Draw edges (arrows)
    edges.forEach((edge) => {
      const fromIndex = agentList.findIndex((a) => a.agent_id === edge.from_agent_id);
      const toIndex = agentList.findIndex((a) => a.agent_id === edge.to_agent_id);

      if (fromIndex === -1 || toIndex === -1) return;

      const x1 = fromIndex * laneWidth + laneWidth / 2;
      const x2 = toIndex * laneWidth + laneWidth / 2;
      const y = yScale(new Date(edge.timestamp).getTime());

      // Arrow path
      g
        .append('path')
        .attr(
          'd',
          `M ${x1} ${y} L ${x2} ${y} L ${x2 - 8} ${y - 4} M ${x2} ${y} L ${x2 - 8} ${y + 4}`
        )
        .attr('stroke', edge.signature_verified ? '#3b82f6' : '#ef4444')
        .attr('stroke-width', 2)
        .attr('fill', 'none')
        .attr('marker-end', 'url(#arrowhead)')
        .style('cursor', 'pointer')
        .on('click', () => setSelectedEdge(edge));

      // Edge label with protocol badge
      const midX = (x1 + x2) / 2;
      g.append('rect')
        .attr('x', midX - 30)
        .attr('y', y - 25)
        .attr('width', 60)
        .attr('height', 18)
        .attr('fill', edge.channel === 'a2a' ? '#dbeafe' : edge.channel === 'mcp' ? '#fef3c7' : '#f3e8ff')
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 1)
        .attr('rx', 3)
        .style('cursor', 'pointer')
        .on('click', () => setSelectedEdge(edge));

      g.append('text')
        .attr('x', midX)
        .attr('y', y - 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text(edge.channel.toUpperCase())
        .style('cursor', 'pointer')
        .on('click', () => setSelectedEdge(edge));

      // Signature verification badge
      if (!edge.signature_verified) {
        g.append('circle')
          .attr('cx', midX + 35)
          .attr('cy', y - 15)
          .attr('r', 6)
          .attr('fill', '#ef4444');

        g.append('text')
          .attr('x', midX + 35)
          .attr('y', y - 12)
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('fill', '#fff')
          .attr('font-weight', 'bold')
          .text('!');
      }

      // Instruction type label
      if (edge.instruction_type) {
        g.append('text')
          .attr('x', midX)
          .attr('y', y + 15)
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('fill', '#64748b')
          .text(edge.instruction_type);
      }
    });

    // Arrow marker definition
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 8)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3, 0 6')
      .attr('fill', '#3b82f6');
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
        <h1 className="text-3xl font-bold">Sequence Diagram</h1>
        <p className="text-muted-foreground mt-2">
          Visualize inter-agent communication flows with protocol and signature verification
        </p>
      </div>

      {/* Trace selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Trace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {traces.slice(0, 12).map((trace) => (
              <button
                key={trace.trace_id}
                onClick={() => selectTrace(trace)}
                className={`p-3 text-left rounded-md border transition-colors ${
                  selectedTrace?.trace_id === trace.trace_id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="text-sm font-medium truncate">{trace.trace_id}</div>
                <div className="text-xs text-muted-foreground">{trace.agent_id}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {trace.protocol}
                  </Badge>
                  {trace.signature_verified && (
                    <Badge variant="secondary" className="text-xs">
                      Verified
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sequence diagram */}
      {selectedTrace && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Communication Flow</CardTitle>
            <div className="text-sm text-muted-foreground">
              Trace: {selectedTrace.trace_id} | {edges.length} edges
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <svg ref={svgRef}></svg>
            </div>
            {edges.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No inter-agent edges found for this trace
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edge Inspector */}
      {selectedEdge && (
        <EdgeInspector
          edge={selectedEdge}
          agents={agents}
          onClose={() => setSelectedEdge(null)}
        />
      )}
    </div>
  );
}
