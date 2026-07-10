import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, Button, Input, Select, Modal, Spinner, EmptyState } from '../components/ui';
import { PhoneCall, Phone, PhoneIncoming, PhoneOutgoing, Clock, BarChart3, Plus, Search, Video } from 'lucide-react';
import api from '../lib/api';

interface VoiceCall {
  id: string;
  from_number: string;
  to_number: string;
  call_type: string;
  status: string;
  duration_seconds: number;
  ringing_seconds: number;
  notes: string;
  created_at: string;
  completed_at: string;
  patient_id: string;
}

interface VoiceStats {
  total: number;
  today: number;
  totalMinutes: number;
  byStatus: Array<{ status: string; count: number }>;
  byType: Array<{ call_type: string; count: number }>;
}

export default function VoiceCallsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'calls' | 'make' | 'stats'>('calls');
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [stats, setStats] = useState<VoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [callLoading, setCallLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 1, limit: 20 });
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);
  const [showConferenceModal, setShowConferenceModal] = useState(false);

  const [callForm, setCallForm] = useState({
    toNumber: '',
    notes: '',
  });

  const [conferenceForm, setConferenceForm] = useState<{
    participants: Array<{ phone: string; role: 'doctor' | 'patient' | 'staff' }>;
  }>({
    participants: [{ phone: '', role: 'doctor' }, { phone: '', role: 'patient' }],
  });

  const loadCalls = async () => {
    try {
      const params: any = { page: pagination.page, limit: pagination.limit };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.callType = typeFilter;
      const res = await api.get('/voice/calls', { params });
      setCalls(res.data.data);
      setPagination(prev => ({ ...prev, total: res.data.pagination.totalPages }));
    } catch { /* empty */ }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/voice/stats');
      setStats(res.data.data);
    } catch { /* empty */ }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCalls(), loadStats()]).finally(() => setLoading(false));
  }, [tab, statusFilter, typeFilter, pagination.page]);

  const handleCall = async () => {
    if (!callForm.toNumber) return;
    setCallLoading(true);
    try {
      await api.post('/voice/call', { toNumber: callForm.toNumber, notes: callForm.notes || undefined });
      setCallForm({ toNumber: '', notes: '' });
      loadCalls();
      setTab('calls');
    } finally { setCallLoading(false); }
  };

  const handleConference = async () => {
    const validParticipants = conferenceForm.participants.filter(p => p.phone);
    if (validParticipants.length < 2) return;
    setCallLoading(true);
    try {
      await api.post('/voice/conference', { participants: validParticipants });
      setShowConferenceModal(false);
      setConferenceForm({ participants: [{ phone: '', role: 'doctor' }, { phone: '', role: 'patient' }] });
      loadCalls();
    } finally { setCallLoading(false); }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      initiated: 'bg-gray-100 text-gray-800',
      ringing: 'bg-yellow-100 text-yellow-800',
      answered: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      busy: 'bg-orange-100 text-orange-800',
      'no-answer': 'bg-purple-100 text-purple-800',
    };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
  };

  const formatNumber = (n: string) => {
    if (n.startsWith('+2')) return n;
    return `+${n.replace(/[^0-9]/g, '')}`;
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <PhoneCall className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('nav.voiceCalls')}</h1>
            <p className="text-sm text-gray-500">Manage and log voice calls via Twilio</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowConferenceModal(true)} icon={<Video className="w-4 h-4" />}>
            Conference
          </Button>
          <Button onClick={() => setTab('make')} icon={<Phone className="w-4 h-4" />}>
            New Call
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {(['calls', 'make', 'stats'] as const).map(tabKey => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
              tab === tabKey ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tabKey === 'make' ? 'New Call' : tabKey}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {tab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardBody>
              <p className="text-sm text-gray-500">Total Calls</p>
              <p className="text-3xl font-bold text-purple-600">{stats.total}</p>
            </CardBody></Card>
            <Card><CardBody>
              <p className="text-sm text-gray-500">Today</p>
              <p className="text-3xl font-bold text-blue-600">{stats.today}</p>
            </CardBody></Card>
            <Card><CardBody>
              <p className="text-sm text-gray-500">Total Minutes</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalMinutes}</p>
            </CardBody></Card>
            {stats.byStatus?.slice(0, 1).map(s => (
              <Card key={s.status}><CardBody>
                <p className="text-sm text-gray-500 capitalize">{s.status}</p>
                <p className="text-3xl font-bold">{Number(s.count)}</p>
              </CardBody></Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardBody>
              <h3 className="font-semibold mb-3">By Status</h3>
              <div className="space-y-2">
                {stats.byStatus?.map(s => (
                  <div key={s.status} className="flex justify-between items-center">
                    {statusBadge(s.status)}
                    <span className="font-medium">{Number(s.count)} calls</span>
                  </div>
                ))}
              </div>
            </CardBody></Card>
            <Card><CardBody>
              <h3 className="font-semibold mb-3">By Type</h3>
              <div className="space-y-2">
                {stats.byType?.map(t => (
                  <div key={t.call_type} className="flex justify-between items-center">
                    <span className="capitalize text-sm font-medium">{t.call_type}</span>
                    <span className="font-medium">{Number(t.count)} calls</span>
                  </div>
                ))}
              </div>
            </CardBody></Card>
          </div>
        </div>
      )}

      {/* Make Call Tab */}
      {tab === 'make' && (
        <Card><CardBody>
          <h3 className="font-semibold mb-4">Make a Voice Call</h3>
          <div className="space-y-4 max-w-lg">
            <Input label="To Number" placeholder="+201234567890" value={callForm.toNumber}
              onChange={(e) => setCallForm(p => ({ ...p, toNumber: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea className="w-full rounded-lg border-gray-300 border p-3 h-24" placeholder="Call notes..."
                value={callForm.notes} onChange={(e) => setCallForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <Button onClick={handleCall} disabled={callLoading || !callForm.toNumber}
              icon={<Phone className="w-4 h-4" />}>
              {callLoading ? 'Calling...' : 'Start Call'}
            </Button>
          </div>
        </CardBody></Card>
      )}

      {/* Calls List Tab */}
      {tab === 'calls' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' },
                { value: 'ringing', label: 'Ringing' },
                { value: 'no-answer', label: 'No Answer' },
              ]}
            />
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Types' },
                { value: 'outbound', label: 'Outbound' },
                { value: 'inbound', label: 'Inbound' },
                { value: 'conference', label: 'Conference' },
              ]}
            />
          </div>

          {calls.length === 0 ? (
            <EmptyState icon={<PhoneCall className="w-12 h-12" />} title="No calls" message="No voice calls found" />
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {calls.map(call => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          call.call_type === 'inbound' ? 'bg-green-100 text-green-800' :
                          call.call_type === 'conference' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>{call.call_type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatNumber(call.from_number)}</td>
                      <td className="px-4 py-3 text-sm">{formatNumber(call.to_number)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {formatDuration(call.duration_seconds)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{statusBadge(call.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(call.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedCall(call)} className="p-1 rounded hover:bg-gray-100">
                          <Phone className="w-4 h-4 text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center px-4 py-3 border-t">
                <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.total}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={pagination.page <= 1}
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Prev</Button>
                  <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.total}
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Call Detail Modal */}
      {selectedCall && (
        <Modal open={!!selectedCall} onClose={() => setSelectedCall(null)} title="Call Details">
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-500">Type:</span><span className="capitalize">{selectedCall.call_type}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">From:</span><span>{formatNumber(selectedCall.from_number)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">To:</span><span>{formatNumber(selectedCall.to_number)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Duration:</span><span>{formatDuration(selectedCall.duration_seconds)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Status:</span>{statusBadge(selectedCall.status)}</div>
            <div className="flex justify-between"><span className="text-gray-500">Date:</span><span>{new Date(selectedCall.created_at).toLocaleString()}</span></div>
            {selectedCall.notes && (
              <div><p className="text-gray-500 mb-1">Notes:</p><p className="bg-gray-50 p-3 rounded-lg">{selectedCall.notes}</p></div>
            )}
          </div>
        </Modal>
      )}

      {/* Conference Modal */}
      {showConferenceModal && (
        <Modal open={showConferenceModal} onClose={() => setShowConferenceModal(false)} title="Conference Call">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Add at least 2 participants for a conference call.</p>
            {conferenceForm.participants.map((p, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <Input label={`Participant ${i + 1} Phone`} placeholder="+201234567890" value={p.phone}
                  onChange={(e) => {
                    const newParts = [...conferenceForm.participants];
                    newParts[i] = { ...newParts[i], phone: e.target.value };
                    setConferenceForm({ participants: newParts });
                  }} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select className="w-full rounded-lg border-gray-300 border p-2" value={p.role}
                    onChange={(e) => {
                      const newParts = [...conferenceForm.participants];
                      newParts[i] = { ...newParts[i], role: e.target.value as any };
                      setConferenceForm({ participants: newParts });
                    }}>
                    <option value="doctor">Doctor</option>
                    <option value="patient">Patient</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() =>
              setConferenceForm(p => ({ participants: [...p.participants, { phone: '', role: 'staff' }] }))
            }>+ Add Participant</Button>
            <Button onClick={handleConference} disabled={callLoading || conferenceForm.participants.filter(p => p.phone).length < 2}
              icon={<Video className="w-4 h-4" />}>
              {callLoading ? 'Starting...' : 'Start Conference'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
