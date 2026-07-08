import { useState, useEffect } from 'react';
import { Badge, Button, Card, CardBody, Input, Spinner } from '../components/ui';
import { ScanLine, Plus } from 'lucide-react';
import api from '../lib/api';

export default function RadiologyPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/radiology/orders').then(r => setOrders(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;
  const filtered = orders.filter((o: any) => !search || o.patientName?.toLowerCase().includes(search.toLowerCase()) || o.orderNumber?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Radiology</h1><p className="text-gray-500 mt-1">{orders.length} orders</p></div>
        <Button><Plus className="w-4 h-4" /> New Order</Button>
      </div>
      <Card className="mb-6"><CardBody><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" /></CardBody></Card>
      <div className="table-container">
        <table>
          <thead><tr><th>Order #</th><th>Patient</th><th>Study</th><th>Body Part</th><th>Status</th><th>Priority</th><th>Date</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">No radiology orders</td></tr> :
              filtered.map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="font-mono text-xs">{o.orderNumber}</td>
                  <td className="font-medium">{o.patientName}</td>
                  <td>{o.studyType}</td>
                  <td>{o.bodyPart || '-'}</td>
                  <td><Badge>{o.status}</Badge></td>
                  <td><Badge variant={o.priority === 'urgent' ? 'danger' : 'info'}>{o.priority}</Badge></td>
                  <td className="text-xs">{o.orderDate}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
