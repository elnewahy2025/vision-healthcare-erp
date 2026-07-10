import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { auditApi } from '../lib/api';
import { History, Loader2, ChevronLeft, ChevronRight, Filter, User, Shield } from 'lucide-react';

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await auditApi.list({ page, limit: 20, action: actionFilter || undefined, entityType: entityFilter || undefined });
      setLogs(data.data);
      setPagination(data.pagination);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLogs(); }, [page, actionFilter, entityFilter]);
  useEffect(() => { auditApi.actionTypes().then(setActionTypes).catch(() => {}); }, []);

  const actionColor = (action: string) => {
    if (action.includes('login')) return 'text-green-600';
    if (action.includes('delete') || action.includes('disable')) return 'text-red-600';
    if (action.includes('create')) return 'text-blue-600';
    if (action.includes('update') || action.includes('change')) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><History className="w-6 h-6" /> Audit Logs</h1>
          <p className="text-gray-500 mt-1">{pagination.total} entries</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="label">Action</label>
            <select className="input" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
              <option value="">All Actions</option>
              {actionTypes.map((a: string) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="label">Entity Type</label>
            <select className="input" value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1); }}>
              <option value="">All Entities</option>
              <option value="user">User</option>
              <option value="patient">Patient</option>
              <option value="appointment">Appointment</option>
              <option value="invoice">Invoice</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>User</th>
              <th>Entity</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" /></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-500">No audit logs found</td></tr>
            ) : logs.map((log: any) => (
              <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(selected?.id === log.id ? null : log)}>
                <td className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                <td><span className={`font-medium text-sm ${actionColor(log.action)}`}>{log.action}</span></td>
                <td className="text-sm font-mono text-gray-600">{log.user_id ? log.user_id.substring(0, 8) + '...' : '—'}</td>
                <td>
                  {log.entity_type ? <span className="badge badge-gray">{log.entity_type} {log.entity_id ? log.entity_id.substring(0, 8) : ''}</span> : '—'}
                </td>
                <td className="text-xs text-gray-500">{log.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Page {page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="btn-secondary btn-sm"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
