import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input } from '../components/ui';
import { Activity, Server, Bell, Database, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '../lib/api';

export default function SystemMonitorPage() {
  const [tab, setTab] = useState<'health' | 'alerts' | 'storage' | 'audit'>('health');
  const [health, setHealth] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [storage, setStorage] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditFilter, setAuditFilter] = useState('');

  const load = () => Promise.all([
    api.get('/system/health').then(r => setHealth(r.data.data)).catch(() => null),
    api.get('/system/alerts', { params: { acknowledged: 'false' } }).then(r => setAlerts(r.data.data)).catch(() => []),
    api.get('/system/storage').then(r => setStorage(r.data.data)).catch(() => []),
    api.get('/system/audit-log').then(r => setAuditLog(r.data.data)).catch(() => []),
  ]).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">System Monitor</h1></div>
        <Button onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === 'health' ? 'primary' : 'secondary'} onClick={() => setTab('health')}><Server className="w-4 h-4" /> Health</Button>
        <Button variant={tab === 'alerts' ? 'primary' : 'secondary'} onClick={() => setTab('alerts')}><Bell className="w-4 h-4" /> Alerts ({alerts.length})</Button>
        <Button variant={tab === 'storage' ? 'primary' : 'secondary'} onClick={() => setTab('storage')}><Database className="w-4 h-4" /> Storage</Button>
        <Button variant={tab === 'audit' ? 'primary' : 'secondary'} onClick={() => setTab('audit')}><Activity className="w-4 h-4" /> Audit Log</Button>
      </div>

      {tab === 'health' && health && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-4 h-4 rounded-full ${health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xl font-bold capitalize">{health.status}</span>
            <span className="text-sm text-gray-500">Uptime: {health.uptime}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardBody>
              <div className="flex items-center gap-2 mb-2"><Database className="w-4 h-4 text-blue-500" /><span className="font-medium">Database</span></div>
              <Badge variant={health.database?.status === 'healthy' ? 'success' : 'danger'}>{health.database?.status}</Badge>
              <p className="text-xs text-gray-500 mt-1">Latency: {health.database?.latency}</p>
            </CardBody></Card>
            <Card><CardBody>
              <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-blue-500" /><span className="font-medium">Redis</span></div>
              <Badge variant={health.redis?.status === 'connected' ? 'success' : 'danger'}>{health.redis?.status}</Badge>
            </CardBody></Card>
            <Card><CardBody>
              <div className="flex items-center gap-2 mb-2"><Server className="w-4 h-4 text-blue-500" /><span className="font-medium">Memory</span></div>
              <p className="text-xl font-bold">{health.memory?.heapUsed}</p>
              <p className="text-xs text-gray-500">RSS: {health.memory?.rss}</p>
            </CardBody></Card>
            <Card><CardBody>
              <div className="flex items-center gap-2 mb-2"><Server className="w-4 h-4 text-blue-500" /><span className="font-medium">Platform</span></div>
              <p className="text-sm">Node {health.platform?.node}</p>
              <p className="text-xs text-gray-500">{health.platform?.cpus} CPUs · {health.platform?.arch}</p>
            </CardBody></Card>
          </div>

          <Card><CardBody>
            <h3 className="font-semibold mb-3">Environment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-gray-500">Node.js</p><p className="font-medium">{health.platform?.node}</p></div>
              <div><p className="text-gray-500">Platform</p><p className="font-medium">{health.platform?.platform}</p></div>
              <div><p className="text-gray-500">Architecture</p><p className="font-medium">{health.platform?.arch}</p></div>
              <div><p className="text-gray-500">CPUs</p><p className="font-medium">{health.platform?.cpus}</p></div>
              <div><p className="text-gray-500">Heap Total</p><p className="font-medium">{health.memory?.heapTotal}</p></div>
              <div><p className="text-gray-500">Heap Used</p><p className="font-medium">{health.memory?.heapUsed}</p></div>
              <div><p className="text-gray-500">RSS</p><p className="font-medium">{health.memory?.rss}</p></div>
              <div><p className="text-gray-500">Uptime</p><p className="font-medium">{health.uptime}</p></div>
            </div>
          </CardBody></Card>
        </div>
      )}

      {tab === 'alerts' && (
        <div>
          {alerts.length === 0 ? (
            <Card><CardBody className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-500">No active alerts. System is healthy.</p>
            </CardBody></Card>
          ) : alerts.map((a: any) => (
            <Card key={a.id} className={`mb-3 border-l-4 ${a.severity === 'critical' ? 'border-l-red-500' : a.severity === 'warning' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={a.severity === 'critical' ? 'danger' : a.severity === 'warning' ? 'warning' : 'info'}>{a.severity}</Badge>
                      <span className="font-medium">{a.source}</span>
                    </div>
                    <p className="text-sm">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{a.createdAt?.split('T')[0]} {a.createdAt?.split('T')[1]?.slice(0, 5)}</p>
                  </div>
                  {!a.isAcknowledged && (
                    <Button variant="ghost" size="sm" onClick={async () => { await api.put(`/system/alerts/${a.id}/acknowledge`); load(); }}>Acknowledge</Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === 'storage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {storage.map((s: any) => (
            <Card key={s.table}>
              <CardBody>
                <p className="text-sm text-gray-500 capitalize">{s.table.replace(/_/g, ' ')}</p>
                <p className="text-xl font-bold">{s.recordCount?.toLocaleString()}</p>
                <p className="text-xs text-gray-400">records</p>
              </CardBody>
            </Card>
          ))}
          {storage.length === 0 && <p className="col-span-3 text-center py-12 text-gray-500">No storage data</p>}
        </div>
      )}

      {tab === 'audit' && (
        <div>
          <Card className="mb-4"><CardBody>
            <Input placeholder="Filter by action or entity..." value={auditFilter} onChange={e => setAuditFilter(e.target.value)} className="max-w-md" />
          </CardBody></Card>

          <div className="table-container">
            <table><thead><tr><th>Action</th><th>Entity</th><th>Entity ID</th><th>User</th><th>IP</th><th>Timestamp</th></tr></thead>
              <tbody>
                {auditLog.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No audit log entries</td></tr> :
                  auditLog.filter((l: any) => !auditFilter || l.action?.includes(auditFilter) || l.entity?.includes(auditFilter)).map((l: any) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td><Badge>{l.action}</Badge></td>
                      <td className="text-xs">{l.entity}</td>
                      <td className="font-mono text-xs">{l.entityId?.slice(0, 12) || '-'}</td>
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
    </div>
  );
}
