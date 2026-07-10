import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input } from '../components/ui';
import { Bot, Plus, Search, Cpu, DollarSign, Activity } from 'lucide-react';
import api from '../lib/api';

export default function AiHubPage() {
  const [tab, setTab] = useState<'assistants' | 'providers' | 'requests' | 'costs'>('assistants');
  const [assistants, setAssistants] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/ai/assistants').then(r => setAssistants(r.data.data)).catch(() => []),
      api.get('/ai/providers').then(r => setProviders(r.data.data)).catch(() => []),
      api.get('/ai/requests').then(r => setRequests(r.data.data)).catch(() => []),
      api.get('/ai/costs').then(r => setCostData(r.data.data)).catch(() => null),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">AI Hub</h1><p className="text-gray-500 mt-1">{assistants.length} assistants · {providers.length} providers</p></div>
        <Button><Plus className="w-4 h-4" /> New Assistant</Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === 'assistants' ? 'primary' : 'secondary'} onClick={() => setTab('assistants')}><Bot className="w-4 h-4" /> Assistants ({assistants.length})</Button>
        <Button variant={tab === 'providers' ? 'primary' : 'secondary'} onClick={() => setTab('providers')}><Cpu className="w-4 h-4" /> Providers ({providers.length})</Button>
        <Button variant={tab === 'requests' ? 'primary' : 'secondary'} onClick={() => setTab('requests')}><Activity className="w-4 h-4" /> Requests ({requests.length})</Button>
        <Button variant={tab === 'costs' ? 'primary' : 'secondary'} onClick={() => setTab('costs')}><DollarSign className="w-4 h-4" /> Costs</Button>
      </div>

      <Card className="mb-6"><CardBody>
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>

      {tab === 'assistants' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Slug</th><th>Category</th><th>Model</th><th>Active</th></tr></thead>
            <tbody>
              {assistants.filter((a: any) => !search || a.name?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">No AI assistants configured</td></tr>
              ) : assistants.filter((a: any) => !search || a.name?.toLowerCase().includes(search.toLowerCase())).map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="font-medium">{a.name}</td>
                  <td className="font-mono text-xs">{a.slug}</td>
                  <td><Badge>{a.category}</Badge></td>
                  <td className="text-xs">{a.modelName || '-'}</td>
                  <td><Badge variant={a.isActive ? 'success' : 'gray'}>{a.isActive ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'providers' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Provider</th><th>Endpoint</th><th>Active</th></tr></thead>
            <tbody>
              {providers.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="font-medium">{p.name}</td>
                  <td><Badge>{p.provider}</Badge></td>
                  <td className="text-xs max-w-xs truncate">{p.apiEndpoint || '-'}</td>
                  <td><Badge variant={p.isActive ? 'success' : 'gray'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'requests' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Source</th><th>Tokens</th><th>Cost</th><th>Latency</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {requests.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No AI requests yet</td></tr> :
                requests.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td><Badge>{r.source || 'chat'}</Badge></td>
                    <td>{r.promptTokens + r.completionTokens}</td>
                    <td>{Number(r.cost).toFixed(6)}</td>
                    <td>{r.latencyMs}ms</td>
                    <td><Badge variant={r.status === 'completed' ? 'success' : 'danger'}>{r.status}</Badge></td>
                    <td className="text-xs">{r.createdAt?.split('T')[0]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'costs' && (
        <div>
          {costData?.summary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card><CardBody>
                <p className="text-sm text-gray-500">Total Cost</p>
                <p className="text-2xl font-bold">{Number(costData.summary.totalCost).toFixed(4)}</p>
              </CardBody></Card>
              <Card><CardBody>
                <p className="text-sm text-gray-500">Total Tokens</p>
                <p className="text-2xl font-bold">{costData.summary.totalTokens?.toLocaleString()}</p>
              </CardBody></Card>
              <Card><CardBody>
                <p className="text-sm text-gray-500">Total Requests</p>
                <p className="text-2xl font-bold">{costData.summary.totalRequests?.toLocaleString()}</p>
              </CardBody></Card>
            </div>
          ) : <p className="text-gray-500 mb-6">No cost data available</p>}

          <div className="table-container">
            <table>
              <thead><tr><th>Date</th><th>Source</th><th>Cost</th><th>Requests</th><th>Tokens</th></tr></thead>
              <tbody>
                {(costData?.daily || []).length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">No daily cost records</td></tr> :
                  costData.daily.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="text-xs">{c.date}</td>
                      <td><Badge>{c.source}</Badge></td>
                      <td>{Number(c.totalCost).toFixed(4)}</td>
                      <td>{c.totalRequests}</td>
                      <td>{c.totalTokens?.toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
