import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { Key, Plus, Search, Copy, Activity, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<any>(null);
  const [selectedKey, setSelectedKey] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const loadKeys = () => api.get('/api-keys').then(r => setKeys(r.data.data)).catch(() => []);

  useEffect(() => { loadKeys().finally(() => setLoading(false)); }, []);

  const loadLogs = async (keyId: string) => {
    try { const r = await api.get(`/api-keys/${keyId}/logs`); setLogs(r.data.data); } catch { setLogs([]); }
  };

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">API Keys & Developer Portal</h1><p className="text-gray-500 mt-1">{keys.length} active keys</p></div>
        <Button onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> New API Key</Button>
      </div>

      <div className="table-container mb-6">
        <table><thead><tr><th>Name</th><th>Key Prefix</th><th>Permissions</th><th>Rate Limit</th><th>Status</th><th>Last Used</th><th>Expires</th><th>Actions</th></tr></thead>
          <tbody>
            {keys.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">No API keys created</td></tr> :
              keys.map((k: any) => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className="font-medium">{k.name}</td>
                  <td className="font-mono text-xs">{k.keyPrefix}...</td>
                  <td><Badge>{k.permissions}</Badge></td>
                  <td className="text-xs">{k.rateLimit?.requests || 1000}/{k.rateLimit?.period || '1h'}</td>
                  <td><Badge variant={k.isActive ? 'success' : 'gray'}>{k.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="text-xs">{k.lastUsedAt?.split('T')[0] || 'Never'}</td>
                  <td className="text-xs">{k.expiresAt?.split('T')[0] || 'Never'}</td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedKey(k); loadLogs(k.id); }}><Activity className="w-3 h-3" /></Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {selectedKey && <Card className="mb-6"><CardBody>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Usage Logs: {selectedKey.name}</h3>
          <Button variant="ghost" size="sm" onClick={() => setSelectedKey(null)}>Close</Button>
        </div>
        <div className="table-container">
          <table><thead><tr><th>Method</th><th>Endpoint</th><th>Status</th><th>IP</th><th>Time</th></tr></thead>
            <tbody>
              {logs.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">No usage logs</td></tr> :
                logs.map((l: any) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td><Badge>{l.method}</Badge></td>
                    <td className="text-xs max-w-md truncate">{l.endpoint}</td>
                    <td><Badge variant={l.responseStatus < 400 ? 'success' : 'danger'}>{l.responseStatus}</Badge></td>
                    <td className="text-xs">{l.ip}</td>
                    <td className="text-xs">{l.createdAt?.split('T')[1]?.slice(0, 8)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardBody></Card>}

      {showNew && <Modal open={showNew} onClose={() => { setShowNew(false); setGeneratedKey(null); setNewKeyName(''); }} title="Create API Key" size="md">
        {!generatedKey ? (
          <div className="space-y-4">
            <Input placeholder="Key name (e.g., Production Integration)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
            <Button className="w-full" onClick={async () => {
              if (!newKeyName) return;
              const r = await api.post('/api-keys', { name: newKeyName });
              setGeneratedKey(r.data.data);
              loadKeys();
            }}>Generate Key</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-2">Save this API key — it will not be shown again!</p>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-white rounded border text-xs font-mono break-all">{generatedKey.apiKey}</code>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(generatedKey.apiKey)}><Copy className="w-4 h-4" /></Button>
              </div>
            </div>
            <Button className="w-full" onClick={() => { setShowNew(false); setGeneratedKey(null); setNewKeyName(''); }}>Done</Button>
          </div>
        )}
      </Modal>}
    </div>
  );
}
