import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { HardDrive, Plus, Search, RefreshCw, Shield, Activity, Clock } from 'lucide-react';
import api from '../lib/api';

export default function DrBackupPage() {
  const [tab, setTab] = useState<'backups' | 'configs' | 'dr'>('backups');
  const [backups, setBackups] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [drConfig, setDrConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningBackup, setRunningBackup] = useState(false);
  const [showNewConfig, setShowNewConfig] = useState(false);

  const load = () => Promise.all([
    api.get('/dr/backups').then(r => setBackups(r.data.data)).catch(() => []),
    api.get('/dr/backup-configs').then(r => setConfigs(r.data.data)).catch(() => []),
    api.get('/dr/config').then(r => setDrConfig(r.data.data)).catch(() => null),
  ]).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Backup & Disaster Recovery</h1></div>
        <Button onClick={async () => {
          setRunningBackup(true);
          await api.post('/dr/backups/run', { type: 'full' });
          await load();
          setRunningBackup(false);
        }} loading={runningBackup}><RefreshCw className="w-4 h-4" /> Run Backup</Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'backups' ? 'primary' : 'secondary'} onClick={() => setTab('backups')}><HardDrive className="w-4 h-4" /> Backups ({backups.length})</Button>
        <Button variant={tab === 'configs' ? 'primary' : 'secondary'} onClick={() => setTab('configs')}><Activity className="w-4 h-4" /> Configs ({configs.length})</Button>
        <Button variant={tab === 'dr' ? 'primary' : 'secondary'} onClick={() => setTab('dr')}><Shield className="w-4 h-4" /> DR Config</Button>
      </div>

      {tab === 'backups' && (
        <div className="table-container">
          <table><thead><tr><th>Config</th><th>Type</th><th>Status</th><th>Size</th><th>Checksum</th><th>Trigger</th><th>Started</th></tr></thead>
            <tbody>
              {backups.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">No backups yet. Run your first backup.</td></tr> :
                backups.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="font-medium">{b.configName || 'Manual'}</td>
                    <td><Badge>{b.type}</Badge></td>
                    <td><Badge variant={b.status === 'completed' ? 'success' : b.status === 'failed' ? 'danger' : 'warning'}>{b.status}</Badge></td>
                    <td className="text-xs">{b.sizeBytes ? (b.sizeBytes / 1024 / 1024).toFixed(1) + ' MB' : '-'}</td>
                    <td className="font-mono text-xs">{b.checksum?.slice(0, 16) || '-'}</td>
                    <td><Badge>{b.trigger}</Badge></td>
                    <td className="text-xs">{b.startedAt?.split('T')[0]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'configs' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {configs.map((c: any) => (
              <Card key={c.id}>
                <CardBody>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{c.name}</h3>
                    <Badge>{c.type}</Badge></div>
                  <p className="text-xs text-gray-500 mb-2">Schedule: <code className="font-mono">{c.schedule}</code></p>
                  <p className="text-xs text-gray-500">Retention: {c.retentionDays} days · Location: {c.storageLocation}</p>
                  <p className="text-xs text-gray-500 mt-1">Last backup: {c.lastBackupAt?.split('T')[0] || 'Never'} · <Badge variant={c.isActive ? 'success' : 'gray'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></p>
                </CardBody>
              </Card>
            ))}
            {configs.length === 0 && <Card className="col-span-2"><CardBody><p className="text-gray-500 text-center py-6">No backup configs. Create one to automate backups.</p></CardBody></Card>}
          </div>
          <Button onClick={() => setShowNewConfig(true)}><Plus className="w-4 h-4" /> New Backup Config</Button>
        </div>
      )}

      {tab === 'dr' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card><CardBody>
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-xl font-bold"><Badge variant={drConfig?.status === 'healthy' ? 'success' : 'danger'}>{drConfig?.status || 'Not configured'}</Badge></p>
            </CardBody></Card>
            <Card><CardBody>
              <p className="text-sm text-gray-500">RPO</p>
              <p className="text-xl font-bold">{drConfig?.rpoMinutes || 60} min</p>
              <p className="text-xs text-gray-400">Recovery Point Objective</p>
            </CardBody></Card>
            <Card><CardBody>
              <p className="text-sm text-gray-500">RTO</p>
              <p className="text-xl font-bold">{drConfig?.rtoMinutes || 120} min</p>
              <p className="text-xs text-gray-400">Recovery Time Objective</p>
            </CardBody></Card>
          </div>

          <Card className="mb-4"><CardBody>
            <h3 className="font-semibold mb-3">Disaster Recovery Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Failover Strategy</p><p className="font-medium capitalize">{drConfig?.failoverStrategy || 'manual'}</p></div>
              <div><p className="text-gray-500">Replication Region</p><p className="font-medium">{drConfig?.replicationRegion || 'auto'}</p></div>
              <div><p className="text-gray-500">Cross-Region Replication</p><p className="font-medium">{drConfig?.crossRegionReplication ? 'Enabled' : 'Disabled'}</p></div>
              <div><p className="text-gray-500">Secondary Region</p><p className="font-medium">{drConfig?.secondaryRegion || 'None'}</p></div>
              <div><p className="text-gray-500">Last DR Test</p><p className="font-medium">{drConfig?.lastDrTestAt?.split('T')[0] || 'Never'}</p></div>
            </div>
          </CardBody></Card>

          <Button onClick={async () => {
            await api.post('/dr/test');
            await load();
          }}><Shield className="w-4 h-4" /> Run DR Test</Button>
        </div>
      )}

      {showNewConfig && <Modal open={showNewConfig} onClose={() => setShowNewConfig(false)} title="New Backup Config" size="md">
        <p className="text-gray-500 text-sm">Configure automated backups via the API. Set schedule in cron format, retention period, and storage location.</p>
      </Modal>}
    </div>
  );
}
