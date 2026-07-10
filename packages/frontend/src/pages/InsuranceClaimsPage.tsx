import { useState, useEffect } from 'react';
import { claimsApi } from '../lib/api';
import { ShieldCheck, Plus, Loader2, ChevronLeft, ChevronRight, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InsuranceClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [summary, setSummary] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { loadClaims(); loadSummary(); }, [page, statusFilter]);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const data = await claimsApi.list({ page, limit: 15, status: statusFilter || undefined });
      setClaims(data.data); setPagination(data.pagination);
    } catch { toast.error('Failed to load claims'); }
    finally { setLoading(false); }
  };

  const loadSummary = async () => {
    try { setSummary(await claimsApi.summary()); } catch {}
  };

  const handleSubmit = async (id: string) => {
    try { await claimsApi.submit(id); toast.success('Claim submitted!'); loadClaims(); loadSummary(); }
    catch { toast.error('Failed to submit'); }
  };

  const handleStatus = async (id: string) => {
    const status = prompt('New status (acknowledged/in_review/approved/denied):');
    if (!status) return;
    try { await claimsApi.updateStatus(id, { status }); toast.success(`Status: ${status}`); loadClaims(); loadSummary(); }
    catch { toast.error('Failed to update'); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { draft: 'badge-gray', submitted: 'badge-info', acknowledged: 'badge-info', in_review: 'badge-warning', approved: 'badge-success', denied: 'badge-danger', paid: 'badge-success' };
    return map[s] || 'badge-gray';
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> Insurance Claims</h1></div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div className="card p-3 text-center"><p className="text-lg font-bold">{summary.total}</p><p className="text-xs text-gray-500">Total</p></div>
          <div className="card p-3 text-center"><p className="text-lg font-bold text-yellow-600">{summary.draft}</p><p className="text-xs text-gray-500">Draft</p></div>
          <div className="card p-3 text-center"><p className="text-lg font-bold text-blue-600">{summary.submitted}</p><p className="text-xs text-gray-500">Submitted</p></div>
          <div className="card p-3 text-center"><p className="text-lg font-bold text-green-600">{summary.approved}</p><p className="text-xs text-gray-500">Approved</p></div>
          <div className="card p-3 text-center"><p className="text-lg font-bold text-red-600">{summary.denied}</p><p className="text-xs text-gray-500">Denied</p></div>
          <div className="card p-3 col-span-2 sm:col-span-3 lg:col-span-5"><p className="text-sm">Claimed: <strong>{Number(summary.total_claimed || 0).toLocaleString()} SAR</strong> | Approved: <strong>{Number(summary.total_approved || 0).toLocaleString()} SAR</strong> | Paid: <strong className="text-green-600">{Number(summary.total_paid || 0).toLocaleString()} SAR</strong></p></div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4"><select className="input sm:w-48" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
        <option value="">All Status</option>
        <option value="draft">Draft</option><option value="submitted">Submitted</option>
        <option value="acknowledged">Acknowledged</option><option value="in_review">In Review</option>
        <option value="approved">Approved</option><option value="denied">Denied</option><option value="paid">Paid</option>
      </select></div>

      {/* Claims Table */}
      <div className="table-container">
        <table>
          <thead><tr><th>Claim #</th><th>Patient</th><th>Company</th><th>Invoice</th><th>Claimed</th><th>Approved</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" /></td></tr>
            : claims.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-500">No claims</td></tr>
            : claims.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="font-mono text-xs font-medium">{c.claimNumber}</td>
                <td className="text-sm">{c.patientName || '-'}<br/>{c.patientMrn && <span className="text-xs text-gray-400">{c.patientMrn}</span>}</td>
                <td className="text-sm">{c.companyName || '-'}</td>
                <td className="font-mono text-xs">{c.invoiceNumber || '-'}</td>
                <td className="font-semibold">{Number(c.claimedAmount || 0).toLocaleString()}</td>
                <td>{Number(c.approvedAmount || 0).toLocaleString()}</td>
                <td><span className={`badge ${statusBadge(c.status)}`}>{c.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    {c.status === 'draft' && <button onClick={() => handleSubmit(c.id)} className="btn-ghost btn-sm"><Send className="w-3 h-3" /> Submit</button>}
                    <button onClick={() => handleStatus(c.id)} className="btn-ghost btn-sm"><AlertCircle className="w-3 h-3" /> Status</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Page {page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="btn-secondary btn-sm"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
