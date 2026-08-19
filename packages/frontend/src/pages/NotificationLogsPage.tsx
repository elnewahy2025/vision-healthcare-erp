import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Button, PageLoader, EmptyState, Badge } from '../components/ui';
import { communicationsApi } from '../lib/api';
import { sanitizeString } from '../lib/sanitize';
import { Can } from '../components/Can';

interface NotificationLog {
  id: string;
  channel: string;
  recipient: string;
  template_key: string | null;
  status: string;
  created_at: string;
}

interface Pagination {
  total: number;
  totalPages: number;
}

export default function NotificationLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, totalPages: 0 });

  const loadLogs = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const data = await communicationsApi.logs({ page, limit: 20 });
      setLogs(data.data || []);
      setPagination(data.pagination || { total: 0, totalPages: 0 });
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setCurrentPage(newPage);
      loadLogs(newPage);
    },
    [loadLogs],
  );

  useEffect(() => {
    void loadLogs(1);
  }, [loadLogs]);

  const handleLoad = useCallback(() => {
    loadLogs(currentPage);
  }, [currentPage, loadLogs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" /> {t('notifLog.title')}
        </h1>
        <Can permission="notifications.view">
          <Button onClick={handleLoad} loading={loading}>
          {t('notifLog.title')}
        </Button>
        </Can>
      </div>

      {loading ? (
        <PageLoader message={t('notifLog.loadingLogs')} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-12 h-12" />}
          title={t('notifLog.noLogs')}
          message={t('notifLog.noLogs')}
        />
      ) : (
        <>
          <div className="overflow-x-auto bg-[var(--surface)] border rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-[var(--surface-secondary)]">
                  <th className="text-left p-3 text-sm font-medium text-[var(--text-secondary)]">{t('notifLog.time')}</th>
                  <th className="text-left p-3 text-sm font-medium text-[var(--text-secondary)]">{t('notifLog.channel')}</th>
                  <th className="text-left p-3 text-sm font-medium text-[var(--text-secondary)]">{t('notifLog.recipient')}</th>
                  <th className="text-left p-3 text-sm font-medium text-[var(--text-secondary)]">{t('notifLog.template')}</th>
                  <th className="text-left p-3 text-sm font-medium text-[var(--text-secondary)]">{t('notifLog.status')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-b-0 hover:bg-[var(--surface-secondary)]">
                    <td className="p-3 text-xs text-[var(--text-muted)]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <Badge variant={log.channel === 'email' ? 'info' : 'success'}>
                        {log.channel}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{sanitizeString(log.recipient)}</td>
                    <td className="p-3 text-xs font-mono text-[var(--text-muted)]">
                      {log.template_key ? sanitizeString(log.template_key) : '—'}
                    </td>
                    <td className="p-3">
                      {log.status === 'sent' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-muted)]">
                {t('notifLog.pageOf', {
                  current: currentPage,
                  total: pagination.totalPages,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  size="sm"
                  variant="secondary"
                  icon={<ChevronLeft className="w-4 h-4" />}
                />
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                  size="sm"
                  variant="secondary"
                  icon={<ChevronRight className="w-4 h-4" />}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
