import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Select, Spinner, EmptyState } from '../components/ui';
import { Shield, Download, Filter, Search, Calendar, User, Activity, Eye, Clock } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface AuditEntry { id: string; action: string; entity_type: string; entity_id: string; metadata: string; ip_address: string; created_at: string; user_id: string; }

export default function AuditLogsAdvancedPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 50 };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const res = await api.get('/audit/logs', { params });
      setLogs(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch { toast.error('Failed to load logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, actionFilter, entityFilter, fromDate, toDate]);

  const handleExport = async (format: string) => {
    try {
      const params: any = { format };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const res = await api.get('/audit/logs/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
  };

  const filteredLogs = logs.filter(l => {
    if (searchTerm && !JSON.stringify(l).toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const actionTypes = [...new Set(logs.map(l => l.action))];
  const entityTypes = [...new Set(logs.map(l => l.entity_type))];

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg"><Shield className="w-6 h-6 text-indigo-600" /></div>
          <div><h1 className="text-2xl font-bold">Audit Logs</h1><p className="text-sm text-gray-500">Complete activity trail with export and filtering</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExport('csv')} icon={<Download className="w-4 h-4" />}>CSV</Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('json')} icon={<Download className="w-4 h-4" />}>JSON</Button>
        </div>
      </div>

      {/* Filters */}
      <Card><CardBody>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Input label="Search" placeholder="Search logs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <Select label="Action" value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            options={[{ value: '', label: 'All Actions' }, ...actionTypes.map(a => ({ value: a, label: a }))]} />
          <Select label="Entity" value={entityFilter} onChange={e => setEntityFilter(e.target.value)}
            options={[{ value: '', label: 'All Entities' }, ...entityTypes.map(e => ({ value: e, label: e }))]} />
          <Input label="From" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <Input label="To" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
      </CardBody></Card>

      {/* Timeline View */}
      {filteredLogs.length === 0 ? (
        <EmptyState icon={<Activity className="w-12 h-12" />} title="No logs found" message="Try adjusting your filters" />
      ) : (
        <div className="space-y-3">
          {filteredLogs.map(log => (
            <Card key={log.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setSelected(log)}>
              <CardBody className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold bg-indigo-500">
                      {log.action.split('.').pop()?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{log.action}</span>
                      {log.entity_type && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{log.entity_type}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <Clock className="w-3 h-3 inline" /> {new Date(log.created_at).toLocaleString()}
                      {log.ip_address && <> • IP: {log.ip_address}</>}
                    </p>
                  </div>
                  <Eye className="w-4 h-4 text-gray-400" />
                </div>
              </CardBody>
            </Card>
          ))}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">Audit Log Detail</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Action:</span><span className="font-medium">{selected.action}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Entity:</span><span>{selected.entity_type || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Entity ID:</span><span className="font-mono text-xs">{selected.entity_id || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">User:</span><span>{selected.user_id || 'System'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">IP:</span><span>{selected.ip_address || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Time:</span><span>{new Date(selected.created_at).toLocaleString()}</span></div>
              {selected.metadata && (
                <div><span className="text-gray-500">Metadata:</span>
                  <pre className="mt-1 bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto">{JSON.stringify(JSON.parse(selected.metadata || '{}'), null, 2)}</pre>
                </div>
              )}
            </div>
            <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
