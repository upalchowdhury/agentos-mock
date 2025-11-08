import { type Edge, type Agent } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { X, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { formatTimestamp, formatNumber } from '../lib/utils';

interface EdgeInspectorProps {
  edge: Edge;
  agents: Agent[];
  onClose: () => void;
}

export function EdgeInspector({ edge, agents, onClose }: EdgeInspectorProps) {
  const fromAgent = agents.find((a) => a.agent_id === edge.from_agent_id);
  const toAgent = agents.find((a) => a.agent_id === edge.to_agent_id);

  return (
    <Card className="border-primary">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Edge Inspector</CardTitle>
        <button
          onClick={onClose}
          className="rounded-full p-1 hover:bg-secondary transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Edge flow */}
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="font-medium">{fromAgent?.name || edge.from_agent_id}</div>
            <div className="text-sm text-muted-foreground">{edge.from_agent_version}</div>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight className="h-6 w-6 text-primary" />
            <Badge className="mt-1">{edge.channel}</Badge>
          </div>
          <div className="flex-1 space-y-1 text-right">
            <div className="font-medium">{toAgent?.name || edge.to_agent_id}</div>
            <div className="text-sm text-muted-foreground">{edge.to_agent_version}</div>
          </div>
        </div>

        {/* Edge metadata */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Edge ID</div>
            <div className="font-mono text-sm mt-1">{edge.edge_id}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Timestamp</div>
            <div className="text-sm mt-1">{formatTimestamp(edge.timestamp)}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Channel</div>
            <Badge variant="outline" className="mt-1">
              {edge.channel}
            </Badge>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Instruction Type</div>
            <div className="text-sm mt-1">{edge.instruction_type || 'N/A'}</div>
          </div>
        </div>

        {/* Signature verification */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            {edge.signature_verified ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className="font-medium">
              {edge.signature_verified ? 'Signature Verified' : 'Signature Failed'}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {edge.signature_verified
              ? 'This edge has been cryptographically verified and is tamper-proof'
              : 'Warning: This edge failed signature verification - potential tampering detected'}
          </div>
        </div>

        {/* Content metadata */}
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Content Hash</div>
            <div className="font-mono text-xs mt-1 p-2 bg-secondary rounded">
              {edge.content_hash || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Size</div>
            <div className="text-sm mt-1">{formatNumber(edge.size_bytes)} bytes</div>
          </div>
        </div>

        {/* Span references */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">From Span</div>
            <div className="font-mono text-xs p-2 bg-secondary rounded truncate">
              {edge.from_span_id}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">To Span</div>
            <div className="font-mono text-xs p-2 bg-secondary rounded truncate">
              {edge.to_span_id}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
