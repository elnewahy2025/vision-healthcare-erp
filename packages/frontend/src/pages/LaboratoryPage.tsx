import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner, Badge, Card, CardHeader, CardBody, Button, Input, Modal } from '../components/ui';
import { FlaskConical, Plus, Search } from 'lucide-react';
import api from '../lib/api';

export default function LaboratoryPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [catalog, setCatalog] = useState<any[]>([]);

  useEffect(() => {
    api.get('/lab/orders').then(r => setOrders(r.data.data)).catch(() => {}).finally(() => setLoading(false));
    api.get('/lab/catalog').then(r => setCatalog(r.data.data)).catch(() => {});
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  const filtered = orders.filter((o: any) =>
    !search || o.patientName?.toLowerCase().includes(search.toLowerCase()) || o.orderNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('nav.laboratory')}</h1><p className="text-gray-500 mt-1">{orders.length} orders</p></div>
        <Button onClick={() => setShowNewModal(true)}><Plus className="w-4 h-4" /> New Order</Button>
      </div>
      <Card className="mb-6"><CardBody>
        <Input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>
      <div className="table-container">
        <table>
          <thead><tr>
            <th>Order #</th><th>Patient</th><th>Status</th><th>Priority</th><th>Date</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-500">No lab orders</td></tr>
            ) : filtered.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="font-mono text-xs">{o.orderNumber}</td>
                <td className="font-medium">{o.patientName}</td>
                <td><Badge>{o.status}</Badge></td>
                <td><Badge variant={o.priority === 'urgent' ? 'danger' : o.priority === 'stat' ? 'warning' : 'info'}>{o.priority}</Badge></td>
                <td className="text-xs">{o.orderDate}</td>
                <td><Button variant="ghost" size="sm">View</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showNewModal && <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="New Lab Order" size="lg">
        <p className="text-gray-500">Use the API to create lab orders. Catalog has {catalog.length} tests.</p>
      </Modal>}
    </div>
  );
}
