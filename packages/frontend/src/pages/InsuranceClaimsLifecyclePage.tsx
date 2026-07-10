import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Select, Badge, Spinner, Modal, EmptyState } from '../components/ui';
import { ShieldCheck, FileText, Activity, CheckCircle, XCircle, Clock, AlertCircle, Filter, Search, Plus, Eye } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const EGP_INSURERS = [
  'Misr Insurance', 'Allianz Egypt', 'AXA Egypt', 'GIG Egypt', 'Arab Misr Insurance',
  'CIL (Cairo Insurance)', 'Royal Insurance', 'Egypt Life Takaful', 'Noor Takaful',
  'Egyptian Health Insurance', 'Cigna Egypt', 'MetLife Egypt',
];

const CLAIM_STATUSES = ['draft', 'submitted', 'pending_review', 'approved', 'partially_approved', 'denied', 'appealed', 'paid'];

export default function InsuranceClaimsLifecyclePage() {
  const [tab, setTab] = useState<'claims' | 'new-claim' | 'tracking' | 'analytics'>('claims');
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [insurerFilter, setInsurerFilter] = useState('');
  const [showDetail, setShowDetail] = useState<any>(null);

  // New claim form
  const [form, setForm] = useState({
    patient_id: '', patient_name: '', policy_number: '', insurer: '',
    claim_type: 'medical', total_amount: '', diagnosis: '', notes: '',
  });

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (insurerFilter) params.set('insurer', insurerFilter);
      const { data } = await api.get(`/insurance-claims?${params}`);
      setClaims(data.data?.rows || data.data || []);
    } catch { toast.error('Failed to load claims'); }
    setLoading(false);
  };

  useEffect(() => { fetchClaims(); }, [search, statusFilter, insurerFilter]);

  const submitClaim = async () => {
    try {
      await api.post('/insurance-claims', form);
      toast.success('Claim submitted successfully');
      setForm({ patient_id: '', patient_name: '', policy_number: '', insurer: '', claim_type: 'medical', total_amount: '', diagnosis: '', notes: '' });
      setTab('claims');
      fetchClaims();
    } catch { toast.error('Failed to submit claim'); }
  };

  const handleBulkSubmit = async () => {
    const pending = claims.filter(c => c.status === 'draft');
    if (pending.length === 0) { toast.error('No draft claims to submit'); return; }
    try {
      await api.post('/insurance-claims/bulk-submit', { ids: pending.map(c => c.id) });
      toast.success(`${pending.length} claims submitted`);
      fetchClaims();
    } catch { toast.error('Bulk submit failed'); }
  };

  const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'gray'> = {
    paid: 'success', approved: 'success', partially_approved: 'warning',
    draft: 'gray', submitted: 'info', pending_review: 'warning',
    denied: 'danger', appealed: 'warning',
  };

  const statusIcon: Record<string, any> = {
    draft: FileText, submitted: Clock, pending_review: AlertCircle,
    approved: CheckCircle, partially_approved: Activity,
    denied: XCircle, appealed: AlertCircle, paid: CheckCircle,
  };

  const summaryStats = {
    total: claims.length,
    pending: claims.filter(c => ['submitted', 'pending_review'].includes(c.status)).length,
    approved: claims.filter(c => ['approved', 'partially_approved'].includes(c.status)).length,
    denied: claims.filter(c => c.status === 'denied').length,
    paid: claims.filter(c => c.status === 'paid').length,
    totalAmount: claims.filter(c => c.status === 'paid').reduce((s, c) => s + (Number(c.total_amount) || 0), 0),
  };

  const tabs = [
    { key: 'claims', label: 'All Claims', icon: ShieldCheck },
    { key: 'new-claim', label: 'New Claim', icon: Plus },
    { key: 'tracking', label: 'Claim Tracking', icon: Activity },
    { key: 'analytics', label: 'Analytics', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance Claims Lifecycle</h1>
          <p className="text-sm text-gray-500 mt-1">End-to-end claims management for Egypt insurers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleBulkSubmit}>Bulk Submit Drafts</Button>
          <Button onClick={() => setTab('new-claim')}><Plus className="w-4 h-4" /> New Claim</Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap ${tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: summaryStats.total, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Pending', value: summaryStats.pending, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          { label: 'Approved', value: summaryStats.approved, color: 'text-green-600', bg: 'bg-green-100' },
          { label: 'Denied', value: summaryStats.denied, color: 'text-red-600', bg: 'bg-red-100' },
          { label: 'Paid', value: summaryStats.paid, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: 'Total Paid', value: `${summaryStats.totalAmount.toLocaleString()} EGP`, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        ].map((s, i) => (
          <Card key={i}><CardBody className="p-4 text-center">
            <p className={`${s.color} text-2xl font-bold`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </CardBody></Card>
        ))}
      </div>

      {/* All Claims Tab */}
      {tab === 'claims' && (
        <Card><CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1"><Input placeholder="Search claims..." value={search} onChange={(e: any) => setSearch(e.target.value)} /></div>
            <Select value={statusFilter} onChange={(e: any) => setStatusFilter(e.target.value)} className="w-44" options={[{value:"", label:"All Statuses"}, ...CLAIM_STATUSES.map(s => ({value:s, label:s.replace(/_/g," ").toUpperCase()}))]} />
            <Select value={insurerFilter} onChange={(e: any) => setInsurerFilter(e.target.value)} className="w-48" options={[{value:"", label:"All Insurers"}, ...EGP_INSURERS.map(ins => ({value:ins, label:ins}))]} />
          </div>
          {loading ? <Spinner /> : claims.length === 0 ? (
            <EmptyState title="No claims found" message="Submit your first insurance claim" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left">Patient</th><th className="px-4 py-3 text-left">Insurer</th>
                  <th className="px-4 py-3 text-left">Policy #</th><th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr></thead>
                <tbody>{claims.map((c: any) => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.patient_name}</td>
                    <td className="px-4 py-3">{c.insurer}</td>
                    <td className="px-4 py-3 text-gray-600">{c.policy_number}</td>
                    <td className="px-4 py-3">{Number(c.total_amount || c.claimed_amount || 0).toLocaleString()} EGP</td>
                    <td className="px-4 py-3"><Badge variant={statusBadge[c.status]}>{c.status?.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3 text-gray-500">{c.created_at?.split('T')[0]}</td>
                    <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => setShowDetail(c)}><Eye className="w-4 h-4" /></Button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </CardBody></Card>
      )}

      {/* New Claim */}
      {tab === 'new-claim' && (
        <Card><CardBody className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Submit New Insurance Claim</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Patient Name *" value={form.patient_name} onChange={(e: any) => setForm({ ...form, patient_name: e.target.value })} />
            <Input label="Patient ID" value={form.patient_id} onChange={(e: any) => setForm({ ...form, patient_id: e.target.value })} />
            <Input label="Policy Number *" value={form.policy_number} onChange={(e: any) => setForm({ ...form, policy_number: e.target.value })} />
            <Select label="Insurance Company *" value={form.insurer} onChange={(e: any) => setForm({ ...form, insurer: e.target.value })} options={[{value:"", label:"Select insurer..."}, ...EGP_INSURERS.map(ins => ({value:ins, label:ins}))]} />
            <Select label="Claim Type" value={form.claim_type} onChange={(e: any) => setForm({ ...form, claim_type: e.target.value })} options={[{value:"medical",label:"Medical"},{value:"surgical",label:"Surgical"},{value:"pharmacy",label:"Pharmacy"},{value:"lab",label:"Laboratory"},{value:"optical",label:"Optical"},{value:"dental",label:"Dental"}]} />
            <Input label="Claim Amount (EGP)" type="number" value={form.total_amount} onChange={(e: any) => setForm({ ...form, total_amount: e.target.value })} />
            <Input label="Diagnosis" value={form.diagnosis} onChange={(e: any) => setForm({ ...form, diagnosis: e.target.value })} className="sm:col-span-2" />
            <Input label="Notes" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} className="sm:col-span-3" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setTab('claims')}>Cancel</Button>
            <Button onClick={submitClaim}>Submit Claim</Button>
          </div>
        </CardBody></Card>
      )}

      {/* Claim Tracking */}
      {tab === 'tracking' && (
        <Card><CardBody className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Claim Status Timeline</h3>
          {claims.filter(c => ['submitted', 'pending_review', 'appealed'].includes(c.status)).length === 0 ? (
            <EmptyState title="No active claims" message="All claims have been processed" />
          ) : (
            <div className="space-y-4">
              {claims.filter(c => ['submitted', 'pending_review', 'appealed'].includes(c.status)).map((c: any) => (
                <div key={c.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">{c.patient_name} — {c.insurer}</p>
                    <Badge variant={statusBadge[c.status]}>{c.status?.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <Clock className="w-4 h-4" /> Submitted: {c.created_at?.split('T')[0]} | Amount: {Number(c.total_amount || 0).toLocaleString()} EGP
                  </div>
                  {/* Timeline */}
                  <div className="relative">
                    <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
                    <div className="space-y-3 pl-8">
                      <div className="relative"><div className="absolute -left-6 mt-1 w-3 h-3 rounded-full bg-blue-500" /><p className="text-sm font-medium">Draft Created</p><p className="text-xs text-gray-500">{c.created_at?.split('T')[0]}</p></div>
                      <div className="relative">{['submitted', 'pending_review', 'appealed'].includes(c.status) && <div className="absolute -left-6 mt-1 w-3 h-3 rounded-full bg-yellow-500" />}<p className="text-sm font-medium">{c.status === 'draft' ? 'Awaiting Submission' : c.status === 'submitted' ? 'Submitted to Insurer' : c.status === 'pending_review' ? 'Under Review' : 'Appealed'}</p><p className="text-xs text-gray-500">{c.status !== 'draft' ? 'In progress' : 'Action needed'}</p></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody></Card>
      )}

      {/* Analytics */}
      {tab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardBody className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Claims by Insurer</h3>
            {claims.length === 0 ? <EmptyState title="No data" /> : (
              <div className="space-y-2">
                {Object.entries(claims.reduce((acc: Record<string, number>, c: any) => {
                  acc[c.insurer] = (acc[c.insurer] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)).sort(([, a], [, b]) => b - a).slice(0, 8).map(([insurer, count]) => (
                  <div key={insurer} className="flex items-center gap-3">
                    <span className="text-sm flex-1">{insurer}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${(count / Math.max(...(Object.values(claims.reduce((acc: Record<string, number>, c: any) => { acc[c.insurer] = (acc[c.insurer] || 0) + 1; return acc; }, {} as Record<string, number>)) as number[]))) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody></Card>
          <Card><CardBody className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Approval Rate</h3>
            {claims.length === 0 ? <EmptyState title="No data" /> : (
              <div className="text-center py-8">
                <p className="text-5xl font-bold text-green-600">{summaryStats.total > 0 ? Math.round((Number(summaryStats.approved) / Math.max(claims.filter((c: any) => c.status !== 'draft').length, 1)) * 100) : 0}%</p>
                <p className="text-gray-500 mt-2">
                  {summaryStats.approved} approved / {claims.filter(c => c.status !== 'draft').length} processed
                </p>
                <div className="flex justify-center gap-4 mt-4">
                  <span className="text-sm text-green-600">▲ {summaryStats.approved} Approved</span>
                  <span className="text-sm text-red-600">▼ {summaryStats.denied} Denied</span>
                </div>
              </div>
            )}
          </CardBody></Card>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Claim Details">
        {showDetail && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="font-medium">Patient:</span> {showDetail.patient_name}</div>
              <div><span className="font-medium">Insurer:</span> {showDetail.insurer}</div>
              <div><span className="font-medium">Policy:</span> {showDetail.policy_number}</div>
              <div><span className="font-medium">Amount:</span> {Number(showDetail.total_amount || showDetail.claimed_amount || 0).toLocaleString()} EGP</div>
              <div><span className="font-medium">Status:</span> <Badge variant={statusBadge[showDetail.status]}>{showDetail.status?.replace(/_/g, ' ')}</Badge></div>
              <div><span className="font-medium">Type:</span> {showDetail.claim_type}</div>
              <div className="col-span-2"><span className="font-medium">Diagnosis:</span> {showDetail.diagnosis || '-'}</div>
              <div className="col-span-2"><span className="font-medium">Notes:</span> {showDetail.notes || '-'}</div>
              <div className="col-span-2"><span className="font-medium">Submitted:</span> {showDetail.created_at}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
