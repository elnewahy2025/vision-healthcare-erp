import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button } from '../components/ui';
import { Database, RefreshCw, Calendar, TrendingUp, DollarSign, Users, Activity, BarChart3 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function DataWarehousePage() {
  const [tab, setTab] = useState<'overview' | 'appointments' | 'revenue' | 'patients'>('overview');
  const [apptStats, setApptStats] = useState<any>(null);
  const [revStats, setRevStats] = useState<any>(null);
  const [patStats, setPatStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);

  const loadStats = async () => {
    try {
      const [appt, rev, pat] = await Promise.all([
        api.get(`/dw/appointments?days=${days}`),
        api.get(`/dw/revenue?days=${days}`),
        api.get(`/dw/patients?days=${days}`),
      ]);
      setApptStats(appt.data.data);
      setRevStats(rev.data.data);
      setPatStats(pat.data.data);
    } catch {
      // silent
    }
  };

  useEffect(() => { setLoading(true); loadStats().finally(() => setLoading(false)); }, [days]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/dw/refresh');
      toast.success('Data warehouse refreshed');
      await loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Refresh failed');
    } finally { setRefreshing(false); }
  };

  if (loading) return <Spinner size="lg" className="py-16" />;

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Warehouse</h1>
          <p className="text-gray-500 mt-1">Analytics & aggregated metrics</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Now'}
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        <Button variant={days === 7 ? 'primary' : 'secondary'} size="sm" onClick={() => setDays(7)}>7 Days</Button>
        <Button variant={days === 30 ? 'primary' : 'secondary'} size="sm" onClick={() => setDays(30)}>30 Days</Button>
        <Button variant={days === 90 ? 'primary' : 'secondary'} size="sm" onClick={() => setDays(90)}>90 Days</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Appointments</h3>
              <Calendar className="w-5 h-5 text-primary-500" />
            </div>
            <p className="text-3xl font-bold">{apptStats?.totals?.total || 0}</p>
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Badge variant="success">{apptStats?.totals?.completed || 0}</Badge> Completed</span>
              <span className="flex items-center gap-1"><Badge variant="danger">{apptStats?.totals?.cancelled || 0}</Badge> Cancelled</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(revStats?.totals?.total || 0)}</p>
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Badge variant="success">{formatCurrency(revStats?.totals?.collected || 0)}</Badge> Collected</span>
              <span className="flex items-center gap-1"><Badge variant="warning">{formatCurrency(revStats?.totals?.pending || 0)}</Badge> Pending</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Patients</h3>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{patStats?.totals?.active || 0}</p>
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Badge variant="info">{patStats?.totals?.new || 0}</Badge> New</span>
              <span className="flex items-center gap-1"><Badge variant="gray">{patStats?.totals?.active || 0}</Badge> Active</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === 'overview' ? 'primary' : 'secondary'} onClick={() => setTab('overview')}><BarChart3 className="w-4 h-4" /> Overview</Button>
        <Button variant={tab === 'appointments' ? 'primary' : 'secondary'} onClick={() => setTab('appointments')}><Calendar className="w-4 h-4" /> Appointments</Button>
        <Button variant={tab === 'revenue' ? 'primary' : 'secondary'} onClick={() => setTab('revenue')}><DollarSign className="w-4 h-4" /> Revenue</Button>
        <Button variant={tab === 'patients' ? 'primary' : 'secondary'} onClick={() => setTab('patients')}><Users className="w-4 h-4" /> Patients</Button>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardBody>
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Daily Appointments</h3>
            {apptStats?.daily?.length ? (
              <div className="space-y-2">
                {apptStats.daily.slice(-14).map((d: any) => (
                  <div key={d.date} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{d.date}</span>
                    <div className="flex gap-3">
                      <span className="text-green-600">{d.completed_appointments} done</span>
                      <span className="text-red-400">{d.cancelled_appointments} cancelled</span>
                      <span className="font-medium">{d.total_appointments} total</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-sm py-8 text-center">No appointment data yet. Click "Refresh Now" to populate.</p>}
          </CardBody></Card>

          <Card><CardBody>
            <h3 className="font-semibold mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Daily Revenue</h3>
            {revStats?.daily?.length ? (
              <div className="space-y-2">
                {revStats.daily.slice(-14).map((d: any) => (
                  <div key={d.date} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{d.date}</span>
                    <div className="flex gap-3">
                      <span className="text-green-600">{formatCurrency(d.collected_revenue)} collected</span>
                      <span className="text-yellow-600">{formatCurrency(d.pending_revenue)} pending</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-sm py-8 text-center">No revenue data yet. Click "Refresh Now" to populate.</p>}
          </CardBody></Card>
        </div>
      )}

      {tab === 'appointments' && (
        <Card><CardBody>
          <h3 className="font-semibold mb-4">Appointment Statistics (Daily)</h3>
          {apptStats?.daily?.length ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Date</th><th>Total</th><th>Completed</th><th>Cancelled</th><th>No-Show</th><th>Completion Rate</th></tr></thead>
                <tbody>
                  {apptStats.daily.map((d: any) => (
                    <tr key={d.date} className="hover:bg-gray-50">
                      <td>{d.date}</td>
                      <td className="font-medium">{d.total_appointments}</td>
                      <td><Badge variant="success">{d.completed_appointments}</Badge></td>
                      <td><Badge variant="danger">{d.cancelled_appointments}</Badge></td>
                      <td><Badge variant="warning">{d.no_show_appointments || 0}</Badge></td>
                      <td>{d.total_appointments > 0 ? Math.round(d.completed_appointments / d.total_appointments * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-gray-400 text-sm py-8 text-center">No appointment data yet. Click "Refresh Now" to populate.</p>}
        </CardBody></Card>
      )}

      {tab === 'revenue' && (
        <Card><CardBody>
          <h3 className="font-semibold mb-4">Revenue Statistics (Daily)</h3>
          {revStats?.daily?.length ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Date</th><th>Total Revenue</th><th>Collected</th><th>Pending</th><th>Invoices</th><th>Paid</th></tr></thead>
                <tbody>
                  {revStats.daily.map((d: any) => (
                    <tr key={d.date} className="hover:bg-gray-50">
                      <td>{d.date}</td>
                      <td className="font-medium">{formatCurrency(d.total_revenue)}</td>
                      <td className="text-green-600">{formatCurrency(d.collected_revenue)}</td>
                      <td className="text-yellow-600">{formatCurrency(d.pending_revenue || 0)}</td>
                      <td>{d.invoice_count || 0}</td>
                      <td>{d.paid_invoice_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-gray-400 text-sm py-8 text-center">No revenue data yet. Click "Refresh Now" to populate.</p>}
        </CardBody></Card>
      )}

      {tab === 'patients' && (
        <Card><CardBody>
          <h3 className="font-semibold mb-4">Patient Statistics (Daily)</h3>
          {patStats?.daily?.length ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Date</th><th>New Patients</th><th>Total Active</th><th>Gender Distribution</th></tr></thead>
                <tbody>
                  {patStats.daily.map((d: any) => {
                    let genderInfo = '-';
                    try {
                      const g = typeof d.gender_distribution === 'string' ? JSON.parse(d.gender_distribution) : d.gender_distribution;
                      genderInfo = Object.entries(g).map(([k, v]) => `${k}: ${v}`).join(', ');
                    } catch {}
                    return (
                      <tr key={d.date} className="hover:bg-gray-50">
                        <td>{d.date}</td>
                        <td><Badge variant="info">{d.new_patients}</Badge></td>
                        <td className="font-medium">{d.total_active_patients}</td>
                        <td className="text-xs text-gray-500">{genderInfo}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="text-gray-400 text-sm py-8 text-center">No patient data yet. Click "Refresh Now" to populate.</p>}
        </CardBody></Card>
      )}
    </div>
  );
}
