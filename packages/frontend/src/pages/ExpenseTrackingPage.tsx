import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, Button, Input, Select, Modal, Spinner, EmptyState, Badge } from '../components/ui';
import { Receipt, Plus, Search, BarChart3, Wallet, TrendingDown, Filter } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Expense {
  id: string; title: string; amount: number; category_name: string; category_code: string;
  expense_date: string; status: string; payment_method: string; vendor_name: string;
  expense_number: string; description: string; created_at: string;
}
interface ExpenseStats { totalExpenses: number; pendingCount: number; byCategory: Array<{ total: number }>; byMonth: Array<{ month: string; total: number }>; }
interface Category { id: string; name: string; code: string; type: string; }

export default function ExpenseTrackingPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'list' | 'add' | 'stats'>('list');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const [form, setForm] = useState({ title: '', amount: '' as any, categoryId: '', expenseDate: '', description: '', paymentMethod: 'cash', vendorName: '' });

  const load = async () => {
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (catFilter) params.categoryId = catFilter;
      const [expRes, catRes] = await Promise.all([api.get('/expenses', { params }), api.get('/expense-categories')]);
      setExpenses(expRes.data.data);
      setTotalPages(expRes.data.pagination.totalPages);
      setCategories(catRes.data.data);
    } catch { toast.error('Failed to load'); }
  };

  const loadStats = async () => {
    try { const res = await api.get('/expenses/stats'); setStats(res.data.data); } catch {}
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([load(), loadStats()]).finally(() => setLoading(false));
  }, [page, statusFilter, catFilter]);

  const handleSubmit = async () => {
    if (!form.title || !form.amount) return toast.error('Title and amount required');
    setSaving(true);
    try {
      await api.post('/expenses', { ...form, amount: Number(form.amount) });
      toast.success('Expense created');
      setForm({ title: '', amount: '', categoryId: '', expenseDate: '', description: '', paymentMethod: 'cash', vendorName: '' });
      setTab('list'); load();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const statusBadge = (s: string) => {
    const c: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800', paid: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c[s] || 'bg-gray-100'}`}>{s}</span>;
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg"><Wallet className="w-6 h-6 text-orange-600" /></div>
          <div><h1 className="text-2xl font-bold">Expense Tracking</h1><p className="text-sm text-gray-500">Manage clinic expenses and operational costs</p></div>
        </div>
        <Button onClick={() => setTab('add')} icon={<Plus className="w-4 h-4" />}>New Expense</Button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {(['list', 'add', 'stats'] as const).map(k => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${tab === k ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{k === 'add' ? 'New Expense' : k}</button>
        ))}
      </div>

      {tab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardBody><p className="text-sm text-gray-500">Total Expenses</p><p className="text-3xl font-bold text-orange-600">{stats.totalExpenses.toLocaleString()} EGP</p></CardBody></Card>
            <Card><CardBody><p className="text-sm text-gray-500">Pending</p><p className="text-3xl font-bold text-yellow-600">{stats.pendingCount}</p></CardBody></Card>
            <Card><CardBody><p className="text-sm text-gray-500">Categories</p><p className="text-3xl font-bold text-blue-600">{stats.byCategory?.length || 0}</p></CardBody></Card>
          </div>
          <Card><CardBody>
            <h3 className="font-semibold mb-3">Monthly Expenses</h3>
            <div className="space-y-2">
              {stats.byMonth?.map((m: any) => (
                <div key={m.month} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{m.month}</span>
                  <span className="font-semibold">{Number(m.total).toLocaleString()} EGP</span>
                </div>
              ))}
            </div>
          </CardBody></Card>
        </div>
      )}

      {tab === 'add' && (
        <Card><CardBody>
          <h3 className="font-semibold mb-4">Record New Expense</h3>
          <div className="space-y-4 max-w-lg">
            <Input label="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <Input label="Amount (EGP)" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            <Select label="Category" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
              options={[{ value: '', label: 'Select category' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />
            <Input label="Date" type="date" value={form.expenseDate} onChange={e => setForm(p => ({ ...p, expenseDate: e.target.value }))} />
            <Input label="Vendor Name" value={form.vendorName} onChange={e => setForm(p => ({ ...p, vendorName: e.target.value }))} />
            <Select label="Payment Method" value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}
              options={[{ value: 'cash', label: 'Cash' }, { value: 'bank', label: 'Bank Transfer' }, { value: 'credit', label: 'Credit Card' }]} />
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="w-full border rounded-lg p-3 h-24" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <Button onClick={handleSubmit} disabled={saving} icon={<Plus className="w-4 h-4" />}>{saving ? 'Saving...' : 'Record Expense'}</Button>
          </div>
        </CardBody></Card>
      )}

      {tab === 'list' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              options={[{ value: '', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'paid', label: 'Paid' }]} />
            <Select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
              options={[{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />
          </div>

          {expenses.length === 0 ? <EmptyState icon={<Receipt className="w-12 h-12" />} title="No expenses" message="No expenses recorded yet" /> : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-400">{e.expense_number}</td>
                      <td className="px-4 py-3 text-sm font-medium">{e.title}</td>
                      <td className="px-4 py-3 text-sm">{e.category_name || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{Number(e.amount).toLocaleString()} EGP</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{e.expense_date}</td>
                      <td className="px-4 py-3">{statusBadge(e.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{e.vendor_name || '-'}</td>
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
        </div>
      )}
    </div>
  );
}
