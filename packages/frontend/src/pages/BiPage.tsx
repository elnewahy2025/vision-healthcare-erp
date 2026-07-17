import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input } from '../components/ui';
import { BarChart3, Plus, Search, LayoutDashboard, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import api from '../lib/api';

export default function BiPage() {
  const [tab, setTab] = useState<'dashboards' | 'kpi'>('dashboards');
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<any>(null);
  const [kpiData, setKpiData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/bi/dashboards').then(r => setDashboards(r.data.data)).catch(() => []),
      api.get('/bi/kpi/appointments').then(r => setKpiData((d: any) => ({ ...d, appointments: r.data.data }))).catch(() => {}),
      api.get('/bi/kpi/revenue').then(r => setKpiData((d: any) => ({ ...d, revenue: r.data.data }))).catch(() => {}),
      api.get('/bi/kpi/patients').then(r => setKpiData((d: any) => ({ ...d, patients: r.data.data }))).catch(() => {}),
      api.get('/bi/kpi/clinical').then(r => setKpiData((d: any) => ({ ...d, clinical: r.data.data }))).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const loadWidgets = async (dashId: string) => {
    try {
      const r = await api.get(`/bi/dashboards/${dashId}/widgets`);
      setWidgets(r.data.data);
    } catch { setWidgets([]); }
  };

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">BI Dashboards</h1><p className="text-gray-500 mt-1">{dashboards.length} dashboards</p></div>
        <Button><Plus className="w-4 h-4" /> New Dashboard</Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'dashboards' ? 'primary' : 'secondary'} onClick={() => setTab('dashboards')}><LayoutDashboard className="w-4 h-4" /> Dashboards ({dashboards.length})</Button>
        <Button variant={tab === 'kpi' ? 'primary' : 'secondary'} onClick={() => setTab('kpi')}><TrendingUp className="w-4 h-4" /> KPIs</Button>
      </div>

      {tab === 'dashboards' && (
        <>
          <Card className="mb-6"><CardBody>
            <Input placeholder="Search dashboards..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
          </CardBody></Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {dashboards.filter((d: any) => !search || d.name?.toLowerCase().includes(search.toLowerCase())).map((d: any) => (
              <Card key={d.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedDashboard?.id === d.id ? 'ring-2 ring-primary-500' : ''}`}
                onClick={() => { setSelectedDashboard(d); loadWidgets(d.id); }}>
                <CardBody>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{d.name}</h3>
                    <Badge>{d.category}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">{d.description || 'No description'}</p>
                  <p className="text-xs text-gray-400 mt-2">Refresh: {d.refreshInterval} · {d.isDefault ? 'Default' : ''}</p>
                </CardBody>
              </Card>
            ))}
          </div>

          {selectedDashboard && (
            <div>
              <h2 className="text-lg font-semibold mb-4">{selectedDashboard.name} — Widgets ({widgets.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {widgets.map((w: any) => (
                  <Card key={w.id}>
                    <CardBody>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{w.title}</h4>
                        <Badge>{w.widgetType}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">Source: {w.dataSource} · {w.width}x{w.height}</p>
                    </CardBody>
                  </Card>
                ))}
                {widgets.length === 0 && <p className="text-gray-500 col-span-2 text-center py-8">No widgets configured for this dashboard</p>}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'kpi' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardBody>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><Activity className="w-5 h-5 text-blue-600" /></div>
                <div><p className="text-xs text-gray-500">Appointments</p><p className="text-xl font-bold">{kpiData.appointments?.total || 0}</p></div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{kpiData.appointments?.today || 0} today</p>
            </CardBody></Card>
            <Card><CardBody>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div>
                <div><p className="text-xs text-gray-500">Revenue</p><p className="text-xl font-bold">{Number(kpiData.revenue?.total || 0).toFixed(0)} EGP</p></div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{Number(kpiData.revenue?.recent || 0).toFixed(0)} EGP (30d)</p>
            </CardBody></Card>
            <Card><CardBody>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg"><Users className="w-5 h-5 text-purple-600" /></div>
                <div><p className="text-xs text-gray-500">Patients</p><p className="text-xl font-bold">{kpiData.patients?.total || 0}</p></div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{kpiData.patients?.newThisMonth || 0} new this month</p>
            </CardBody></Card>
            <Card><CardBody>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg"><BarChart3 className="w-5 h-5 text-orange-600" /></div>
                <div><p className="text-xs text-gray-500">Clinical</p><p className="text-xl font-bold">{kpiData.clinical?.labOrders || 0}</p></div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{kpiData.clinical?.prescriptions || 0} RX · {kpiData.clinical?.radiologyOrders || 0} imaging</p>
            </CardBody></Card>
          </div>

          <Card><CardBody>
            <h3 className="font-semibold mb-3">Appointments by Status</h3>
            {kpiData.appointments?.byStatus?.length > 0 ? (
              <div className="flex gap-4 flex-wrap">
                {kpiData.appointments.byStatus.map((s: any) => (
                  <div key={s.status} className="flex items-center gap-2">
                    <Badge>{s.status}</Badge>
                    <span className="font-medium">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">No appointment data</p>}
          </CardBody></Card>
        </div>
      )}
    </div>
  );
}
