import { useEffect, useState } from 'react';
import { api, type Trace, type Span } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { formatCost, formatDuration, formatNumber } from '../lib/utils';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';

export function TraceExplorer() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [spans, setSpans] = useState<Span[]>([]);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTraces();
  }, []);

  async function loadTraces() {
    try {
      setLoading(true);
      const data = await api.listTraces({ limit: 50 });
      setTraces(data);
      if (data.length > 0) {
        await selectTrace(data[0]);
      }
    } catch (error) {
      console.error('Error loading traces:', error);
    } finally {
      setLoading(false);
    }
  }

  async function selectTrace(trace: Trace) {
    setSelectedTrace(trace);
    try {
      const spansData = await api.listSpans({ trace_id: trace.trace_id });
      setSpans(spansData);
    } catch (error) {
      console.error('Error loading spans:', error);
    }
  }

  function toggleSpan(spanId: string) {
    const newExpanded = new Set(expandedSpans);
    if (newExpanded.has(spanId)) {
      newExpanded.delete(spanId);
    } else {
      newExpanded.add(spanId);
    }
    setExpandedSpans(newExpanded);
  }

  function buildSpanHierarchy(spans: Span[]): Span[] {
    const roots: Span[] = [];

    spans.forEach(span => {
      if (!span.parent_span_id) {
        roots.push(span);
      }
    });

    return roots;
  }

  function renderSpan(span: Span, depth: number = 0) {
    const isExpanded = expandedSpans.has(span.span_id);
    const children = spans.filter(s => s.parent_span_id === span.span_id);
    const hasChildren = children.length > 0;

    return (
      <div key={span.span_id} className="border-l-2 border-muted">
        <div
          className={`flex items-center gap-2 p-3 hover:bg-secondary cursor-pointer transition-colors ${
            depth > 0 ? 'ml-' + (depth * 4) : ''
          }`}
          onClick={() => toggleSpan(span.span_id)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <div className="w-4" />
          )}

          <div className="flex-1 grid grid-cols-5 gap-4 items-center">
            <div>
              <Badge variant="outline">{span.kind}</Badge>
            </div>
            <div className="text-sm font-medium truncate col-span-2">
              {span.model_provider && span.model_name
                ? `${span.model_provider}/${span.model_name}`
                : span.kind}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDuration(span.duration_ms)}
            </div>
            <div className="text-sm">
              <Badge variant={span.status === 'SUCCESS' ? 'secondary' : 'destructive'}>
                {span.status}
              </Badge>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="ml-8 p-4 bg-secondary/50 border-l-2 border-primary/50">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Span ID:</span>
                <div className="font-mono text-xs mt-1">{span.span_id}</div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Tokens:</span>
                <div className="mt-1">
                  In: {formatNumber(span.tokens_in)} | Out: {formatNumber(span.tokens_out)}
                </div>
              </div>
              {span.excerpts && (
                <div className="col-span-2">
                  <span className="font-medium text-muted-foreground">Excerpts:</span>
                  <div className="mt-1 p-2 bg-background rounded text-xs font-mono">
                    {span.excerpts}
                  </div>
                </div>
              )}
              {span.policy_enforced && span.policy_enforced.length > 0 && (
                <div className="col-span-2">
                  <span className="font-medium text-muted-foreground">Policies Enforced:</span>
                  <div className="mt-1 flex gap-2">
                    {span.policy_enforced.map((policy, i) => (
                      <Badge key={i} variant="secondary">
                        {policy}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isExpanded && hasChildren && (
          <div>{children.map(child => renderSpan(child, depth + 1))}</div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const rootSpans = buildSpanHierarchy(spans);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trace Explorer</h1>
        <p className="text-muted-foreground mt-2">
          Explore traces and spans with detailed telemetry
        </p>
      </div>

      {/* Trace selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Trace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {traces.map((trace) => (
              <button
                key={trace.trace_id}
                onClick={() => selectTrace(trace)}
                className={`p-3 text-left rounded-md border transition-colors ${
                  selectedTrace?.trace_id === trace.trace_id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium truncate">{trace.trace_id}</span>
                  <Badge variant={trace.signature_verified ? 'secondary' : 'destructive'}>
                    {trace.signature_verified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>Agent: {trace.agent_id.replace('agent_', '')}</div>
                  <div>Cost: {formatCost(trace.cost_cents)}</div>
                  <div>{trace.duration_ms ? formatDuration(trace.duration_ms) : 'Running'}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trace details and spans */}
      {selectedTrace && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Trace Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Trace ID</div>
                  <div className="font-mono text-sm mt-1">{selectedTrace.trace_id}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Protocol</div>
                  <Badge variant="outline" className="mt-1">
                    {selectedTrace.protocol}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Total Cost</div>
                  <div className="text-sm mt-1">{formatCost(selectedTrace.cost_cents)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Duration</div>
                  <div className="text-sm mt-1">
                    {selectedTrace.duration_ms ? formatDuration(selectedTrace.duration_ms) : 'N/A'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spans ({spans.length})</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click on a span to expand and view details
              </p>
            </CardHeader>
            <CardContent>
              {rootSpans.length > 0 ? (
                <div className="space-y-1">{rootSpans.map(span => renderSpan(span))}</div>
              ) : (
                <div className="text-center text-muted-foreground py-8">No spans found</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
