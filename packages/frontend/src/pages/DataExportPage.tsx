import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Select } from '../components/ui';
import { Download, Plus, Search, Clock, Database, FileJson, FileSpreadsheet } from 'lucide-react';
import api from '../lib/api';

export default function DataExportPage() {
  const [tab, setTab] = useState<'export' | 'jobs' | 'definitions'>('export');
  const [modules, setModules] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState('patients');
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [running, setRunning] = useState(false);

  const load = () => Promise.all([
    api.get('/export/modules').then(r => setModules(r.data.data)).catch(() => []),
    api.get('/export/jobs').then(r => setJobs(r.data.data)).catch(() => []),
    api.get('/export/definitions').then(r => setDefinitions(r.data.data)).catch(() => []),
  ]).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Data Export & Interoperability</h1><p className="text-gray-500 mt-1">{modules.length} modules · {jobs.length} export jobs</p></div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'export' ? 'primary' : 'secondary'} onClick={() => setTab('export')}><Download className="w-4 h-4" /> Export Data</Button>
        <Button variant={tab === 'jobs' ? 'primary' : 'secondary'} onClick={() => setTab('jobs')}><Clock className="w-4 h-4" /> Job History ({jobs.length})</Button>
        <Button variant={tab === 'definitions' ? 'primary' : 'secondary'} onClick={() => setTab('definitions')}><FileJson className="w-4 h-4" /> Saved Exports ({definitions.length})</Button>
      </div>

      {tab === 'export' && (
        <div className="max-w-lg mx-auto">
          <Card><CardBody>
            <h2 className="text-lg font-semibold mb-4">Run Data Export</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Module</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={selectedModule} onChange={e => setSelectedModule(e.target.value)}>
                  {modules.map((m: any) => <option key={m.module} value={m.module}>{m.module}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Format</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={selectedFormat} onChange={e => setSelectedFormat(e.target.value)}>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="fhir_json">FHIR JSON (R4)</option>
                </select>
              </div>
              <Button className="w-full" loading={running} onClick={async () => {
                setRunning(true);
                await api.post('/export/run', { module: selectedModule, format: selectedFormat });
                await load();
                setRunning(false);
                setTab('jobs');
              }}><Download className="w-4 h-4" /> Export {selectedModule} as {selectedFormat.toUpperCase()}</Button>
            </div>
          </CardBody></Card>

          {modules.length > 0 && (
            <Card className="mt-4"><CardBody>
              <h3 className="font-semibold mb-3">Available Export Modules</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {modules.map((m: any) => (
                  <div key={m.module} className="p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => setSelectedModule(m.module)}>
                    <p className="font-medium text-sm capitalize">{m.module}</p>
                    <p className="text-xs text-gray-500">{m.tables?.length} tables · {m.formats?.join(', ')}</p>
                  </div>
                ))}
              </div>
            </CardBody></Card>
          )}
        </div>
      )}

      {tab === 'jobs' && (
        <div className="table-container">
          <table><thead><tr><th>Module</th><th>Format</th><th>Records</th><th>Size</th><th>Status</th><th>Trigger</th><th>Started</th><th>Actions</th></tr></thead>
            <tbody>
              {jobs.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">No export jobs yet</td></tr> :
                jobs.map((j: any) => (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <td className="font-medium capitalize">{j.module}</td>
                    <td><Badge>{j.format}</Badge></td>
                    <td>{j.recordCount?.toLocaleString()}</td>
                    <td className="text-xs">{j.fileSize ? (j.fileSize / 1024).toFixed(1) + ' KB' : '-'}</td>
                    <td><Badge variant={j.status === 'completed' ? 'success' : j.status === 'failed' ? 'danger' : 'warning'}>{j.status}</Badge></td>
                    <td><Badge>{j.trigger}</Badge></td>
                    <td className="text-xs">{j.startedAt?.split('T')[0]}</td>
                    <td>{j.status === 'completed' && <Button variant="ghost" size="sm"><Download className="w-3 h-3" /></Button>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'definitions' && (
        <div>
          <div className="flex gap-2 mb-4">
            <Button><Plus className="w-4 h-4" /> New Export Definition</Button>
          </div>
          <div className="table-container">
            <table><thead><tr><th>Name</th><th>Module</th><th>Format</th><th>Columns</th><th>Date Range</th><th>Scheduled</th></tr></thead>
              <tbody>
                {definitions.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No saved export definitions</td></tr> :
                  definitions.map((d: any) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="font-medium">{d.name}</td>
                      <td className="capitalize">{d.module}</td>
                      <td><Badge>{d.format}</Badge></td>
                      <td>{d.columns?.length || 'All'}</td>
                      <td className="text-xs">{d.dateRange}</td>
                      <td><Badge variant={d.isScheduled ? 'success' : 'gray'}>{d.isScheduled ? d.scheduleCron : 'No'}</Badge></td>
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
