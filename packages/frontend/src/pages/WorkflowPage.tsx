import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input } from '../components/ui';
import { GitBranch, Plus, Search, PlayCircle } from 'lucide-react';
import api from '../lib/api';

export default function WorkflowPage() {
  const [tab, setTab] = useState<'definitions' | 'instances'>('definitions');
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/workflow/definitions').then(r => setDefinitions(r.data.data)).catch(() => []),
      api.get('/workflow/instances').then(r => setInstances(r.data.data)).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Workflow Engine</h1><p className="text-gray-500 mt-1">{definitions.length} definitions, {instances.length} active instances</p></div>
        <Button><Plus className="w-4 h-4" /> New Definition</Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'definitions' ? 'primary' : 'secondary'} onClick={() => setTab('definitions')}><GitBranch className="w-4 h-4" /> Definitions ({definitions.length})</Button>
        <Button variant={tab === 'instances' ? 'primary' : 'secondary'} onClick={() => setTab('instances')}><PlayCircle className="w-4 h-4" /> Instances ({instances.length})</Button>
      </div>

      <Card className="mb-6"><CardBody>
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>

      {tab === 'definitions' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Slug</th><th>Category</th><th>Steps</th><th>Active</th></tr></thead>
            <tbody>
              {definitions.filter((d: any) => !search || d.name?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">No workflow definitions</td></tr>
              ) : definitions.filter((d: any) => !search || d.name?.toLowerCase().includes(search.toLowerCase())).map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="font-medium">{d.name}</td>
                  <td className="font-mono text-xs">{d.slug}</td>
                  <td><Badge>{d.category}</Badge></td>
                  <td>{d.steps?.length || 0}</td>
                  <td><Badge variant={d.isActive ? 'success' : 'gray'}>{d.isActive ? 'Yes' : 'No'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'instances' && (
        <div className="table-container">
          <table>
            <thead><tr><th>ID</th><th>Definition</th><th>Reference</th><th>Step</th><th>Status</th><th>Started</th></tr></thead>
            <tbody>
              {instances.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No active workflow instances</td></tr> :
                instances.map((i: any) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="font-mono text-xs">{i.id?.slice(0, 8)}</td>
                    <td className="font-medium">{i.definitionName}</td>
                    <td className="text-xs">{i.referenceType ? `${i.referenceType}:${i.referenceId?.slice(0, 8)}` : '-'}</td>
                    <td>Step {i.currentStep}</td>
                    <td><Badge variant={i.status === 'active' ? 'success' : i.status === 'completed' ? 'info' : 'gray'}>{i.status}</Badge></td>
                    <td className="text-xs">{i.startedAt?.split('T')[0]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
