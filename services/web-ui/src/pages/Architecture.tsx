import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Mermaid } from '../components/Mermaid';
import {
  mseq_agents,
  mflow_ingest,
  mstate_policy,
  mclass_entities,
  mgraph_multiagent
} from '../diagrams/mermaid';

type DiagramType = 'sequence' | 'flow' | 'state' | 'class' | 'graph';

interface DiagramTab {
  id: DiagramType;
  name: string;
  description: string;
  chart: string;
}

const diagrams: DiagramTab[] = [
  {
    id: 'sequence',
    name: 'Agent Sequence',
    description: 'Multi-agent communication flow with signature verification',
    chart: mseq_agents,
  },
  {
    id: 'graph',
    name: 'Multi-Agent Graph',
    description: 'Agent network topology with verification status',
    chart: mgraph_multiagent,
  },
  {
    id: 'flow',
    name: 'Telemetry Ingest',
    description: 'ATP events flow through observability pipeline',
    chart: mflow_ingest,
  },
  {
    id: 'state',
    name: 'Policy Evaluation',
    description: 'State machine for policy decisions and obligations',
    chart: mstate_policy,
  },
  {
    id: 'class',
    name: 'Data Model',
    description: 'Core entities: Trace, Span, Edge relationships',
    chart: mclass_entities,
  },
];

export function Architecture() {
  const [activeTab, setActiveTab] = useState<DiagramType>('sequence');
  
  const activeDiagram = diagrams.find(d => d.id === activeTab) || diagrams[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Architecture</CardTitle>
          <p className="text-sm text-gray-400">
            Visualize AgentOS components, flows, and data models using Mermaid diagrams
          </p>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex space-x-1 border-b border-gray-800 mb-6 overflow-x-auto">
            {diagrams.map((diagram) => (
              <button
                key={diagram.id}
                onClick={() => setActiveTab(diagram.id)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === diagram.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {diagram.name}
              </button>
            ))}
          </div>

          {/* Description */}
          <div className="mb-4 p-3 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-300">{activeDiagram.description}</p>
          </div>

          {/* Diagram */}
          <Mermaid 
            chart={activeDiagram.chart} 
            title={activeDiagram.name}
            toolbar={true}
          />

          {/* Legend */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-2">Sequence Diagrams</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Shows agent-to-agent communication</li>
                <li>• Includes protocol details (a2a, http)</li>
                <li>• Signature verification status</li>
              </ul>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-2">Flow & State</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Data flow through components</li>
                <li>• Policy evaluation states</li>
                <li>• Integration points</li>
              </ul>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-2">Export Options</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Copy Mermaid source code</li>
                <li>• Download as PNG (high-res)</li>
                <li>• Download as SVG (vector)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Diagram Source</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-gray-950 rounded-lg text-xs text-gray-300 overflow-x-auto">
            <code>{activeDiagram.chart}</code>
          </pre>
          <p className="mt-3 text-xs text-gray-500">
            These diagrams are generated using{' '}
            <a 
              href="https://mermaid.js.org/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Mermaid.js
            </a>
            . Edit the source in <code className="text-gray-400">src/diagrams/mermaid.ts</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
