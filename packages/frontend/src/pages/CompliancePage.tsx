import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { Shield, Plus, Search, ScrollText, AlertTriangle, UserCheck, Siren } from 'lucide-react';
import api from '../lib/api';

export default function CompliancePage() {
  const [tab, setTab] = useState<'policies' | 'audits' | 'consents' | 'breaches'>('policies');
  const [policies, setPolicies] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [breaches, setBreaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get('/compliance/policies').then(r => setPolicies(r.data.data)).catch(() => []),
      api.get('/compliance/audits').then(r => setAudits(r.data.data)).catch(() => []),
      api.get('/compliance/consents').then(r => setConsents(r.data.data)).catch(() => []),
      api.get('/compliance/breaches').then(r => setBreaches(r.data.data)).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  const filteredPolicies = policies.filter((p: any) => !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Compliance Center</h1></div>
        <Button><Plus className="w-4 h-4" /> New Policy</Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === 'policies' ? 'primary' : 'secondary'} onClick={() => setTab('policies')}><ScrollText className='w-4 h-4' /> Policies ({policies.length})</Button>
        <Button variant={tab === 'audits' ? 'primary' : 'secondary'} onClick={() => setTab('audits')}><Search className='w-4 h-4' /> Audits ({audits.length})</Button>
        <Button variant={tab === 'consents' ? 'primary' : 'secondary'} onClick={() => setTab('consents')}><UserCheck className='w-4 h-4' /> Consents ({consents.length})</Button>
        <Button variant={tab === 'breaches' ? 'primary' : 'secondary'} onClick={() => setTab('breaches')}><AlertTriangle className='w-4 h-4' /> Breaches ({breaches.length})</Button>
      </div>

      <Card className="mb-6"><CardBody>
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>

      {tab === 'policies' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Code</th><th>Title</th><th>Category</th><th>Status</th><th>Effective</th><th>Review</th></tr></thead>
            <tbody>
              {filteredPolicies.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No policies</td></tr> :
                filteredPolicies.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedPolicy(p)}>
                    <td className="font-mono text-xs">{p.code}</td>
                    <td className="font-medium">{p.title}</td>
                    <td><Badge>{p.category}</Badge></td>
                    <td><Badge variant={p.status === 'active' ? 'success' : p.status === 'draft' ? 'warning' : 'gray'}>{p.status}</Badge></td>
                    <td className="text-xs">{p.effectiveDate || '-'}</td>
                    <td className="text-xs">{p.reviewDate || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'audits' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Title</th><th>Type</th><th>Auditor</th><th>Scheduled</th><th>Status</th></tr></thead>
            <tbody>
              {audits.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">No audits</td></tr> :
                audits.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="font-medium">{a.title}</td>
                    <td><Badge>{a.type}</Badge></td>
                    <td className="text-xs">{a.auditor || '-'}</td>
                    <td className="text-xs">{a.scheduledDate || '-'}</td>
                    <td><Badge variant={a.status === 'completed' ? 'success' : a.status === 'in_progress' ? 'warning' : 'gray'}>{a.status}</Badge></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'consents' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Patient</th><th>Consent Type</th><th>Granted</th><th>Date</th></tr></thead>
            <tbody>
              {consents.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-gray-500">No consent logs</td></tr> :
                consents.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="font-medium">{c.patientName}</td>
                    <td><Badge>{c.consentType}</Badge></td>
                    <td><Badge variant={c.granted ? 'success' : 'danger'}>{c.granted ? 'Granted' : 'Denied'}</Badge></td>
                    <td className="text-xs">{c.consentedAt?.split('T')[0]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'breaches' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Type</th><th>Severity</th><th>Detected</th><th>Records</th><th>Status</th></tr></thead>
            <tbody>
              {breaches.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">No breaches logged</td></tr> :
                breaches.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="font-medium">{b.type}</td>
                    <td><Badge variant={b.severity === 'high' || b.severity === 'critical' ? 'danger' : b.severity === 'medium' ? 'warning' : 'info'}>{b.severity}</Badge></td>
                    <td className="text-xs">{b.detectedDate}</td>
                    <td>{b.affectedRecords}</td>
                    <td><Badge variant={b.status === 'resolved' || b.status === 'closed' ? 'success' : b.status === 'investigating' ? 'warning' : 'danger'}>{b.status}</Badge></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPolicy && <Modal open={!!selectedPolicy} onClose={() => setSelectedPolicy(null)} title={selectedPolicy.title} size="lg">
        <div className="space-y-3 text-sm">
          <p><strong>Code:</strong> {selectedPolicy.code}</p>
          <p><strong>Category:</strong> {selectedPolicy.category}</p>
          <p><strong>Status:</strong> {selectedPolicy.status}</p>
          {selectedPolicy.description && <p><strong>Description:</strong> {selectedPolicy.description}</p>}
          {selectedPolicy.content && <div><strong>Content:</strong><p className="mt-1 p-3 bg-gray-50 rounded text-xs max-h-60 overflow-y-auto whitespace-pre-wrap">{selectedPolicy.content}</p></div>}
          <p><strong>Effective:</strong> {selectedPolicy.effectiveDate || '-'} | <strong>Review:</strong> {selectedPolicy.reviewDate || '-'}</p>
        </div>
      </Modal>}
    </div>
  );
}
