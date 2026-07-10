import { useState, useEffect } from 'react';
import { financialApi } from '../lib/api';
import { BarChart3, TrendingUp, DollarSign, Receipt, Loader2, ArrowUp, ArrowDown, Wallet, PieChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardBody } from '../components/ui';
import api from '../lib/api';

export default function FinancialReportsPage() {
  const { t } = useTranslation();
  const [revenue, setRevenue] = useState<any>(null);
  const [aging, setAging] = useState<any>(null);
  const [topPatients, setTopPatients] = useState<any[]>([]);
  const [plReport, setPlReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [tab, setTab] = useState<'overview' | 'pl'>('overview');

  const getDateRange = (p: string) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    switch (p) {
      case 'week': return { from: new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
      case 'month': return { from: new Date(y, m, 1).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
      case 'quarter': return { from: new Date(y, Math.floor(m / 3) * 3, 1).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
      case 'year': return { from: new Date(y, 0, 1).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
      default: return { from: new Date(y, m, 1).toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      financialApi.revenue({ period }),
      financialApi.aging().catch(() => null),
      financialApi.topPatients().catch(() => []),
      api.get('/financial/pl-report', { params: getDateRange(period) }).then(r => r.data.data).catch(() => null),
    ]).then(([r, a, p, pl]) => {
      setRevenue(r); setAging(a); setTopPatients(p || []); setPlReport(pl);
    }).finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;

  const calcRate = () => {
    if (!revenue?.total_revenue || !revenue?.total_collected) return 0;
    return ((Number(revenue.total_collected) / Number(revenue.total_revenue)) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Financial Reports</h1>
        <select className="input sm:w-40 border rounded-lg p-2" value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button onClick={() => setTab('overview')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Overview</button>
        <button onClick={() => setTab('pl')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'pl' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>P&L Statement</button>
      </div>

      {tab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardBody>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5 text-green-600" /></div>
                <div><p className="text-sm text-gray-500">Total Revenue</p><p className="text-xl font-bold text-green-600">{Number(revenue?.total_revenue || 0).toLocaleString()} EGP</p></div>
              </div>
            </CardBody></Card>
            <Card><CardBody>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
                <div><p className="text-sm text-gray-500">Collected</p><p className="text-xl font-bold text-blue-600">{Number(revenue?.total_collected || 0).toLocaleString()} EGP</p></div>
              </div>
            </CardBody></Card>
            <Card><CardBody>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center"><ArrowUp className="w-5 h-5 text-yellow-600" /></div>
                <div><p className="text-sm text-gray-500">Outstanding</p><p className="text-xl font-bold text-yellow-600">{Number(revenue?.total_outstanding || 0).toLocaleString()} EGP</p></div>
              </div>
            </CardBody></Card>
            <Card><CardBody>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><Wallet className="w-5 h-5 text-purple-600" /></div>
                <div><p className="text-sm text-gray-500">Collection Rate</p><p className="text-xl font-bold text-purple-600">{calcRate()}%</p></div>
              </div>
            </CardBody></Card>
          </div>

          {/* Revenue Chart */}
          {revenue?.monthly && (
            <Card><CardBody>
              <h3 className="font-semibold mb-3">Monthly Revenue</h3>
              <div className="space-y-2">
                {revenue.monthly.map((m: any) => (
                  <div key={m.month} className="flex items-center gap-4">
                    <span className="text-sm font-medium w-20">{m.month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div className="bg-blue-500 h-4 rounded-full" style={{ width: `${Math.min(100, (Number(m.revenue || 0) / Number(revenue?.total_revenue || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold w-28 text-right">{Number(m.revenue || 0).toLocaleString()} EGP</span>
                  </div>
                ))}
              </div>
            </CardBody></Card>
          )}

          {/* Insurance Claims Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Aging Report */}
            <Card><CardBody>
              <h3 className="font-semibold mb-3">Aging Report</h3>
              {aging ? (
                <div className="space-y-2">
                  {['0-30', '31-60', '61-90', '90+'].map(range => (
                    <div key={range} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{range} days</span>
                      <span className="font-semibold">{Number(aging?.[range] || 0).toLocaleString()} EGP</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded mt-2">
                    <span className="text-sm font-semibold text-blue-700">Total Aging</span>
                    <span className="font-bold text-blue-700">{Object.values(aging || {}).reduce((a: number, b: any) => a + Number(b || 0), 0).toLocaleString()} EGP</span>
                  </div>
                </div>
              ) : <p className="text-sm text-gray-500">No aging data</p>}
            </CardBody></Card>

            {/* Payment Status */}
            <Card><CardBody>
              <h3 className="font-semibold mb-3">Payment Status</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 bg-green-50 rounded-lg"><p className="text-2xl font-bold text-green-600">{revenue?.paid_count || 0}</p><p className="text-xs text-green-500">Paid</p></div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg"><p className="text-2xl font-bold text-yellow-600">{revenue?.pending_count || 0}</p><p className="text-xs text-yellow-500">Pending</p></div>
                <div className="text-center p-4 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-600">{revenue?.overdue_count || 0}</p><p className="text-xs text-red-500">Overdue</p></div>
              </div>
            </CardBody></Card>
          </div>

          {/* Top Patients */}
          <Card><CardBody>
            <h3 className="font-semibold mb-3">Top Patients by Revenue</h3>
            {topPatients.length > 0 ? (
              <div className="space-y-2">
                {topPatients.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                    <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium">{p.name || 'Unknown'}</span>
                    <span className="text-sm font-semibold">{Number(p.total || 0).toLocaleString()} EGP</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">No data yet</p>}
          </CardBody></Card>
        </>
      )}

      {/* P&L Statement Tab */}
      {tab === 'pl' && plReport && (
        <div className="space-y-6">
          {/* Period */}
          <p className="text-sm text-gray-500">Period: {plReport.period.from} to {plReport.period.to}</p>

          {/* Revenue Section */}
          <Card><CardBody>
            <h3 className="font-semibold text-lg text-green-700 mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Revenue</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="font-medium">Total Revenue (Invoiced)</span>
                <span className="font-bold text-green-700">{plReport.revenue.total.toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between items-center p-2">
                <span className="text-sm text-gray-600 ml-4">Collected</span>
                <span className="font-medium">{plReport.revenue.collected.toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between items-center p-2">
                <span className="text-sm text-gray-600 ml-4">Outstanding</span>
                <span className="font-medium text-yellow-600">{plReport.revenue.outstanding.toLocaleString()} EGP</span>
              </div>
            </div>
          </CardBody></Card>

          {/* Expense Section */}
          <Card><CardBody>
            <h3 className="font-semibold text-lg text-orange-700 mb-3 flex items-center gap-2"><Wallet className="w-5 h-5" /> Expenses</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="font-medium">Total Expenses</span>
                <span className="font-bold text-orange-700">{plReport.expenses.total.toLocaleString()} EGP</span>
              </div>
              {plReport.expenses.byCategory?.map((cat: any) => (
                <div key={cat.category} className="flex justify-between items-center p-2">
                  <span className="text-sm text-gray-600 ml-4">{cat.category}</span>
                  <span className="font-medium">{Number(cat.total).toLocaleString()} EGP</span>
                </div>
              ))}
            </div>
          </CardBody></Card>

          {/* Bottom Line */}
          <Card><CardBody>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <span className="text-lg font-bold">Gross Profit</span>
                <span className={`text-lg font-bold ${plReport.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {plReport.grossProfit.toLocaleString()} EGP
                </span>
              </div>
              <div className="flex justify-between items-center p-3">
                <span className="font-medium text-gray-700">Profit Margin</span>
                <span className={`font-bold ${plReport.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {plReport.profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardBody></Card>

          {/* Monthly Trends */}
          {plReport.revenueByMonth?.length > 0 && (
            <Card><CardBody>
              <h3 className="font-semibold mb-3">Monthly P&L Trend</h3>
              <div className="space-y-2">
                {plReport.revenueByMonth.map((m: any) => {
                  const expMonth = plReport.expenseByMonth?.find((e: any) => e.month === m.month);
                  const rev = Number(m.revenue || 0);
                  const exp = Number(expMonth?.total || 0);
                  const profit = rev - exp;
                  return (
                    <div key={m.month} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium w-20">{m.month}</span>
                      <div className="flex-1 flex gap-4 text-xs">
                        <span className="text-green-600">Rev: {rev.toLocaleString()}</span>
                        <span className="text-orange-600">Exp: {exp.toLocaleString()}</span>
                      </div>
                      <span className={`text-sm font-semibold w-28 text-right ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profit >= 0 ? '+' : ''}{profit.toLocaleString()} EGP
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardBody></Card>
          )}
        </div>
      )}
    </div>
  );
}
