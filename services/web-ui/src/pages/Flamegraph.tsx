import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Span } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2 } from 'lucide-react';
import { formatDuration } from '../lib/utils';

export function Flamegraph() {
  const [searchParams] = useSearchParams();
  const traceId = searchParams.get('traceId');
  const [spans, setSpans] = useState<Span[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableTraces, setAvailableTraces] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [traceId]);

  async function loadData() {
    if (traceId) {
      await loadSpans();
    } else {
      // Load first available trace if no traceId specified
      await loadFirstTrace();
    }
  }

  async function loadFirstTrace() {
    try {
      setLoading(true);
      const traces = await api.listTraces({ limit: 10 });
      if (traces.length > 0) {
        const traceIds = traces.map(t => t.trace_id);
        setAvailableTraces(traceIds);
        // Load spans for first trace
        const data = await api.listSpans({ trace_id: traces[0].trace_id });
        setSpans(data);
      }
    } catch (error) {
      console.error('Error loading traces:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSpans() {
    try {
      setLoading(true);
      const data = await api.listSpans({ trace_id: traceId || undefined });
      setSpans(data);
    } catch (error) {
      console.error('Error loading spans:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderFlamegraph() {
    const spanMap = new Map(spans.map(s => [s.span_id, s]));
    const roots = spans.filter(s => !s.parent_span_id);
    
    const maxDuration = Math.max(...spans.map(s => s.duration_ms));

    function renderSpan(span: Span, depth: number = 0) {
      const widthPct = (span.duration_ms / maxDuration) * 100;
      const children = spans.filter(s => s.parent_span_id === span.span_id);

      return (
        <div key={span.span_id} className="mb-1">
          <div
            className="flex items-center px-3 py-2 rounded text-xs font-mono cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              width: `${widthPct}%`,
              minWidth: '100px',
              marginLeft: `${depth * 20}px`,
              backgroundColor: `hsl(${(depth * 40) % 360}, 70%, 50%)`,
            }}
            title={`${span.kind} - ${formatDuration(span.duration_ms)}`}
          >
            <span className="text-white truncate">
              {span.kind} ({formatDuration(span.duration_ms)})
            </span>
          </div>
          {children.map(child => renderSpan(child, depth + 1))}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {roots.map(root => renderSpan(root))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const displayTraceId = traceId || (availableTraces.length > 0 ? availableTraces[0] : null);

  if (!displayTraceId && !loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-400">
          No traces available
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Flamegraph: {displayTraceId || 'Loading...'}</CardTitle>
          <p className="text-sm text-gray-400">{spans.length} spans</p>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
            {renderFlamegraph()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
