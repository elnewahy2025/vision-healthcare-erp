import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { Upload, Download, Search, CheckCircle, XCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import api from '../lib/api';

export default function BulkImportPage() {
  const [tab, setTab] = useState<'import' | 'history'>('import');
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState('patients');
  const [rows, setRows] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const load = () => Promise.all([
    api.get('/import/modules').then(r => setModules(r.data.data)).catch(() => []),
    api.get('/import/jobs').then(r => setJobs(r.data.data)).catch(() => []),
  ]).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const doImport = async () => {
    if (!rows.trim()) return;
    setImporting(true);
    setResult(null);
    try {
      const parsedRows = rows.split('\n').filter(l => l.trim()).map(line => {
        const cols = line.split(',').map(c => c.trim());
        const headers = modules.find(m => m.module === selectedModule)?.columns || [];
        const row: any = {};
        headers.forEach((h: string, i: number) => { if (cols[i]) row[h] = cols[i]; });
        return row;
      });
      const r = await api.post('/import/start', { module: selectedModule, rows: parsedRows, fileName: `${selectedModule}_manual.csv` });
      setResult(r.data.data);
      load();
    } catch (e: any) {
      setResult({ status: 'failed', error: e.response?.data?.error || 'Import failed' });
    }
    setImporting(false);
  };

  if (loading) return <Spinner size="lg" className="py-16" />;

  const modConfig = modules.find(m => m.module === selectedModule);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Bulk Import</h1><p className="text-gray-500 mt-1">{modules.length} import modules</p></div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'import' ? 'primary' : 'secondary'} onClick={() => setTab('import')}><Upload className="w-4 h-4" /> Import Data</Button>
        <Button variant={tab === 'history' ? 'primary' : 'secondary'} onClick={() => setTab('history')}><FileSpreadsheet className="w-4 h-4" /> Job History ({jobs.length})</Button>
      </div>

      {tab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card><CardBody>
              <h2 className="text-lg font-semibold mb-4">Import {selectedModule}</h2>

              <div className="flex gap-2 mb-4 flex-wrap">
                {modules.map((m: any) => (
                  <button key={m.module} onClick={() => setSelectedModule(m.module)}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer capitalize ${selectedModule === m.module ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{m.module}</button>
                ))}
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Expected columns: <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{modConfig?.columns?.join(', ') || ''}</code></p>
                <textarea
                  className="w-full h-64 rounded-lg border border-gray-300 p-3 text-xs font-mono resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={`Paste CSV data here, one row per line, comma-separated\nExample:\nJohn,Doe,+966501234567,john@example.com,1990-01-01,Male,,,A+,active`}
                  value={rows} onChange={e => setRows(e.target.value)}
                />
              </div>

              <Button onClick={doImport} loading={importing} disabled={!rows.trim()}>
                <Upload className="w-4 h-4" /> Import {rows.split('\n').filter(l => l.trim()).length} Rows
              </Button>
            </CardBody></Card>
          </div>

          <div>
            {result && (
              <Card className={`mb-4 ${result.status === 'completed' ? 'border-green-300' : result.status === 'failed' ? 'border-red-300' : 'border-yellow-300'}`}>
                <CardBody>
                  <div className="flex items-center gap-2 mb-3">
                    {result.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                     result.status === 'failed' ? <XCircle className="w-5 h-5 text-red-500" /> :
                     <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                    <h3 className="font-semibold capitalize">{result.status}</h3>
                  </div>
                  {result.totalRows > 0 && (
                    <div className="text-sm space-y-1">
                      <p>Total: {result.totalRows}</p>
                      <p className="text-green-600">✓ Successful: {result.successful}</p>
                      <p className="text-red-600">✗ Failed: {result.failed}</p>
                    </div>
                  )}
                  {result.errors?.length > 0 && (
                    <div className="mt-3 max-h-32 overflow-y-auto">
                      <p className="text-xs font-medium text-red-600 mb-1">Errors:</p>
                      {result.errors.map((e: any, i: number) => (
                        <p key={i} className="text-xs text-red-500">Row {e.row}: {e.error}</p>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            <Card><CardBody>
              <h3 className="font-semibold mb-3">Template: {selectedModule}</h3>
              <div className="text-xs space-y-1">
                {modConfig?.columns?.map((c: string) => (
                  <div key={c} className="flex items-center gap-2">
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded flex-1">{c}</code>
                    <span className="text-gray-400">{c.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </CardBody></Card>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="table-container">
          <table><thead><tr><th>Module</th><th>File</th><th>Total</th><th>Success</th><th>Failed</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {jobs.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">No import jobs</td></tr> :
                jobs.map((j: any) => (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <td className="font-medium capitalize">{j.module}</td>
                    <td className="text-xs max-w-xs truncate">{j.fileName}</td>
                    <td>{j.totalRows}</td>
                    <td className="text-green-600">{j.successfulRows}</td>
                    <td className="text-red-600">{j.failedRows}</td>
                    <td><Badge variant={j.status === 'completed' ? 'success' : j.status === 'failed' ? 'danger' : 'warning'}>{j.status}</Badge></td>
                    <td className="text-xs">{j.createdAt?.split('T')[0]}</td>
                    <td><Button variant="ghost" size="sm" onClick={() => setSelectedJob(j)}>Details</Button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedJob && <Modal open={!!selectedJob} onClose={() => setSelectedJob(null)} title={`Import: ${selectedJob.fileName}`} size="md">
        <div className="space-y-2 text-sm">
          <p><strong>Module:</strong> {selectedJob.module}</p>
          <p><strong>Rows:</strong> {selectedJob.totalRows} total · {selectedJob.successfulRows} success · {selectedJob.failedRows} failed</p>
          <p><strong>Status:</strong> {selectedJob.status}</p>
          <p><strong>Started:</strong> {selectedJob.startedAt?.split('T')[0] || '-'} · <strong>Completed:</strong> {selectedJob.completedAt?.split('T')[0] || '-'}</p>
          {selectedJob.errors?.length > 0 && (
            <div><strong>Errors:</strong>
              {selectedJob.errors.slice(0, 10).map((e: any, i: number) => (
                <p key={i} className="text-xs text-red-500 mt-1">Row {e.row || i + 1}: {e.error || e}</p>
              ))}
            </div>
          )}
        </div>
      </Modal>}
    </div>
  );
}
