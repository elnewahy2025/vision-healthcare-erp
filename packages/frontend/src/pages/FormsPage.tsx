import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input } from '../components/ui';
import { ClipboardList, Plus, Search, FileJson } from 'lucide-react';
import api from '../lib/api';

export default function FormsPage() {
  const [tab, setTab] = useState<'definitions' | 'submissions'>('definitions');
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/forms/definitions').then(r => setDefinitions(r.data.data)).catch(() => []),
      api.get('/forms/submissions').then(r => setSubmissions(r.data.data)).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Form Builder</h1><p className="text-gray-500 mt-1">{definitions.length} forms, {submissions.length} submissions</p></div>
        <Button><Plus className="w-4 h-4" /> New Form</Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'definitions' ? 'primary' : 'secondary'} onClick={() => setTab('definitions')}><FileJson className="w-4 h-4" /> Definitions ({definitions.length})</Button>
        <Button variant={tab === 'submissions' ? 'primary' : 'secondary'} onClick={() => setTab('submissions')}><ClipboardList className="w-4 h-4" /> Submissions ({submissions.length})</Button>
      </div>

      <Card className="mb-6"><CardBody>
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>

      {tab === 'definitions' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Slug</th><th>Category</th><th>Version</th><th>Active</th></tr></thead>
            <tbody>
              {definitions.filter((d: any) => !search || d.name?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">No form definitions</td></tr>
              ) : definitions.filter((d: any) => !search || d.name?.toLowerCase().includes(search.toLowerCase())).map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="font-medium">{d.name}</td>
                  <td className="font-mono text-xs">{d.slug}</td>
                  <td><Badge>{d.category}</Badge></td>
                  <td>v{d.version}</td>
                  <td><Badge variant={d.isActive ? 'success' : 'gray'}>{d.isActive ? 'Yes' : 'No'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'submissions' && (
        <div className="table-container">
          <table>
            <thead><tr><th>ID</th><th>Form</th><th>Patient</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>
              {submissions.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">No submissions</td></tr> :
                submissions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="font-mono text-xs">{s.id?.slice(0, 8)}</td>
                    <td className="font-medium">{s.formName}</td>
                    <td className="text-xs">{s.patientName || '-'}</td>
                    <td><Badge>{s.status}</Badge></td>
                    <td className="text-xs">{s.submittedAt?.split('T')[0]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
