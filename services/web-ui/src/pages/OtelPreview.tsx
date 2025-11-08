import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type OtelPreview as OtelPreviewType } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Copy, Check } from 'lucide-react';

export function OtelPreview() {
  const [searchParams] = useSearchParams();
  const traceId = searchParams.get('traceId');
  const [preview, setPreview] = useState<OtelPreviewType | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [traceId]);

  async function loadData() {
    if (traceId) {
      await loadPreview();
    } else {
      // Load first available trace if no traceId specified
      await loadFirstTrace();
    }
  }

  async function loadFirstTrace() {
    try {
      setLoading(true);
      const traces = await api.listTraces({ limit: 1 });
      if (traces.length > 0) {
        const firstTraceId = traces[0].trace_id;
        setCurrentTraceId(firstTraceId);
        const data = await api.getOtelPreview(firstTraceId);
        setPreview(data);
      }
    } catch (error) {
      console.error('Error loading first trace:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPreview() {
    try {
      setLoading(true);
      const data = await api.getOtelPreview(traceId!);
      setPreview(data);
    } catch (error) {
      console.error('Error loading OTel preview:', error);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (preview) {
      await navigator.clipboard.writeText(JSON.stringify(preview, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!preview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>OTel Export Preview</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-gray-400">
          No trace data available
        </CardContent>
      </Card>
    );
  }

  const displayTraceId = traceId || currentTraceId || preview.trace_id;

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>OpenTelemetry Export Preview</CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              Compatible with Grafana, Arize, Datadog, and other OTEL collectors
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[600px]">
            <pre className="text-xs text-gray-300 font-mono">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </div>
          {preview && (
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Spans:</span>{' '}
                <span className="font-medium text-white">{preview.spans?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-400">Logs:</span>{' '}
                <span className="font-medium text-white">{preview.logs?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-400">Metrics:</span>{' '}
                <span className="font-medium text-white">{preview.metrics?.length || 0}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
