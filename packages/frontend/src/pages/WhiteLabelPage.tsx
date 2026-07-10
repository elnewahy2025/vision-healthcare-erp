import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input } from '../components/ui';
import { Palette, Globe, Plus, Search, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';

export default function WhiteLabelPage() {
  const [tab, setTab] = useState<'branding' | 'domains'>('branding');
  const [branding, setBranding] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [editedBranding, setEditedBranding] = useState<any>({});

  const load = () => Promise.all([
    api.get('/white-label/branding').then(r => { setBranding(r.data.data); setEditedBranding(r.data.data); }).catch(() => {}),
    api.get('/white-label/domains').then(r => setDomains(r.data.data)).catch(() => []),
  ]).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">White-Label Customization</h1></div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'branding' ? 'primary' : 'secondary'} onClick={() => setTab('branding')}><Palette className="w-4 h-4" /> Branding</Button>
        <Button variant={tab === 'domains' ? 'primary' : 'secondary'} onClick={() => setTab('domains')}><Globe className="w-4 h-4" /> Domains ({domains.length})</Button>
      </div>

      {tab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardBody>
            <h3 className="font-semibold mb-4">Brand Identity</h3>
            <div className="space-y-4">
              <div><label className="text-sm font-medium">Brand Name</label>
                <Input value={editedBranding?.brandName || ''} onChange={e => setEditedBranding({...editedBranding, brandName: e.target.value})} /></div>
              <div><label className="text-sm font-medium">Primary Color</label>
                <div className="flex gap-2"><Input value={editedBranding?.primaryColor || '#0D9488'} onChange={e => setEditedBranding({...editedBranding, primaryColor: e.target.value})} className="flex-1" />
                  <div className="w-10 h-10 rounded border" style={{ backgroundColor: editedBranding?.primaryColor || '#0D9488' }}></div></div></div>
              <div><label className="text-sm font-medium">Secondary Color</label>
                <div className="flex gap-2"><Input value={editedBranding?.secondaryColor || '#14B8A6'} onChange={e => setEditedBranding({...editedBranding, secondaryColor: e.target.value})} className="flex-1" />
                  <div className="w-10 h-10 rounded border" style={{ backgroundColor: editedBranding?.secondaryColor || '#14B8A6' }}></div></div></div>
              <div><label className="text-sm font-medium">Accent Color</label>
                <div className="flex gap-2"><Input value={editedBranding?.accentColor || '#F59E0B'} onChange={e => setEditedBranding({...editedBranding, accentColor: e.target.value})} className="flex-1" />
                  <div className="w-10 h-10 rounded border" style={{ backgroundColor: editedBranding?.accentColor || '#F59E0B' }}></div></div></div>
              <div><label className="text-sm font-medium">Font Family</label>
                <Input value={editedBranding?.fontFamily || 'Inter'} onChange={e => setEditedBranding({...editedBranding, fontFamily: e.target.value})} /></div>
              <Button onClick={async () => {
                await api.put('/white-label/branding', editedBranding);
                load();
              }}>Save Branding</Button>
            </div>
          </CardBody></Card>

          <Card><CardBody>
            <h3 className="font-semibold mb-4">Preview</h3>
            <div className="p-6 rounded-lg border" style={{ backgroundColor: '#fff' }}>
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: editedBranding?.primaryColor || '#0D9488' }}>
                <span className="text-white text-xl font-bold">V</span>
              </div>
              <p className="text-xl font-bold" style={{ fontFamily: editedBranding?.fontFamily || 'Inter' }}>{editedBranding?.brandName || 'Vision Healthcare'}</p>
              <div className="flex gap-2 mt-2">
                <span className="px-3 py-1 rounded-full text-xs text-white" style={{ backgroundColor: editedBranding?.primaryColor || '#0D9488' }}>Primary</span>
                <span className="px-3 py-1 rounded-full text-xs text-white" style={{ backgroundColor: editedBranding?.secondaryColor || '#14B8A6' }}>Secondary</span>
                <span className="px-3 py-1 rounded-full text-xs text-white" style={{ backgroundColor: editedBranding?.accentColor || '#F59E0B' }}>Accent</span>
              </div>
            </div>
          </CardBody></Card>
        </div>
      )}

      {tab === 'domains' && (
        <div>
          <Card className="mb-6"><CardBody>
            <div className="flex gap-2">
              <Input placeholder="Enter domain (e.g., clinic.example.com)" value={newDomain} onChange={e => setNewDomain(e.target.value)} className="max-w-md" />
              <Button onClick={async () => {
                if (!newDomain) return;
                await api.post('/white-label/domains', { domain: newDomain });
                setNewDomain('');
                const r = await api.get('/white-label/domains'); setDomains(r.data.data);
              }}><Plus className="w-4 h-4" /> Add Domain</Button>
            </div>
          </CardBody></Card>

          <div className="table-container">
            <table>
              <thead><tr><th>Domain</th><th>Primary</th><th>Verified</th><th>SSL</th><th>Verified At</th></tr></thead>
              <tbody>
                {domains.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">No custom domains configured</td></tr> :
                  domains.map((d: any) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="font-medium">{d.domain}</td>
                      <td>{d.isPrimary ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-400" />}</td>
                      <td><Badge variant={d.isVerified ? 'success' : 'warning'}>{d.isVerified ? 'Verified' : 'Pending'}</Badge></td>
                      <td><Badge variant={d.sslStatus === 'active' ? 'success' : 'gray'}>{d.sslStatus}</Badge></td>
                      <td className="text-xs">{d.verifiedAt?.split('T')[0] || '-'}</td>
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
