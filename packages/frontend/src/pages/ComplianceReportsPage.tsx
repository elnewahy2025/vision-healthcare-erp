import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { ScrollText, Plus, Search, Shield, FileText, UserCheck, Clock } from 'lucide-react';
import api from '../lib/api';

export default function ComplianceReportsPage() {
  const [tab, setTab] = useState<'reports' | 'hipaa' | 'retention' | 'baa'>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [hipaaSummary, setHipaaSummary] = useState<any>(null);
  const [hipaaLogs, setHipaaLogs] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [baas, setBaas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get('/compliance/reports').then(r => setReports(r.data.data)).catch(() => []),
      api.get('/compliance/hipaa-summary').then(r => setHipaaSummary(r.data.data)).catch(() => null),
      api.get('/compliance/hipaa-audit').then(r => setHipaaLogs(r.data.data)).catch(() => []),
      api.get('/compliance/retention-policies').then(r => setPolicies(r.data.data)).catch(() => []),
      api.get('/compliance/baa').then(r => setBaas(r.data.data)).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Compliance & Audit</h1><p className="text-gray-500 mt-1">{reports.length} reports · {baas.length} BAAs</p></div>
        <Button><Plus className="w-4 h-4" /> New Report</Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === 'reports' ? 'primary' : 'secondary'} onClick={() => setTab('reports')}><FileText className="w-4 h-4" /> Reports ({reports.length})</Button>
        <Button variant={tab === 'hipaa' ? 'primary' : 'secondary'} onClick={() => setTab('hipaa')}><Shield className="w-4 h-4" /> HIPAA Audit</Button>
        <Button variant={tab === 'retention' ? 'primary' : 'secondary'} onClick={() => setTab('retention')}><Clock className="w-4 h-4" /> Retention ({policies.length})</Button>
        <Button variant={tab === 'baa' ? 'primary' : 'secondary'} onClick={() => setTab('baa')}><UserCheck className="w-4 h-4" /> BAA ({baas.length})</Button>
      </div>

      {tab === 'reports' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Title</th><th>Type</th><th>Period</th><th>Status</th><th>Generated</th><th>Actions</th></tr></thead>
            <tbody>
              {reports.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No compliance reports</td></tr> :
                reports.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="font-medium">{r.title}</td>
                    <td><Badge>{r.type}</Badge></td>
                    <td className="text-xs">{r.periodStart} → {r.periodEnd}</td>
                    <td><Badge variant={r.status === 'generated' ? 'success' : r.status === 'draft' ? 'warning' : 'gray'}>{r.status}</Badge></td>
                    <td className="text-xs">{r.generatedAt?.split('T')[0] || '-'}</td>
                    <td><Button variant="ghost" size="sm" onClick={() => setSelectedReport(r)}>View</Button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'hipaa' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card><CardBody><p className="text-sm text-gray-500">Events (90d)</p><p className="text-2xl font-bold">{hipaaSummary?.totalEvents || 0}</p></CardBody></Card>
            <Card><CardBody><p className="text-sm text-gray-500">Unique Users</p><p className="text-2xl font-bold">{hipaaSummary?.uniqueUsers || 0}</p></CardBody></Card>
            <Card><CardBody><p className="text-sm text-gray-500">Top Action</p><p className="text-lg font-bold">{hipaaSummary?.byAction?.[0]?.action || '-'}</p></CardBody></Card>
            <Card><CardBody><p className="text-sm text-gray-500">Top Entity</p><p className="text-lg font-bold">{hipaaSummary?.byEntity?.[0]?.entity || '-'}</p></CardBody></Card>
          </div>

          <Card className="mb-4"><CardBody><h3 className="font-semibold mb-2">Actions Breakdown</h3>
            <div className="flex gap-2 flex-wrap">
              {(hipaaSummary?.byAction || []).map((a: any) => <Badge key={a.action}>{a.action}: {a.count}</Badge>)}
              {!hipaaSummary?.byAction?.length && <p className="text-sm text-gray-500">No data</p>}
            </div>
          </CardBody></Card>

          <div className="table-container">
            <table><thead><tr><th>Action</th><th>Entity</th><th>Entity ID</th><th>User</th><th>IP</th><th>Timestamp</th></tr></thead>
              <tbody>
                {hipaaLogs.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">No audit logs</td></tr> :
                  hipaaLogs.slice(0, 50).map((l: any) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td><Badge>{l.action}</Badge></td>
                      <td className="text-xs">{l.entity}</td>
                      <td className="font-mono text-xs">{l.entityId?.slice(0, 8) || '-'}</td>
                      <td className="text-xs">{l.userId?.slice(0, 8) || '-'}</td>
                      <td className="text-xs">{l.ip || '-'}</td>
                      <td className="text-xs">{l.timestamp?.split('T')[0]}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'retention' && (
        <div className="table-container">
          <table><thead><tr><th>Entity</th><th>Retention</th><th>Action</th><th>Active</th><th>Last Cleanup</th></tr></thead>
            <tbody>
              {policies.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">No retention policies</td></tr> :
                policies.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="font-medium">{p.entity}</td>
                    <td>{p.retentionDays} days</td>
                    <td><Badge>{p.action}</Badge></td>
                    <td><Badge variant={p.isActive ? 'success' : 'gray'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="text-xs">{p.lastCleanupAt?.split('T')[0] || 'Never'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'baa' && (
        <div className="table-container">
          <table><thead><tr><th>Organization</th><th>Contact</th><th>Executed</th><th>Expiry</th><th>Status</th></tr></thead>
            <tbody>
              {baas.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">No Business Associate Agreements</td></tr> :
                baas.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="font-medium">{b.organizationName}</td>
                    <td className="text-xs">{b.contactName || '-'} {b.contactEmail ? `<${b.contactEmail}>` : ''}</td>
                    <td className="text-xs">{b.executedDate || '-'}</td>
                    <td className="text-xs">{b.expiryDate || '-'}</td>
                    <td><Badge variant={b.status === 'executed' ? 'success' : b.status === 'expired' ? 'danger' : 'warning'}>{b.status}</Badge></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedReport && <Modal open={!!selectedReport} onClose={() => setSelectedReport(null)} title={selectedReport.title} size="md">
        <div className="space-y-2 text-sm">
          <p><strong>Type:</strong> {selectedReport.type}</p>
          <p><strong>Period:</strong> {selectedReport.periodStart} → {selectedReport.periodEnd}</p>
          <p><strong>Status:</strong> {selectedReport.status}</p>
          {selectedReport.findings && <div><strong>Findings:</strong><p className="mt-1 p-2 bg-gray-50 rounded text-xs">{selectedReport.findings}</p></div>}
          {selectedReport.recommendations && <div><strong>Recommendations:</strong><p className="mt-1 p-2 bg-gray-50 rounded text-xs">{selectedReport.recommendations}</p></div>}
        </div>
      </Modal>}
    </div>
  );
}
