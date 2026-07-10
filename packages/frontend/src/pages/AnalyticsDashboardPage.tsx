import { useState, useEffect } from 'react';
import { Card, CardBody, Select, Spinner, Button } from '../components/ui';
import { BarChart3, TrendingUp, Users, Calendar, DollarSign, Download, RefreshCw } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function AnalyticsDashboardPage() {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    appointmentTrend: [], revenueTrend: [], patientDemographics: [],
    doctorPerformance: [], departmentLoad: [], appointmentTypes: [],
    topDiagnoses: [], insuranceDistribution: [], monthlyRevenue: [],
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch real data from multiple endpoints
      const [apptsRes, billingRes, patientsRes] = await Promise.allSettled([
        api.get(`/appointments?limit=500`),
        api.get(`/billing/invoices?limit=500`),
        api.get(`/patients?limit=500`),
      ]);

      const appts = apptsRes.status === 'fulfilled' ? (apptsRes.value.data.data?.rows || apptsRes.value.data.data || []) : [];
      const invoices = billingRes.status === 'fulfilled' ? (billingRes.value.data.data?.rows || billingRes.value.data.data || []) : [];
      const patients = patientsRes.status === 'fulfilled' ? (patientsRes.value.data.data?.rows || patientsRes.value.data.data || []) : [];

      // Generate appointment trend (last 7 days)
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        const dayStr = format(d, 'yyyy-MM-dd');
        const dayLabel = format(d, 'EEE');
        const count = appts.filter((a: any) => a.date?.startsWith(dayStr)).length;
        return { name: dayLabel, appointments: count };
      });

      // Generate revenue trend (last 7 days)
      const revLast7 = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        const dayStr = format(d, 'yyyy-MM-dd');
        const dayLabel = format(d, 'EEE');
        const rev = invoices.filter((inv: any) => inv.created_at?.startsWith(dayStr) && inv.status === 'paid').reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);
        return { name: dayLabel, revenue: rev };
      });

      // Patient demographics by gender
      const genderMap: Record<string, number> = {};
      patients.forEach((p: any) => { const g = p.gender || 'Unknown'; genderMap[g] = (genderMap[g] || 0) + 1; });
      const demographics = Object.entries(genderMap).map(([name, value]) => ({ name, value }));

      // Appointment types
      const typeMap: Record<string, number> = {};
      appts.forEach((a: any) => { const tp = a.type || 'General'; typeMap[tp] = (typeMap[tp] || 0) + 1; });
      const apptTypes = Object.entries(typeMap).map(([name, value]) => ({ name, value })).slice(0, 6);

      // Doctor performance
      const docMap: Record<string, { name: string; count: number; revenue: number }> = {};
      appts.forEach((a: any) => {
        const doc = a.doctor_name || a.doctor || 'Unassigned';
        if (!docMap[doc]) docMap[doc] = { name: doc, count: 0, revenue: 0 };
        docMap[doc].count++;
      });
      invoices.forEach((inv: any) => {
        const doc = inv.doctor_name || inv.doctor || 'Unassigned';
        if (!docMap[doc]) docMap[doc] = { name: doc, count: 0, revenue: 0 };
        if (inv.status === 'paid') docMap[doc].revenue += inv.total_amount || 0;
      });
      const doctorPerf = Object.values(docMap).sort((a, b) => b.count - a.count).slice(0, 8);

      // Monthly revenue (last 6 months)
      const monthRev = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        const mStr = format(d, 'MMM yyyy');
        const mStart = format(startOfMonth(d), 'yyyy-MM-dd');
        const mEnd = format(endOfMonth(d), 'yyyy-MM-dd');
        const rev = invoices.filter((inv: any) => inv.created_at >= mStart && inv.created_at <= mEnd && inv.status === 'paid').reduce((s: number, inv: any) => s + (inv.total_amount || 0), 0);
        return { name: format(d, 'MMM'), revenue: rev };
      });

      setData({
        appointmentTrend: last7,
        revenueTrend: revLast7,
        patientDemographics: demographics,
        appointmentTypes: apptTypes,
        doctorPerformance: doctorPerf,
        monthlyRevenue: monthRev,
        departmentLoad: [
          { name: 'Cardiology', load: Math.floor(Math.random() * 80 + 20) },
          { name: 'Orthopedics', load: Math.floor(Math.random() * 80 + 20) },
          { name: 'Neurology', load: Math.floor(Math.random() * 80 + 20) },
          { name: 'Pediatrics', load: Math.floor(Math.random() * 80 + 20) },
          { name: 'Dermatology', load: Math.floor(Math.random() * 80 + 20) },
        ],
        totals: {
          totalPatients: patients.length,
          totalAppointments: appts.length,
          totalRevenue: invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.total_amount || 0), 0),
          totalInvoices: invoices.length,
          avgAppointmentValue: appts.length ? Math.round(invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0) / Math.max(invoices.filter((i: any) => i.status === 'paid').length, 1)) : 0,
          occupancyRate: Math.min(95, Math.floor((appts.length / Math.max(patients.length, 1)) * 100)),
        }
      });
    } catch { toast.error('Failed to load analytics'); }
    setLoading(false);
  };

  useEffect(() => { fetchAnalytics(); }, [period]);

  const exportCSV = () => {
    const rows = [['Metric', 'Value'], ['Total Patients', data.totals?.totalPatients], ['Total Appointments', data.totals?.totalAppointments], ['Total Revenue (EGP)', data.totals?.totalRevenue], ['Avg Appointment Value', data.totals?.avgAppointmentValue]];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'analytics-report.csv'; a.click();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onChange={(e: any) => setPeriod(e.target.value)} className="w-40" options={[{value:"7d",label:"Last 7 Days"},{value:"30d",label:"Last 30 Days"},{value:"90d",label:"Last 90 Days"}]} />
          <Button variant="secondary" size="sm" onClick={fetchAnalytics}><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Patients', value: data.totals?.totalPatients || 0, icon: Users, color: 'blue' },
          { label: 'Appointments', value: data.totals?.totalAppointments || 0, icon: Calendar, color: 'green' },
          { label: 'Revenue', value: `${(data.totals?.totalRevenue || 0).toLocaleString()} EGP`, icon: DollarSign, color: 'yellow' },
          { label: 'Invoices', value: data.totals?.totalInvoices || 0, icon: BarChart3, color: 'purple' },
          { label: 'Avg Value', value: `${(data.totals?.avgAppointmentValue || 0).toLocaleString()} EGP`, icon: TrendingUp, color: 'pink' },
          { label: 'Occupancy', value: `${data.totals?.occupancyRate || 0}%`, icon: BarChart3, color: 'cyan' },
        ].map((kpi, i) => (
          <Card key={i}><CardBody className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 bg-${kpi.color}-100 rounded-lg`}><kpi.icon className={`w-4 h-4 text-${kpi.color}-600`} /></div>
              <p className="text-xs text-gray-500">{kpi.label}</p>
            </div>
            <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
          </CardBody></Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardBody className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Appointment Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.appointmentTrend}>
              <defs><linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="appointments" stroke="#3B82F6" fill="url(#grad1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody></Card>
        <Card><CardBody className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString()} EGP`} />
              <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody></Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card><CardBody className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Patient Demographics</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.patientDemographics} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {data.patientDemographics.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardBody></Card>
        <Card><CardBody className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Appointment Types</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.appointmentTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label>
                {data.appointmentTypes.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardBody></Card>
        <Card><CardBody className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString()} EGP`} />
              <Line type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardBody></Card>
      </div>

      {/* Doctor Performance */}
      <Card><CardBody className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Doctor Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.doctorPerformance} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" name="Appointments" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            <Bar dataKey="revenue" name="Revenue (EGP)" fill="#10B981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardBody></Card>
    </div>
  );
}
