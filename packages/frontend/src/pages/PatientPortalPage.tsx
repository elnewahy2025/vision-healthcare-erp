import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { UserRound, CalendarCheck, FileText, DollarSign, MessageSquare, LogIn, Smartphone } from 'lucide-react';
import api from '../lib/api';

export default function PatientPortalPage() {
  const [tab, setTab] = useState<'login' | 'dashboard' | 'appointments' | 'bills' | 'messages'>('login');
  const [phone, setPhone] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [dashboard, setDashboard] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const doLogin = async () => {
    setLoading(true);
    try {
      const r = await api.post('/portal/login', { phone, tenantSlug });
      setSessionToken(r.data.data.token);
      setStep('otp');
    } catch (e: any) { alert(e.response?.data?.error || 'Login failed'); }
    setLoading(false);
  };

  const doVerify = async () => {
    setLoading(true);
    try {
      const r = await api.post('/portal/verify', { token: sessionToken, otp });
      localStorage.setItem('portalToken', r.data.data.accessToken);
      setLoggedIn(true);
      setStep('phone');
      loadDashboard();
    } catch (e: any) { alert(e.response?.data?.error || 'Verification failed'); }
    setLoading(false);
  };

  const loadDashboard = async () => {
    setLoading(true);
    const token = localStorage.getItem('portalToken');
    if (!token) return;
    try {
      const [dashR, apptR, billsR, msgsR] = await Promise.all([
        api.get('/portal/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/portal/appointments', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/portal/bills', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/portal/messages', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setDashboard(dashR.data.data);
      setAppointments(apptR.data.data);
      setBills(billsR.data.data);
      setMessages(msgsR.data.data);
      setTab('dashboard');
    } catch { setLoggedIn(false); }
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('portalToken');
    if (token) { setLoggedIn(true); loadDashboard(); }
  }, []);

  if (!loggedIn) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card>
          <CardBody>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserRound className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-xl font-bold">Patient Portal</h1>
              <p className="text-sm text-gray-500">Access your health records, appointments, and bills</p>
            </div>

            {step === 'phone' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Organization Code</label>
                  <Input placeholder="e.g., myclinic" value={tenantSlug} onChange={e => setTenantSlug(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input placeholder="+966501234567" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <Button className="w-full" onClick={doLogin} loading={loading}>
                  <Smartphone className="w-4 h-4" /> Send OTP
                </Button>
              </div>
            )}

            {step === 'otp' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Enter the OTP sent to your phone</p>
                <Input placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} className="text-center text-2xl tracking-widest" />
                <Button className="w-full" onClick={doVerify} loading={loading}>Verify & Login</Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Patient Portal</h1>
          <p className="text-gray-500 mt-1">Welcome, {dashboard?.patient?.firstName}</p>
        </div>
        <Button variant="ghost" onClick={() => { localStorage.removeItem('portalToken'); setLoggedIn(false); setTab('login'); }}>Logout</Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === 'dashboard' ? 'primary' : 'secondary'} onClick={() => setTab('dashboard')}><UserRound className="w-4 h-4" /> Dashboard</Button>
        <Button variant={tab === 'appointments' ? 'primary' : 'secondary'} onClick={() => setTab('appointments')}><CalendarCheck className="w-4 h-4" /> Appointments ({appointments.length})</Button>
        <Button variant={tab === 'bills' ? 'primary' : 'secondary'} onClick={() => setTab('bills')}><DollarSign className="w-4 h-4" /> Bills ({bills.length})</Button>
        <Button variant={tab === 'messages' ? 'primary' : 'secondary'} onClick={() => setTab('messages')}><MessageSquare className="w-4 h-4" /> Messages ({messages.length})</Button>
      </div>

      {tab === 'dashboard' && dashboard && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card><CardBody><p className="text-sm text-gray-500">Upcoming</p><p className="text-2xl font-bold">{dashboard.upcomingAppointments?.length || 0}</p><p className="text-xs text-gray-400">Appointments</p></CardBody></Card>
            <Card><CardBody><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold">{dashboard.pendingBills?.length || 0}</p><p className="text-xs text-gray-400">Bills</p></CardBody></Card>
            <Card><CardBody><p className="text-sm text-gray-500">Unread</p><p className="text-2xl font-bold">{dashboard.unreadMessages || 0}</p><p className="text-xs text-gray-400">Messages</p></CardBody></Card>
            <Card><CardBody><p className="text-sm text-gray-500">Recent</p><p className="text-2xl font-bold">{dashboard.recentRecords?.length || 0}</p><p className="text-xs text-gray-400">Records</p></CardBody></Card>
          </div>

          {dashboard.upcomingAppointments?.length > 0 && (
            <Card className="mb-4"><CardBody>
              <h3 className="font-semibold mb-3">Upcoming Appointments</h3>
              {dashboard.upcomingAppointments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div><p className="font-medium">{a.date} at {a.time}</p><p className="text-xs text-gray-500">{a.type} · {a.status}</p></div>
                  <Badge>{a.status}</Badge>
                </div>
              ))}
            </CardBody></Card>
          )}

          {dashboard.pendingBills?.length > 0 && (
            <Card><CardBody>
              <h3 className="font-semibold mb-3">Pending Bills</h3>
              {dashboard.pendingBills.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div><p className="font-medium">{b.invoiceNumber}</p><p className="text-xs text-gray-500">Due: {b.dueDate}</p></div>
                  <p className="font-bold text-red-600">{Number(b.dueAmount).toFixed(2)} EGP</p>
                </div>
              ))}
            </CardBody></Card>
          )}
        </div>
      )}

      {tab === 'appointments' && (
        <div className="table-container">
          <table><thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Status</th><th>Reason</th></tr></thead>
            <tbody>
              {appointments.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">No appointments</td></tr> :
                appointments.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td>{a.date}</td><td>{a.time}</td><td><Badge>{a.type}</Badge></td>
                    <td><Badge variant={a.status === 'confirmed' ? 'success' : a.status === 'cancelled' ? 'danger' : 'warning'}>{a.status}</Badge></td>
                    <td className="text-xs">{a.reason || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bills' && (
        <div className="table-container">
          <table><thead><tr><th>Invoice</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th>Due Date</th></tr></thead>
            <tbody>
              {bills.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No bills</td></tr> :
                bills.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="font-mono text-xs">{b.invoiceNumber}</td>
                    <td>{Number(b.total).toFixed(2)} EGP</td>
                    <td>{Number(b.paid).toFixed(2)}</td>
                    <td className="font-medium text-red-600">{Number(b.dueAmount).toFixed(2)}</td>
                    <td><Badge variant={b.status === 'paid' ? 'success' : b.status === 'pending' ? 'warning' : 'danger'}>{b.status}</Badge></td>
                    <td className="text-xs">{b.dueDate || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'messages' && (
        <div>
          {messages.length === 0 ? (
            <Card><CardBody><p className="text-center text-gray-500 py-8">No messages</p></CardBody></Card>
          ) : messages.map((m: any) => (
            <Card key={m.id} className="mb-3">
              <CardBody>
                <div className="flex items-start justify-between mb-1">
                  <h4 className={`font-medium text-sm ${!m.isRead && m.direction === 'outbound' ? 'text-primary-600' : ''}`}>{m.subject}</h4>
                  <div className="flex gap-2 items-center">
                    {!m.isRead && m.direction === 'outbound' && <Badge variant="warning">New</Badge>}
                    <Badge variant={m.direction === 'inbound' ? 'info' : 'gray'}>{m.direction === 'inbound' ? 'You' : 'Staff'}</Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{m.body}</p>
                <p className="text-xs text-gray-400 mt-1">{m.createdAt?.split('T')[0]}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
