import { useState, useEffect } from 'react';
import { Badge, Button, Card, CardBody, Input, Spinner } from '../components/ui';
import { ArrowLeftRight, Plus } from 'lucide-react';
import api from '../lib/api';

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  useEffect(() => { api.get('/referrals').then(r => setReferrals(r.data.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner size="lg" className="py-16" />;
  const filtered = referrals.filter((r: any) => !search || r.patientName?.toLowerCase().includes(search.toLowerCase()));
  return (<div>
    <div className="page-header"><div><h1 className="page-title">Referrals</h1><p className="text-gray-500 mt-1">{referrals.length} referrals</p></div><Button><Plus className="w-4 h-4" /> New Referral</Button></div>
    <Card className="mb-6"><CardBody><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" /></CardBody></Card>
    <div className="table-container"><table><thead><tr><th>Referral #</th><th>Patient</th><th>Type</th><th>Status</th><th>Priority</th><th>Date</th><th>Actions</th></tr></thead><tbody>
      {filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">No referrals</td></tr> :
        filtered.map((r: any) => (<tr key={r.id} className="hover:bg-gray-50">
          <td className="font-mono text-xs">{r.referralNumber}</td><td className="font-medium">{r.patientName}</td>
          <td>{r.referralType}</td><td><Badge>{r.status}</Badge></td>
          <td><Badge variant={r.priority === 'emergency' ? 'danger' : r.priority === 'urgent' ? 'warning' : 'info'}>{r.priority}</Badge></td>
          <td className="text-xs">{r.referralDate}</td><td><Button variant="ghost" size="sm">View</Button></td>
        </tr>))}
    </tbody></table></div></div>);
}