import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Select, Badge, Spinner, Modal } from '../components/ui';
import { Key, Code, Webhook, Shield, Copy, Plus, Eye, EyeOff, Trash2, CheckCircle, Book, Play, Clock } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/patients', description: 'List all patients', category: 'Patients' },
  { method: 'POST', path: '/api/v1/patients', description: 'Create a patient', category: 'Patients' },
  { method: 'GET', path: '/api/v1/patients/:id', description: 'Get patient by ID', category: 'Patients' },
  { method: 'PUT', path: '/api/v1/patients/:id', description: 'Update patient', category: 'Patients' },
  { method: 'GET', path: '/api/v1/appointments', description: 'List appointments', category: 'Appointments' },
  { method: 'POST', path: '/api/v1/appointments', description: 'Book appointment', category: 'Appointments' },
  { method: 'GET', path: '/api/v1/billing/invoices', description: 'List invoices', category: 'Billing' },
  { method: 'POST', path: '/api/v1/billing/invoices', description: 'Create invoice', category: 'Billing' },
  { method: 'GET', path: '/api/v1/laboratory/results', description: 'List lab results', category: 'Laboratory' },
  { method: 'POST', path: '/api/v1/laboratory/orders', description: 'Create lab order', category: 'Laboratory' },
  { method: 'GET', path: '/api/v1/pharmacy/prescriptions', description: 'List prescriptions', category: 'Pharmacy' },
  { method: 'GET', path: '/api/v1/insurance-claims', description: 'List insurance claims', category: 'Insurance' },
  { method: 'POST', path: '/api/v1/insurance-claims', description: 'Submit claim', category: 'Insurance' },
  { method: 'GET', path: '/api/v1/branches', description: 'List branches', category: 'Branches' },
  { method: 'GET', path: '/api/v1/reports/financial', description: 'Financial reports', category: 'Reports' },
  { method: 'POST', path: '/api/v1/whatsapp/send', description: 'Send WhatsApp message', category: 'Communications' },
  { method: 'POST', path: '/api/v1/voice/call', description: 'Initiate voice call', category: 'Communications' },
  { method: 'GET', path: '/api/v1/notifications', description: 'List notifications', category: 'Notifications' },
  { method: 'GET', path: '/api/v1/analytics/dashboard', description: 'Analytics dashboard data', category: 'Analytics' },
  { method: 'GET', path: '/api/v1/health', description: 'Health check', category: 'System' },
];

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700', POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700', DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
};

export default function DeveloperPortalPage() {
  const [tab, setTab] = useState<'keys' | 'docs' | 'webhooks' | 'rate-limits'>('keys');
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState('read');
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [searchEndpoint, setSearchEndpoint] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: '', events: 'appointment.created,patient.created', secret: '' });

  const fetchKeys = async () => {
    setLoading(true);
    try { const { data } = await api.get('/api-gateway/keys'); setApiKeys(data.data?.rows || data.data || []); } catch {}
    setLoading(false);
  };

  const fetchWebhooks = async () => {
    try { const { data } = await api.get('/api-gateway/webhooks'); setWebhooks(data.data?.rows || data.data || []); } catch {}
  };

  useEffect(() => { fetchKeys(); fetchWebhooks(); }, []);

  const createKey = async () => {
    try {
      const { data } = await api.post('/api-gateway/keys', { name: newKeyName, scopes: newKeyScopes });
      setApiKeys(prev => [...prev, data.data]);
      toast.success('API key created');
      setShowNewWebhook(false); setNewKeyName('');
    } catch { toast.error('Failed to create key'); }
    setShowNewKey(false);
  };

  const revokeKey = async (id: string) => {
    if (!confirm('Revoke this API key?')) return;
    try { await api.delete(`/api-gateway/keys/${id}`); setApiKeys(prev => prev.filter(k => k.id !== id)); toast.success('Key revoked'); }
    catch { toast.error('Failed to revoke key'); }
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied to clipboard'); };

  const filteredEndpoints = API_ENDPOINTS.filter(e => {
    if (searchEndpoint && !e.path.toLowerCase().includes(searchEndpoint.toLowerCase()) && !e.description.toLowerCase().includes(searchEndpoint.toLowerCase())) return false;
    if (categoryFilter && e.category !== categoryFilter) return false;
    return true;
  });

  const categories = [...new Set(API_ENDPOINTS.map(e => e.category))];

  const rateLimits = [
    { tier: 'Free', requests: '100/hour', burst: '10/min', description: 'For testing and development' },
    { tier: 'Basic', requests: '1,000/hour', burst: '50/min', description: 'Small clinics, up to 5 users' },
    { tier: 'Professional', requests: '10,000/hour', burst: '200/min', description: 'Multi-branch clinics, unlimited users' },
    { tier: 'Enterprise', requests: 'Unlimited', burst: '1,000/min', description: 'Hospital networks, SLA guaranteed' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Developer API Portal</h1>
        <p className="text-sm text-gray-500 mt-1">Manage API keys, explore documentation, configure webhooks</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'keys', label: 'API Keys', icon: Key },
          { key: 'docs', label: 'API Documentation', icon: Book },
          { key: 'webhooks', label: `Webhooks (${webhooks.length})`, icon: Webhook },
          { key: 'rate-limits', label: 'Rate Limits', icon: Shield },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap ${tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* API Keys */}
      {tab === 'keys' && (
        <Card><CardBody className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">API Keys</h3>
            <Button onClick={() => setShowNewKey(true)}><Plus className="w-4 h-4" /> Create Key</Button>
          </div>
          {loading ? <Spinner /> : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No API keys yet. Create one to get started.</div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key: any) => (
                <div key={key.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Key className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">{key.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {revealedKeys.has(key.id) ? (key.key || key.api_key || 'sk-****') : 'sk-****-****-****-****'}
                      </code>
                      <button onClick={() => toggleReveal(key.id)} className="text-gray-400 hover:text-gray-600">
                        {revealedKeys.has(key.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => copyToClipboard(key.key || key.api_key || '')} className="text-gray-400 hover:text-gray-600"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <Badge variant={key.is_active !== false ? 'success' : 'danger'}>{key.is_active !== false ? 'Active' : 'Revoked'}</Badge>
                  <Badge>{key.scopes || 'read'}</Badge>
                  <Button size="sm" variant="danger" onClick={() => revokeKey(key.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardBody></Card>
      )}

      {/* API Documentation */}
      {tab === 'docs' && (
        <Card><CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1"><Input placeholder="Search endpoints..." value={searchEndpoint} onChange={(e: any) => setSearchEndpoint(e.target.value)} /></div>
            <Select value={categoryFilter} onChange={(e: any) => setCategoryFilter(e.target.value)} className="w-48" options={[{value:"", label:"All Categories"}, ...categories.map(c => ({value:c, label:c}))]} />
          </div>
          <div className="space-y-2">
            {filteredEndpoints.map((ep, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
                <span className={`text-xs font-bold px-2 py-1 rounded ${methodColors[ep.method]}`}>{ep.method}</span>
                <code className="text-sm font-mono flex-1">{ep.path}</code>
                <span className="text-sm text-gray-500 hidden sm:block">{ep.description}</span>
                <Badge>{ep.category}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Quick Start</h4>
            <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded-lg overflow-x-auto">{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  https://api.visionhealthcare.com/api/v1/patients`}</pre>
          </div>
        </CardBody></Card>
      )}

      {/* Webhooks */}
      {tab === 'webhooks' && (
        <Card><CardBody className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Webhooks</h3>
            <Button onClick={() => setShowNewWebhook(true)}><Plus className="w-4 h-4" /> Add Webhook</Button>
          </div>
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No webhooks configured</div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((wh: any) => (
                <div key={wh.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Webhook className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium font-mono text-sm">{wh.url}</p>
                    <p className="text-xs text-gray-500 mt-1">Events: {wh.events}</p>
                  </div>
                  <Badge variant={wh.is_active !== false ? 'success' : 'danger'}>{wh.is_active !== false ? 'Active' : 'Inactive'}</Badge>
                  <Button size="sm" variant="danger"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardBody></Card>
      )}

      {/* Rate Limits */}
      {tab === 'rate-limits' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rateLimits.map((rl) => (
            <Card key={rl.tier}><CardBody className="p-5 text-center">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{rl.tier}</h3>
              <p className="text-2xl font-bold text-primary-600 mb-1">{rl.requests}</p>
              <p className="text-sm text-gray-500">Burst: {rl.burst}</p>
              <p className="text-xs text-gray-400 mt-3">{rl.description}</p>
            </CardBody></Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <Modal open={showNewKey} onClose={() => setShowNewKey(false)} title="Create API Key">
        <div className="space-y-4">
          <Input label="Key Name" value={newKeyName} onChange={(e: any) => setNewKeyName(e.target.value)} placeholder="e.g., Production Server" />
          <Select label="Scopes" value={newKeyScopes} onChange={(e: any) => setNewKeyScopes(e.target.value)} options={[{value:"read",label:"Read Only"},{value:"read_write",label:"Read & Write"},{value:"admin",label:"Admin"}]} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowNewKey(false)}>Cancel</Button>
            <Button onClick={createKey}>Create Key</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showNewWebhook} onClose={() => setShowNewWebhook(false)} title="Add Webhook">
        <div className="space-y-4">
          <Input label="Webhook URL" value={webhookForm.url} onChange={(e: any) => setWebhookForm({ ...webhookForm, url: e.target.value })} placeholder="https://your-server.com/webhook" />
          <Input label="Events" value={webhookForm.events} onChange={(e: any) => setWebhookForm({ ...webhookForm, events: e.target.value })} placeholder="appointment.created,patient.created" />
          <Input label="Secret (optional)" value={webhookForm.secret} onChange={(e: any) => setWebhookForm({ ...webhookForm, secret: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowNewWebhook(false)}>Cancel</Button>
            <Button onClick={() => { toast.success('Webhook added'); setShowNewWebhook(false); }}>Add Webhook</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
