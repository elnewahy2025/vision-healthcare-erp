import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { FileSpreadsheet, Plus, Search, Clock, Play, Download } from 'lucide-react';
import api from '../lib/api';

export default function ReportsPage() {
  const [tab, setTab] = useState<'reports' | 'schedules' | 'executions'>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadSchedules = async (reportId: string) => {
    try { const r = await api.get(`/reports/${reportId}/schedules`); setSchedules(r.data.data); } catch { setSchedules([]); }
  };
  const loadExecutions = async (reportId: string) => {
    try { const r = await api.get(`/reports/${reportId}/executions`); setExecutions(r.data.data); } catch { setExecutions([]); }
  };

  useEffect(() => {
    api.get('/reports').then(r => setReports(r.data.data)).catch(() => []).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  const filtered = reports.filter((r: any) =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Report Builder</h1><p className="text-gray-500 mt-1">{reports.length} report definitions</p></div>
        <Button><Plus className="w-4 h-4" /> New Report</Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'reports' ? 'primary' : 'secondary'} onClick={() => setTab('reports')}><FileSpreadsheet className="w-4 h-4" /> Reports ({reports.length})</Button>
        <Button variant={tab === 'schedules' ? 'primary' : 'secondary'} onClick={() => setTab('schedules')}><Clock className="w-4 h-4" /> Schedules ({schedules.length})</Button>
        <Button variant={tab === 'executions' ? 'primary' : 'secondary'} onClick={() => setTab('executions')}><Play className="w-4 h-4" /> Executions ({executions.length})</Button>
      </div>

      <Card className="mb-6"><CardBody>
        <Input placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>

      {tab === 'reports' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Category</th><th>Columns</th><th>Formats</th><th>Scheduled</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No reports defined</td></tr> :
                filtered.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="font-medium">{r.name}</td>
                    <td><Badge>{r.category}</Badge></td>
                    <td>{r.columns?.length || 0}</td>
                    <td>{(r.exportFormats || []).join(', ')}</td>
                    <td><Badge variant={r.isScheduled ? 'success' : 'gray'}>{r.isScheduled ? 'Yes' : 'No'}</Badge></td>
                    <td>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedReport(r); loadSchedules(r.id); loadExecutions(r.id); }}>View</Button>
                        <Button variant="ghost" size="sm" onClick={async () => { await api.post(`/reports/${r.id}/execute`); loadExecutions(r.id); }}>Run</Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'schedules' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Report</th><th>Cron</th><th>Format</th><th>Recipients</th><th>Active</th><th>Next Run</th></tr></thead>
            <tbody>
              {schedules.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No schedules — select a report to view its schedules</td></tr> :
                schedules.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="font-medium">{selectedReport?.name}</td>
                    <td className="font-mono text-xs">{s.cron}</td>
                    <td><Badge>{s.format}</Badge></td>
                    <td className="text-xs">{(s.recipients || []).join(', ') || '-'}</td>
                    <td><Badge variant={s.isActive ? 'success' : 'gray'}>{s.isActive ? 'Active' : 'Paused'}</Badge></td>
                    <td className="text-xs">{s.nextRunAt || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'executions' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Report</th><th>Status</th><th>Format</th><th>Rows</th><th>Trigger</th><th>Started</th><th>Actions</th></tr></thead>
            <tbody>
              {executions.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">No executions — select a report and run it</td></tr> :
                executions.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="font-medium">{selectedReport?.name}</td>
                    <td><Badge variant={e.status === 'completed' ? 'success' : e.status === 'failed' ? 'danger' : 'warning'}>{e.status}</Badge></td>
                    <td><Badge>{e.format}</Badge></td>
                    <td>{e.rowCount}</td>
                    <td><Badge>{e.trigger}</Badge></td>
                    <td className="text-xs">{e.startedAt?.split('T')[0] || '-'}</td>
                    <td>{e.status === 'completed' ? <Button variant="ghost" size="sm"><Download className="w-3 h-3" /></Button> : '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedReport && <Modal open={!!selectedReport} onClose={() => setSelectedReport(null)} title={selectedReport.name} size="lg">
        <div className="space-y-3 text-sm">
          <p><strong>Category:</strong> {selectedReport.category}</p>
          <p><strong>Description:</strong> {selectedReport.description || '-'}</p>
          <p><strong>Columns:</strong> {(selectedReport.columns || []).map((c: any) => c.header || c).join(', ') || 'None configured'}</p>
          <p><strong>Formats:</strong> {(selectedReport.exportFormats || []).join(', ')}</p>
          {selectedReport.queryConfig?.table && <p><strong>Table:</strong> {selectedReport.queryConfig.table}</p>}

          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={async () => { await api.post(`/reports/${selectedReport.id}/execute`); loadExecutions(selectedReport.id); }}><Play className="w-3 h-3" /> Run Now</Button>
          </div>

          {schedules.length > 0 && (
            <div className="mt-4">
              <p className="font-medium mb-2">Schedules</p>
              {schedules.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs mb-1">
                  <span><Clock className="w-3 h-3 inline" /> {s.cron} · {s.format}</span>
                  <Badge variant={s.isActive ? 'success' : 'gray'}>{s.isActive ? 'Active' : 'Paused'}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>}
    </div>
  );
}
