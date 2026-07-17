import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { ShieldCheck, Plus, Search } from 'lucide-react';
import api from '../lib/api';

export default function InsurancePage() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'companies' | 'claims'>('companies');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newClaim, setNewClaim] = useState({ patientId: '', insuranceId: '', claimedAmount: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/insurance/companies').then(r => setCompanies(r.data.data)).catch(() => []),
      api.get('/insurance/claims').then(r => setClaims(r.data.data)).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  const filtered = (tab === 'companies' ? companies : claims).filter((x: any) =>
    !search || JSON.stringify(x).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Insurance</h1><p className="text-gray-500 mt-1">{companies.length} companies, {claims.length} claims</p></div>
        <Button onClick={() => setShowNewModal(true)}><Plus className="w-4 h-4" /> New Claim</Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'companies' ? 'primary' : 'secondary'} onClick={() => setTab('companies')}>Companies ({companies.length})</Button>
        <Button variant={tab === 'claims' ? 'primary' : 'secondary'} onClick={() => setTab('claims')}>Claims ({claims.length})</Button>
      </div>

      <Card className="mb-6"><CardBody>
        <Input placeholder={`Search ${tab}...`} value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>

      {tab === 'companies' ? (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Code</th><th>Contract Type</th><th>Discount Rate</th></tr></thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="font-medium">{c.name}</td>
                  <td className="text-xs font-mono">{c.code}</td>
                  <td><Badge>{c.contractType}</Badge></td>
                  <td>{c.discountRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Claim #</th><th>Patient</th><th>Insurance</th><th>Amount</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No claims</td></tr> :
                filtered.map((cl: any) => (
                  <tr key={cl.id} className="hover:bg-gray-50">
                    <td className="font-mono text-xs">{cl.claimNumber}</td>
                    <td className="font-medium">{cl.patientName}</td>
                    <td className="text-xs">{cl.insuranceName}</td>
                    <td>{cl.claimedAmount?.toFixed(2)} EGP</td>
                    <td><Badge>{cl.status}</Badge></td>
                    <td className="text-xs">{cl.submissionDate || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewModal && <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="New Insurance Claim" size="md">
        <div className="space-y-4">
          <Input placeholder="Patient ID" value={newClaim.patientId} onChange={e => setNewClaim({ ...newClaim, patientId: e.target.value })} />
          <Input placeholder="Insurance Company ID" value={newClaim.insuranceId} onChange={e => setNewClaim({ ...newClaim, insuranceId: e.target.value })} />
          <Input placeholder="Claimed Amount (EGP)" type="number" value={String(newClaim.claimedAmount)} onChange={e => setNewClaim({ ...newClaim, claimedAmount: Number(e.target.value) })} />
          <Button onClick={async () => {
            await api.post('/insurance/claims', newClaim);
            setShowNewModal(false);
            const r = await api.get('/insurance/claims'); setClaims(r.data.data);
          }}>Submit Claim</Button>
        </div>
      </Modal>}
    </div>
  );
}
