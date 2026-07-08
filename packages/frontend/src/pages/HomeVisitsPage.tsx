import { useState, useEffect } from 'react';
import { Badge, Button, Card, CardBody, Spinner } from '../components/ui';
import { Home, Plus } from 'lucide-react';
import api from '../lib/api';

export default function HomeVisitsPage() {
  const [visits, setVisits] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/home-visits').then(r => setVisits(r.data.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner size="lg" className="py-16" />;
  return (<div>
    <div className="page-header"><div><h1 className="page-title">Home Visits</h1><p className="text-gray-500 mt-1">{visits.length} visits</p></div><Button><Plus className="w-4 h-4" /> Schedule Visit</Button></div>
    <div className="table-container"><table><thead><tr><th>Visit #</th><th>Patient</th><th>Type</th><th>Date</th><th>Assigned To</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {visits.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">No home visits</td></tr> :
        visits.map((v: any) => (<tr key={v.id} className="hover:bg-gray-50">
          <td className="font-mono text-xs">{v.visitNumber}</td><td className="font-medium">{v.patientName}</td>
          <td>{v.visitType}</td><td className="text-xs">{v.scheduledDate}</td>
          <td>{v.assignedToName || '-'}</td><td><Badge>{v.status}</Badge></td>
          <td><Button variant="ghost" size="sm">View</Button></td>
        </tr>))}
    </tbody></table></div></div>);
}