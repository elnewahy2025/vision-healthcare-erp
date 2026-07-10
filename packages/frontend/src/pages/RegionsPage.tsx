import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Select } from '../components/ui';
import { Globe, Server, Shield } from 'lucide-react';
import api from '../lib/api';

export default function RegionsPage() {
  const [regions, setRegions] = useState<any[]>([]);
  const [residency, setResidency] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPrimary, setSelectedPrimary] = useState('');
  const [selectedBackup, setSelectedBackup] = useState('');
  const [framework, setFramework] = useState('hipaa');

  useEffect(() => {
    Promise.all([
      api.get('/regions').then(r => setRegions(r.data.data)).catch(() => []),
      api.get('/regions/residency').then(r => { const d = r.data.data; if (d) { setResidency(d); setSelectedPrimary(d.primaryRegionId || ''); setSelectedBackup(d.backupRegionId || ''); setFramework(d.complianceFramework || 'hipaa'); } }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Multi-Region & Data Residency</h1><p className="text-gray-500 mt-1">{regions.length} available regions</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Available Regions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {regions.map((r: any) => (
              <Card key={r.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedPrimary === r.id ? 'ring-2 ring-primary-500' : ''}`}
                onClick={() => setSelectedPrimary(r.id)}>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{r.name}</h3>
                    <Badge>{r.provider}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{r.code}</p>
                  <p className="text-xs text-gray-400 mt-1">{r.location}</p>
                  {r.complianceFlags?.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {(r.complianceFlags || []).map((f: string) => <Badge key={f} variant="gray">{f.toUpperCase()}</Badge>)}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant={selectedPrimary === r.id ? 'primary' : 'secondary'} onClick={(e) => { e.stopPropagation(); setSelectedPrimary(r.id); }}>Primary</Button>
                    <Button size="sm" variant={selectedBackup === r.id ? 'primary' : 'secondary'} onClick={(e) => { e.stopPropagation(); setSelectedBackup(r.id); }}>Backup</Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Card><CardBody>
            <h3 className="font-semibold mb-4">Data Residency</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Primary Region</p>
                <p className="font-medium">{residency?.primaryRegionName || regions.find(r => r.id === selectedPrimary)?.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Backup Region</p>
                <p className="font-medium">{residency?.backupRegionName || regions.find(r => r.id === selectedBackup)?.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Compliance Framework</p>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={framework} onChange={e => setFramework(e.target.value)}>
                  <option value="hipaa">HIPAA</option>
                  <option value="gdpr">GDPR</option>
                  <option value="both">HIPAA + GDPR</option>
                </select>
              </div>
              <Button className="w-full" onClick={async () => {
                await api.put('/regions/residency', { primaryRegionId: selectedPrimary, backupRegionId: selectedBackup || undefined, complianceFramework: framework });
                const r = await api.get('/regions/residency'); setResidency(r.data.data);
              }}>Save Residency</Button>
              <p className="text-xs text-gray-400 mt-2">Select a region as Primary or Backup by clicking the buttons on each region card.</p>
            </div>
          </CardBody></Card>

          {residency && (
            <Card className="mt-4"><CardBody>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Compliance: {residency.complianceFramework?.toUpperCase()}</span>
              </div>
              <p className="text-xs text-gray-500">Data classification and residency configured for your tenant.</p>
            </CardBody></Card>
          )}
        </div>
      </div>
    </div>
  );
}
