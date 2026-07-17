import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { billingApi, patientsApi } from '../lib/api';
import { Plus, Receipt, Loader2, Search, User, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BillingPage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>(null);

  const [newInvoice, setNewInvoice] = useState({
    patientId: '', items: [{ description: '', code: '', quantity: 1, unitPrice: 0, type: 'consultation' as const }],
    discount: 0, tax: 0, dueDate: '', notes: '',
  });

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await billingApi.list({ page, limit: 10, status: statusFilter || undefined });
      setInvoices(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  const loadRevenue = async () => {
    try {
      const data = await billingApi.revenue();
      setRevenue(data);
    } catch {}
  };

  useEffect(() => { loadInvoices(); }, [page, statusFilter]);
  useEffect(() => { loadRevenue(); }, []);

  const searchPatients = async (q: string) => {
    if (q.length < 2) return setSearchResults([]);
    try { setSearchResults(await patientsApi.search(q)); }
    catch { setSearchResults([]); }
  };

  const selectPatient = (patient: any) => {
    setNewInvoice({ ...newInvoice, patientId: patient.id });
    (document.getElementById('patient-search') as HTMLInputElement)!.value = `${patient.name} (${patient.mrn})`;
    setSearchResults([]);
  };

  const addItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: '', code: '', quantity: 1, unitPrice: 0, type: 'consultation' as const }],
    });
  };

  const removeItem = (idx: number) => {
    setNewInvoice({ ...newInvoice, items: newInvoice.items.filter((_, i) => i !== idx) });
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const items = [...newInvoice.items];
    (items[idx] as any)[field] = value;
    setNewInvoice({ ...newInvoice, items });
  };

  const calcTotal = () => {
    const subtotal = newInvoice.items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
    return subtotal - newInvoice.discount + newInvoice.tax;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.patientId) { toast.error('Select a patient'); return; }
    setSaving(true);
    try {
      await billingApi.create({
        patientId: newInvoice.patientId,
        items: newInvoice.items,
        discount: newInvoice.discount,
        tax: newInvoice.tax,
        dueDate: newInvoice.dueDate,
        notes: newInvoice.notes,
      });
      toast.success('Invoice created');
      setShowNewModal(false);
      loadInvoices();
      loadRevenue();
    } catch { toast.error('Failed to create invoice'); }
    finally { setSaving(false); }
  };

  const handlePay = async () => {
    if (!selectedInvoice) return;
    setSaving(true);
    try {
      await billingApi.pay(selectedInvoice.id, {
        amount: selectedInvoice.due,
        method: 'cash',
      });
      toast.success('Payment recorded');
      setShowPayModal(false);
      setSelectedInvoice(null);
      loadInvoices();
      loadRevenue();
    } catch { toast.error('Payment failed'); }
    finally { setSaving(false); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      paid: 'badge-success', pending: 'badge-warning',
      partial: 'badge-info', overdue: 'badge-danger',
      draft: 'badge-gray', cancelled: 'badge-gray',
    };
    return map[s] || 'badge-gray';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('billing.title')}</h1>
          <p className="text-gray-500 mt-1">{pagination.total} invoices</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('billing.new')}
        </button>
      </div>

      {/* Revenue Summary */}
      {revenue && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <p className="stat-label">Total Revenue</p>
            <p className="stat-value text-primary-600">{Number(revenue.total_revenue).toLocaleString()} EGP</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Collected</p>
            <p className="stat-value text-green-600">{Number(revenue.total_collected).toLocaleString()} EGP</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Pending</p>
            <p className="stat-value text-yellow-600">{Number(revenue.total_pending).toLocaleString()} EGP</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Invoice Count</p>
            <p className="stat-value">{revenue.invoice_count}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <select className="input w-48" value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('billing.invoice')}</th>
              <th>{t('appointment.patient')}</th>
              <th>{t('billing.total')}</th>
              <th>{t('billing.paid')}</th>
              <th>{t('billing.due')}</th>
              <th>{t('common.status')}</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500">{t('common.noData')}</td></tr>
            ) : (
              invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="font-mono text-xs font-medium">{inv.invoiceNumber}</td>
                  <td className="font-medium">{inv.patientName}</td>
                  <td className="font-medium">{Number(inv.total).toLocaleString()} EGP</td>
                  <td className="text-green-600">{Number(inv.paid).toLocaleString()} EGP</td>
                  <td className={inv.due > 0 ? 'text-red-600 font-medium' : ''}>{Number(inv.due).toLocaleString()} EGP</td>
                  <td><span className={statusBadge(inv.status)}>{inv.status}</span></td>
                  <td className="text-xs">{inv.issuedAt?.split('T')[0]}</td>
                  <td>
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button onClick={() => { setSelectedInvoice(inv); setShowPayModal(true); }}
                        className="btn-ghost btn-sm text-green-600">Pay</button>
                    )}
                    <button className="btn-ghost btn-sm">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Invoice Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="card-header"><h2 className="text-lg font-semibold">{t('billing.new')}</h2></div>
            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="relative">
                  <label className="label">Patient</label>
                  <input id="patient-search" className="input" placeholder="Search patient..."
                    onChange={e => searchPatients(e.target.value)} />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                      {searchResults.map((p: any) => (
                        <button key={p.id} type="button" onClick={() => selectPatient(p)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">{p.name} - {p.mrn}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">Invoice Items</label>
                    <button type="button" onClick={addItem} className="btn-ghost btn-sm text-primary-600">+ Add Item</button>
                  </div>
                  {newInvoice.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-start">
                      <div className="flex-1">
                        <input className="input text-sm" placeholder="Description" value={item.description}
                          onChange={e => updateItem(idx, 'description', e.target.value)} required />
                      </div>
                      <div className="w-20">
                        <input type="number" className="input text-sm" placeholder="Qty" value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} min="1" required />
                      </div>
                      <div className="w-24">
                        <input type="number" step="0.01" className="input text-sm" placeholder="Price" value={item.unitPrice}
                          onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))} min="0" required />
                      </div>
                      <div className="w-20 text-sm font-medium pt-2 text-right">
                        {(item.quantity * item.unitPrice).toFixed(2)}
                      </div>
                      {newInvoice.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="btn-ghost btn-sm text-red-500 mt-1">X</button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="label">{t('billing.discount')}</label>
                    <input type="number" step="0.01" className="input" value={newInvoice.discount}
                      onChange={e => setNewInvoice({...newInvoice, discount: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="label">{t('billing.tax')}</label>
                    <input type="number" step="0.01" className="input" value={newInvoice.tax}
                      onChange={e => setNewInvoice({...newInvoice, tax: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="label">{t('billing.dueDate')}</label>
                    <input type="date" className="input" value={newInvoice.dueDate}
                      onChange={e => setNewInvoice({...newInvoice, dueDate: e.target.value})} required />
                  </div>
                </div>

                <div className="text-right text-lg font-bold text-gray-900">
                  Total: {calcTotal().toFixed(2)} EGP
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea className="input" rows={2} value={newInvoice.notes}
                    onChange={e => setNewInvoice({...newInvoice, notes: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t">
                <button type="button" onClick={() => setShowNewModal(false)} className="btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="card-header"><h2 className="text-lg font-semibold">Record Payment</h2></div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Invoice: {selectedInvoice.invoiceNumber}</p>
                <p className="text-sm text-gray-500">Patient: {selectedInvoice.patientName}</p>
                <p className="text-lg font-bold mt-2">Amount Due: {Number(selectedInvoice.due).toLocaleString()} EGP</p>
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select className="input" defaultValue="cash">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="online">Online</option>
                  <option value="insurance">Insurance</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button type="button" onClick={() => setShowPayModal(false)} className="btn-secondary">{t('common.cancel')}</button>
              <button onClick={handlePay} disabled={saving} className="btn-primary">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Pay {Number(selectedInvoice.due).toLocaleString()} EGP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
