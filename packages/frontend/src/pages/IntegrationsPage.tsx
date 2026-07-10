import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { Puzzle, Plus, Search, Link2, Webhook, Activity } from 'lucide-react';
import api from '../lib/api';

export default function IntegrationsPage() {
  const [tab, setTab] = useState<'connections' | 'webhooks' | 'catalog'>('connections');
  const [connections, setConnections] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/integrations/connections').then(r => setConnections(r.data.data)).catch(() => []),
      api.get('/integrations/webhooks').then(r => setWebhooks(r.data.data)).catch(() => []),
      api.get('/integrations/catalog').then(r => setCatalog(r.data.data)).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  const loadLogs = async (whId: string) => {
    try { const r = await api.get(`/integrations/webhooks/${whId}/logs`); setWebhookLogs(r.data.data); } catch { setWebhookLogs([]); }
  };

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Integration Hub</h1><p className="text-gray-500 mt-1">{connections.length} connections · {webhooks.length} webhooks</p></div>
        <Button><Plus className="w-4 h-4" /> New Connection</Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === 'connections' ? 'primary' : 'secondary'} onClick={() => setTab('connections')}><Link2 className="w-4 h-4" /> Connections ({connections.length})</Button>
        <Button variant={tab === 'webhooks' ? 'primary' : 'secondary'} onClick={() => setTab('webhooks')}><Webhook className="w-4 h-4" /> Webhooks ({webhooks.length})</Button>
        <Button variant={tab === 'catalog' ? 'primary' : 'secondary'} onClick={() => setTab('catalog')}><Puzzle className="w-4 h-4" /> Catalog ({catalog.length})</Button>
      </div>

      <Card className="mb-6"><CardBody>
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>

      {tab === 'connections' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Provider</th><th>Category</th><th>Status</th><th>Last Sync</th><th>Actions</th></tr></thead>
            <tbody>
              {connections.filter((c: any) => !search || c.name?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">No connections configured</td></tr>
              ) : connections.filter((c: any) => !search || c.name?.toLowerCase().includes(search.toLowerCase())).map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="font-medium">{c.name}</td>
                  <td>{c.provider}</td>
                  <td><Badge>{c.category}</Badge></td>
                  <td><Badge variant={c.status === 'connected' ? 'success' : c.status === 'error' ? 'danger' : 'gray'}>{c.status}</Badge></td>
                  <td className="text-xs">{c.lastSyncAt?.split('T')[0] || 'Never'}</td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      await api.post(`/integrations/connections/${c.id}/test`);
                      const r = await api.get('/integrations/connections'); setConnections(r.data.data);
                    }}>Test</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'webhooks' && (
        <div>
          <div className="table-container mb-6">
            <table>
              <thead><tr><th>Name</th><th>URL</th><th>Events</th><th>Status</th><th>Last Trigger</th><th>Actions</th></tr></thead>
              <tbody>
                {webhooks.filter((w: any) => !search || w.name?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-500">No webhooks configured</td></tr>
                ) : webhooks.filter((w: any) => !search || w.name?.toLowerCase().includes(search.toLowerCase())).map((w: any) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="font-medium">{w.name}</td>
                    <td className="text-xs max-w-xs truncate">{w.url}</td>
                    <td className="text-xs">{(w.events || []).join(', ')}</td>
                    <td><Badge variant={w.status === 'active' ? 'success' : 'gray'}>{w.status}</Badge></td>
                    <td className="text-xs">{w.lastTriggeredAt?.split('T')[0] || '-'}</td>
                    <td>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedWebhook(w); loadLogs(w.id); }}>Logs</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedWebhook && (
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Webhook Logs: {selectedWebhook.name}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedWebhook(null)}>Close</Button>
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Event</th><th>Status</th><th>Response</th><th>Attempt</th><th>Error</th><th>Date</th></tr></thead>
                    <tbody>
                      {webhookLogs.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">No logs for this webhook</td></tr> :
                        webhookLogs.map((l: any) => (
                          <tr key={l.id} className="hover:bg-gray-50">
                            <td><Badge>{l.event}</Badge></td>
                            <td><Badge variant={l.status === 'delivered' ? 'success' : l.status === 'failed' ? 'danger' : 'warning'}>{l.status}</Badge></td>
                            <td>{l.responseStatus || '-'}</td>
                            <td>{l.attempt}</td>
                            <td className="text-xs text-red-600 max-w-xs truncate">{l.error || '-'}</td>
                            <td className="text-xs">{l.createdAt?.split('T')[0]}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {tab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map((c: any) => (
            <Card key={c.id}>
              <CardBody>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{c.name}</h3>
                  <Badge>{c.category}</Badge>
                </div>
                <p className="text-xs text-gray-500 mb-2">{c.provider}</p>
                <p className="text-sm text-gray-600">{c.description || 'No description'}</p>
                {c.availableActions?.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {c.availableActions.map((a: string) => <Badge key={a} variant="gray">{a}</Badge>)}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
          {catalog.length === 0 && <p className="col-span-3 text-center py-12 text-gray-500">No integration definitions available in catalog</p>}
        </div>
      )}
    </div>
  );
}
