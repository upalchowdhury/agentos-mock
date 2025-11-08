import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Shield, Check, X } from 'lucide-react';

const DEFAULT_POLICIES_YAML = `policies:
  - id: rbac_policy
    name: RBAC Access Control
    description: Role-based access control for agent operations
    rules:
      admin:
        - invoke
        - deploy
        - delete
        - view
        - configure
      developer:
        - invoke
        - deploy
        - view
      viewer:
        - view

  - id: budget_policy
    name: Budget Cap Enforcement
    description: Enforce budget caps per user role
    budget_caps:
      admin: 100000    # $1000 in cents
      developer: 50000  # $500 in cents
      viewer: 10000     # $100 in cents

  - id: redaction_policy
    name: PII Redaction
    description: Automatically redact sensitive information
    redaction_patterns:
      - email
      - ssn
      - phone
      - credit_card
      - api_key
      - password

  - id: domain_allowlist_policy
    name: Allowed External Domains
    description: Restrict external API calls to approved domains
    allowed_domains:
      - api.openai.com
      - api.anthropic.com
      - "*.googleapis.com"
      - "*.azure.com"
      - "*.amazonaws.com"
`;

interface PolicyTestResult {
  allow: boolean;
  decision: string;
  message: string;
  obligations: any[];
}

export function Policies() {
  const [testRole, setTestRole] = useState('developer');
  const [testAction, setTestAction] = useState('invoke');
  const [testBudget, setTestBudget] = useState('5000');
  const [testResult, setTestResult] = useState<PolicyTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  async function runPolicyTest() {
    setTesting(true);
    try {
      const response = await fetch('/api/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: 'org_001',
          user_role: testRole,
          agent_id: 'agent_writer',
          action: testAction,
          budget_remaining_cents: parseInt(testBudget),
        }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      console.error('Error evaluating policy:', error);
      setTestResult({
        allow: false,
        decision: 'error',
        message: 'Error evaluating policy',
        obligations: [],
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Policies</h1>
        <p className="text-muted-foreground mt-2">
          View and test policy configurations for access control and obligations
        </p>
      </div>

      {/* Policy YAML Viewer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Policy Configuration (YAML)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-secondary rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm font-mono whitespace-pre">{DEFAULT_POLICIES_YAML}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Policy Tester */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Evaluation Test Runner</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test policy decisions with different parameters
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User Role</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={testRole}
                onChange={(e) => setTestRole(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={testAction}
                onChange={(e) => setTestAction(e.target.value)}
              >
                <option value="view">View</option>
                <option value="invoke">Invoke</option>
                <option value="deploy">Deploy</option>
                <option value="delete">Delete</option>
                <option value="configure">Configure</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Budget Remaining (cents)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-md"
                value={testBudget}
                onChange={(e) => setTestBudget(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <button
            onClick={runPolicyTest}
            disabled={testing}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {testing ? 'Evaluating...' : 'Run Policy Evaluation'}
          </button>

          {testResult && (
            <div className={`mt-4 p-4 rounded-lg border-2 ${
              testResult.allow ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {testResult.allow ? (
                  <Check className="h-6 w-6 text-green-600" />
                ) : (
                  <X className="h-6 w-6 text-red-600" />
                )}
                <span className="font-bold text-lg">
                  {testResult.allow ? 'ALLOW' : 'DENY'}
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Decision:</span>
                  <span className="ml-2">{testResult.decision}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Message:</span>
                  <span className="ml-2">{testResult.message}</span>
                </div>

                {testResult.obligations && testResult.obligations.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Obligations:</div>
                    <div className="space-y-2">
                      {testResult.obligations.map((obligation, i) => (
                        <div key={i} className="p-2 bg-white rounded border">
                          <div className="font-medium text-sm">{obligation.type}</div>
                          {obligation.fields && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Fields: {obligation.fields.join(', ')}
                            </div>
                          )}
                          {obligation.allowed_domains && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Allowed: {obligation.allowed_domains.join(', ')}
                            </div>
                          )}
                          {obligation.budget_limit_cents !== undefined && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Budget Limit: ${(obligation.budget_limit_cents / 100).toFixed(2)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policy Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">RBAC Policy</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Controls which actions each user role can perform
              </p>
              <div className="flex gap-2">
                <Badge>Admin: Full Access</Badge>
                <Badge variant="outline">Developer: invoke, deploy, view</Badge>
                <Badge variant="secondary">Viewer: view only</Badge>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Budget Policy</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Enforces spending limits based on user role
              </p>
              <div className="flex gap-2">
                <Badge>Admin: $1000</Badge>
                <Badge variant="outline">Developer: $500</Badge>
                <Badge variant="secondary">Viewer: $100</Badge>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Redaction Policy</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Automatically redacts sensitive information from logs and outputs
              </p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">email</Badge>
                <Badge variant="outline">ssn</Badge>
                <Badge variant="outline">phone</Badge>
                <Badge variant="outline">credit_card</Badge>
                <Badge variant="outline">api_key</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
