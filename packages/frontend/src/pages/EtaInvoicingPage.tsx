import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, Button, Input, Select, Modal, Spinner, EmptyState } from '../components/ui';
import { FileText, Send, CheckCircle, XCircle, Eye, QrCode, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface EtaInvoice {
  id: string; eta_uuid: string; eta_invoice_number: string; invoice_id: string;
  document_type: string; status: string; qr_code_data: string;
  submitted_at: string; approved_at: string; created_at: string;
  error_message: string; rejection_reason: string;
}

export default function EtaInvoicingPage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<EtaInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<EtaInvoice | null>(null);
  const [generating, setGenerating] = useState(false);
  const [invoiceIdInput, setInvoiceIdInput] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/eta/invoices', { params });
      setInvoices(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch { toast.error('Failed to load ETA invoices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const handleGenerate = async () => {
    if (!invoiceIdInput) return toast.error('Enter an invoice ID');
    setGenerating(true);
    try {
      await api.post('/eta/invoices/generate', { invoiceId: invoiceIdInput });
      toast.success('ETA invoice generated');
      setInvoiceIdInput(''); load();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const handleSubmit = async (id: string) => {
    try {
      await api.post(`/eta/invoices/${id}/submit`);
      toast.success('Submitted to ETA successfully'); load();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Submission failed'); }
  };

  const statusBadge = (s: string) => {
    const c: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800', submitted: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', cancelled: 'bg-orange-100 text-orange-800',
    };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c[s] || 'bg-gray-100'}`}>{s}</span>;
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><FileText className="w-6 h-6 text-blue-600" /></div>
          <div><h1 className="text-2xl font-bold">ETA E-Invoicing</h1><p className="text-sm text-gray-500">Egyptian Tax Authority compliant invoicing</p></div>
        </div>
      </div>

      {/* Generate New */}
      <Card><CardBody>
        <h3 className="font-semibold mb-3">Generate ETA Invoice</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice ID</label>
            <input className="w-full rounded-lg border border-gray-300 p-2" placeholder="Paste invoice UUID here"
              value={invoiceIdInput} onChange={e => setInvoiceIdInput(e.target.value)} />
          </div>
          <Button onClick={handleGenerate} disabled={generating || !invoiceIdInput} icon={<QrCode className="w-4 h-4" />}>
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </CardBody></Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {['draft', 'submitted', 'approved', 'rejected', 'cancelled'].map(s => {
          const count = invoices.filter(i => i.status === s).length;
          return <Card key={s}><CardBody className="text-center"><p className="text-xs text-gray-500 capitalize mb-1">{s}</p><p className="text-2xl font-bold">{count}</p></CardBody></Card>;
        })}
      </div>

      {/* Filter */}
      <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        options={[{ value: '', label: 'All Statuses' }, { value: 'draft', label: 'Draft' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />

      {/* Table */}
      {invoices.length === 0 ? <EmptyState icon={<FileText className="w-12 h-12" />} title="No ETA invoices" message="Generate an ETA invoice from an existing clinic invoice" /> : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ETA UUID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ETA #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono">{inv.eta_uuid || '—'}</td>
                  <td className="px-4 py-3 text-sm">{inv.eta_invoice_number || '—'}</td>
                  <td className="px-4 py-3 text-sm">{inv.document_type === 'I' ? 'Invoice' : inv.document_type === 'C' ? 'Credit Note' : 'Debit Note'}</td>
                  <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setSelected(inv)} className="p-1 rounded hover:bg-gray-100"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {inv.status === 'draft' && <button onClick={() => handleSubmit(inv.id)} className="p-1 rounded hover:bg-green-100"><Send className="w-4 h-4 text-green-600" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && <div className="flex justify-between items-center px-4 py-3 border-t">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button></div>
          </div>}
        </div>
      )}

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="ETA Invoice Details" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">ETA UUID</p><p className="font-mono text-sm">{selected.eta_uuid || 'Not yet submitted'}</p></div>
              <div><p className="text-sm text-gray-500">ETA Invoice #</p><p className="font-medium">{selected.eta_invoice_number || '—'}</p></div>
              <div><p className="text-sm text-gray-500">Status</p>{statusBadge(selected.status)}</div>
              <div><p className="text-sm text-gray-500">Type</p><p className="capitalize">{selected.document_type === 'I' ? 'Invoice' : selected.document_type === 'C' ? 'Credit Note' : 'Debit Note'}</p></div>
            </div>
            {selected.qr_code_data && <div><p className="text-sm text-gray-500 mb-2">QR Code Data (TLV)</p><div className="bg-gray-50 p-3 rounded-lg text-xs font-mono break-all">{selected.qr_code_data}</div></div>}
            {selected.error_message && <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600 shrink-0" /><p className="text-sm text-red-700">{selected.error_message}</p></div>}
            {selected.rejection_reason && <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg"><XCircle className="w-5 h-5 text-yellow-600 shrink-0" /><p className="text-sm text-yellow-700">{selected.rejection_reason}</p></div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
