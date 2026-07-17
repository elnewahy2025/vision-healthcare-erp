import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { Package, Plus, Search, Warehouse } from 'lucide-react';
import api from '../lib/api';

export default function InventoryPage() {
  const [tab, setTab] = useState<'items' | 'warehouses' | 'pos'>('items');
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const load = () => Promise.all([
    api.get('/inventory/items').then(r => setItems(r.data.data)).catch(() => []),
    api.get('/inventory/warehouses').then(r => setWarehouses(r.data.data)).catch(() => []),
    api.get('/inventory/pos').then(r => setPos(r.data.data)).catch(() => []),
  ]).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  const filteredItems = items.filter((i: any) => !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Inventory</h1><p className="text-gray-500 mt-1">{items.length} items, {pos.length} POs</p></div>
        <Button onClick={() => setShowNewModal(true)}><Plus className="w-4 h-4" /> New Item</Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === 'items' ? 'primary' : 'secondary'} onClick={() => setTab('items')}><Package className="w-4 h-4" /> Items ({items.length})</Button>
        <Button variant={tab === 'warehouses' ? 'primary' : 'secondary'} onClick={() => setTab('warehouses')}><Warehouse className="w-4 h-4" /> Warehouses ({warehouses.length})</Button>
        <Button variant={tab === 'pos' ? 'primary' : 'secondary'} onClick={() => setTab('pos')}>Purchase Orders ({pos.length})</Button>
      </div>

      <Card className="mb-6"><CardBody>
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>

      {tab === 'items' && (
        <div className="table-container">
          <table>
            <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Qty</th><th>Reorder</th><th>Price</th><th>Status</th></tr></thead>
            <tbody>
              {filteredItems.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">No items</td></tr> :
                filteredItems.map((i: any) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="font-mono text-xs">{i.sku}</td>
                    <td className="font-medium">{i.name}</td>
                    <td><Badge>{i.category}</Badge></td>
                    <td><span className={`font-medium ${i.quantity <= i.reorderPoint ? 'text-red-600' : 'text-green-600'}`}>{i.quantity}</span></td>
                    <td className="text-xs">{i.reorderPoint}</td>
                    <td>{i.unitPrice?.toFixed(2)} EGP</td>
                    <td><Badge>{i.status}</Badge></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'warehouses' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Code</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              {warehouses.map((w: any) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="font-medium">{w.name}</td>
                  <td className="font-mono text-xs">{w.code}</td>
                  <td><Badge>{w.type}</Badge></td>
                  <td><Badge variant="success">{w.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pos' && (
        <div className="table-container">
          <table>
            <thead><tr><th>PO #</th><th>Supplier</th><th>Total</th><th>Status</th><th>Order Date</th><th>Items</th></tr></thead>
            <tbody>
              {pos.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No purchase orders</td></tr> :
                pos.map((po: any) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="font-mono text-xs">{po.poNumber}</td>
                    <td>{po.supplier}</td>
                    <td>{po.totalAmount?.toFixed(2)} EGP</td>
                    <td><Badge>{po.status}</Badge></td>
                    <td className="text-xs">{po.orderDate}</td>
                    <td>{po.items?.length || 0}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewModal && <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="New Inventory Item" size="md">
        <p className="text-gray-500">Use the API to create inventory items. {warehouses.length} warehouses available.</p>
      </Modal>}
    </div>
  );
}
