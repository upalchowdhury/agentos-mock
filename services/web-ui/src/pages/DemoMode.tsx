import { useState } from 'react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Sparkles, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';

export function DemoMode() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSeedDemo() {
    try {
      setLoading(true);
      setMessage('');
      const result = await api.seedDemo();
      setMessage(result.message || 'Demo data seeded successfully!');
    } catch (error) {
      setMessage('Error seeding demo data');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulateIncident() {
    try {
      setLoading(true);
      setMessage('');
      const result = await api.simulateIncident();
      setMessage(`Incident simulated: ${result.anomalies} anomalies created`);
    } catch (error) {
      setMessage('Error simulating incident');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            <CardTitle>Demo Mode Controls</CardTitle>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Manage demo data and simulate scenarios for the YC demo
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-2 flex items-center">
                <RefreshCw className="w-5 h-5 mr-2" />
                Reseed Data
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Reset and regenerate all demo data including traces, spans, agents, and policy audits.
              </p>
              <button
                onClick={handleSeedDemo}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reseed Demo Data
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-2 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-red-500" />
                Simulate Incident
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Create error spikes and anomalies to demonstrate incident detection and investigation flows.
              </p>
              <button
                onClick={handleSimulateIncident}
                disabled={loading}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Simulate Incident
                  </>
                )}
              </button>
            </div>
          </div>

          {message && (
            <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-400">{message}</p>
            </div>
          )}

          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-3">Demo Tour Steps</h3>
            <ol className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start">
                <span className="font-bold text-white mr-2">1.</span>
                Dashboard - View KPIs and Verified Telemetry coverage
              </li>
              <li className="flex items-start">
                <span className="font-bold text-white mr-2">2.</span>
                Trace Explorer - Select trace_demo_01 and inspect waterfall
              </li>
              <li className="flex items-start">
                <span className="font-bold text-white mr-2">3.</span>
                Sequence Diagram - View agent communication with signature badges
              </li>
              <li className="flex items-start">
                <span className="font-bold text-white mr-2">4.</span>
                Policies & Audit - Evaluate deny policy and view audit trail
              </li>
              <li className="flex items-start">
                <span className="font-bold text-white mr-2">5.</span>
                Trace Explorer - Click Replay on deterministic span
              </li>
              <li className="flex items-start">
                <span className="font-bold text-white mr-2">6.</span>
                OTel Preview - Export JSON for external observability tools
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
