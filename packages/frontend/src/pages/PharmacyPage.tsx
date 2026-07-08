import { useState, useEffect } from 'react';
import { Badge, Button, Card, CardBody, Input, Spinner } from '../components/ui';
import { PillBottle, Plus, Package, ListChecks } from 'lucide-react';
import api from '../lib/api';

export default function PharmacyPage() {
  const [tab, setTab] = useState<'inventory' | 'prescriptions'>('inventory');
  const [inventory, setInventory] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/pharmacy/inventory').then(r => setInventory(r.data.data)).catch(() => []),
      api.get('/pharmacy/prescriptions').then(r => setPrescriptions(r.data.data)).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Pharmacy</h1></div>
        <Button>{tab === 'inventory' ? <><Package className="w-4 h-4" /> Add Drug</> : <><Plus className="w-4 h-4" /> New Prescription</>}</Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'inventory' ? 'primary' : 'secondary'} onClick={() => setTab('inventory')}>
          <Package className="w-4 h-4" /> Inventory ({inventory.length})
        </Button>
        <Button variant={tab === 'prescriptions' ? 'primary' : 'secondary'} onClick={() => setTab('prescriptions')}>
          <ListChecks className="w-4 h-4" /> Prescriptions ({prescriptions.length})
        </Button>
      </div>

      {tab === 'inventory' && (
        <>
          <Card className="mb-6"><CardBody><Input placeholder="Search drugs..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" /></CardBody></Card>
          <div className="table-container">
            <table>
              <thead><tr><th>Drug Name</th><th>Generic</th><th>Stock</th><th>Reorder</th><th>Price</th><th>Expiry</th><th>Status</th></tr></thead>
              <tbody>
                {inventory.filter((d: any) => !search || d.drugName?.toLowerCase().includes(search.toLowerCase())).map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="font-medium">{d.drugName}</td>
                    <td className="text-xs text-gray-500">{d.genericName || '-'}</td>
                    <td><span className={`font-medium ${d.stockQuantity < d.reorderLevel ? 'text-red-600' : 'text-green-600'}`}>{d.stockQuantity}</span></td>
                    <td className="text-xs">{d.reorderLevel}</td>
                    <td>{d.unitPrice ? d.unitPrice.toFixed(2) + ' SAR' : '-'}</td>
                    <td className="text-xs">{d.expiryDate || '-'}</td>
                    <td><Badge>{d.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'prescriptions' && (
        <div className="table-container">
          <table>
            <thead><tr><th>RX #</th><th>Patient</th><th>Items</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {prescriptions.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No prescriptions</td></tr> :
                prescriptions.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="font-mono text-xs">{p.prescriptionNumber}</td>
                    <td className="font-medium">{p.patientName}</td>
                    <td>{p.items?.length || 0} items</td>
                    <td><Badge>{p.status}</Badge></td>
                    <td className="text-xs">{p.createdAt?.split('T')[0]}</td>
                    <td><Button variant="ghost" size="sm">Dispense</Button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
