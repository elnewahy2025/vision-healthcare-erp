import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { communicationsApi } from '../lib/api';
import { MessageSquare, Loader2, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

export default function NotificationLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  useEffect(() => { loadLogs(); }, [page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await communicationsApi.logs({ page, limit: 20 });
      setLogs(data.data);
      setPagination(data.pagination);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><MessageSquare className="w-6 h-6" /> Notification Logs</h1>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Channel</th>
              <th>Recipient</th>
              <th>Template</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" /></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-500">No notifications sent yet</td></tr>
            ) : logs.map((log: any) => (
              <tr key={log.id}>
                <td className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                <td><span className={`badge ${log.channel === 'email' ? 'badge-info' : 'badge-success'}`}>{log.channel}</span></td>
                <td className="text-sm">{log.recipient}</td>
                <td className="text-xs font-mono text-gray-500">{log.template_key || '—'}</td>
                <td>{log.status === 'sent' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
