import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { emergencyAccessApi } from '../lib/api/users';
import { ShieldAlert, Clock, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { Can } from '../components/Can';

interface EmergencyRecord {
  id: string;
  patient_id: string;
  reason: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function EmergencyAccessPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<EmergencyRecord[]>([]);
  const [log, setLog] = useState<EmergencyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState('');
  const [reason, setReason] = useState('');
  const [activating, setActivating] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [activeData, logData] = await Promise.all([
        emergencyAccessApi.listActive(),
        emergencyAccessApi.log(),
      ]);
      setActive(activeData || []);
      setLog(logData || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId.trim() || !reason.trim()) return;
    setActivating(true);
    try {
      await emergencyAccessApi.activate({ patientId: patientId.trim(), reason: reason.trim() });
      setPatientId('');
      setReason('');
      await load();
    } catch {
      // silent
    } finally {
      setActivating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await emergencyAccessApi.revoke(id);
      await load();
    } catch {
      // silent
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-error" />
        <h1 className="text-2xl font-semibold">{t('nav.emergencyAccess', 'Emergency Access')}</h1>
      </div>

      {/* Activate form */}
      <form onSubmit={handleActivate} className="bg-card border border-error/30 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4" />
          <span>Break-glass access grants temporary entry to a patient record. All access is audited and expires in 60 minutes.</span>
        </div>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-secondary mb-1">Patient ID</label>
            <input value={patientId} onChange={e => setPatientId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-primary focus:ring-2 focus:ring-error/20 focus:border-error"
              placeholder="UUID of the patient" required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-secondary mb-1">Reason (min 10 characters)</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-primary focus:ring-2 focus:ring-error/20 focus:border-error"
              placeholder="Why is emergency access needed?" required minLength={10} />
          </div>
          <button type="submit" disabled={activating}
            className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 disabled:opacity-50">
            <ShieldAlert className="h-4 w-4" /> {activating ? '...' : 'Activate'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="text-center py-8 text-muted">{t('common.loading', 'Loading...')}</div>
      ) : (
        <>
          {/* Active emergency access */}
          {active.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" /> Active Emergency Access ({active.length})
              </h2>
              <div className="bg-card border border-warning/30 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-secondary">
                      <th className="text-left px-4 py-3 text-sm font-medium text-secondary">Patient</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-secondary">Reason</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-secondary">Expires</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-secondary">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map(rec => (
                      <tr key={rec.id} className="border-b border-border">
                        <td className="px-4 py-3 text-sm font-mono">{rec.patient_id.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-sm text-secondary">{rec.reason}</td>
                        <td className="px-4 py-3 text-sm text-warning">{new Date(rec.expires_at).toLocaleTimeString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleRevoke(rec.id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-error/10 text-error rounded hover:bg-error/20 ml-auto">
                            <X className="h-3 w-3" /> Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit log */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-muted" /> Audit Log
            </h2>
            {log.length === 0 ? (
              <div className="text-center py-8 text-muted">No emergency access history</div>
            ) : (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-secondary">
                      <th className="text-left px-4 py-3 text-sm font-medium text-secondary">Patient</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-secondary">Reason</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-secondary">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-secondary">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.slice(0, 50).map(rec => (
                      <tr key={rec.id} className="border-b border-border hover:bg-surface-secondary/50">
                        <td className="px-4 py-3 text-sm font-mono">{rec.patient_id.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-sm text-secondary">{rec.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${rec.status === 'active' ? 'bg-warning-soft text-warning' : rec.status === 'revoked' ? 'bg-error-soft text-error' : 'bg-success-soft text-success'}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">{new Date(rec.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
