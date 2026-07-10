import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal, Select } from '../components/ui';
import { CalendarPlus, Search, Clock, UserCheck, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';

export default function OnlineBookingPage() {
  const [tab, setTab] = useState<'public' | 'manage'>('public');
  const [tenantSlug, setTenantSlug] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [reason, setReason] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const loadDoctors = async () => {
    if (!tenantSlug) return;
    setLoading(true);
    try { const r = await api.get('/booking/doctors', { params: { tenantSlug } }); setDoctors(r.data.data); } catch {}
    setLoading(false);
  };

  const loadSlots = async () => {
    if (!tenantSlug || !selectedDoctor) return;
    setLoading(true);
    try { const r = await api.get('/booking/slots', { params: { tenantSlug, doctorId: selectedDoctor } }); setSlots(r.data.data); } catch {}
    setLoading(false);
  };

  const loadRequests = async () => {
    try { const r = await api.get('/booking/manage/requests'); setRequests(r.data.data); } catch {}
  };

  useEffect(() => { if (tab === 'manage') loadRequests(); }, [tab]);

  const doBooking = async () => {
    if (!selectedSlot || !patientName || !patientPhone) return;
    setLoading(true);
    try {
      const r = await api.post('/booking/request', {
        slotId: selectedSlot, patientName, patientPhone,
        patientEmail: patientEmail || undefined, reason: reason || undefined, tenantSlug
      });
      setBookingMessage(r.data.message || 'Booking submitted!');
      setShowBookingForm(false);
    } catch (e: any) { setBookingMessage('Error: ' + (e.response?.data?.error || 'Failed')); }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Online Booking</h1></div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'public' ? 'primary' : 'secondary'} onClick={() => setTab('public')}><CalendarPlus className="w-4 h-4" /> Public Booking</Button>
        <Button variant={tab === 'manage' ? 'primary' : 'secondary'} onClick={() => setTab('manage')}><UserCheck className="w-4 h-4" /> Manage Requests</Button>
      </div>

      {tab === 'public' && (
        <div className="max-w-2xl mx-auto">
          {!bookingMessage && (
            <Card className="mb-6"><CardBody>
              <h2 className="text-lg font-semibold mb-4">Book an Appointment</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Organization Code</label>
                  <Input placeholder="e.g., myclinic" value={tenantSlug} onChange={e => setTenantSlug(e.target.value)} />
                </div>
                <Button onClick={loadDoctors} disabled={!tenantSlug} loading={loading}>Find Doctors</Button>

                {doctors.length > 0 && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Select Doctor</label>
                      <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={selectedDoctor} onChange={e => { setSelectedDoctor(e.target.value); setSlots([]); }}>
                        <option value="">Choose a doctor...</option>
                        {doctors.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <Button onClick={loadSlots} disabled={!selectedDoctor}>Show Available Slots</Button>
                  </>
                )}

                {slots.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Available Slots</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((s: any) => (
                        <button key={s.id}
                          className={`p-2 text-xs rounded-lg border text-center transition-all ${selectedSlot === s.id ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-gray-200 hover:border-primary-300'}`}
                          onClick={() => setSelectedSlot(s.id)}
                        >
                          <div className="font-medium">{s.date?.slice(5)}</div>
                          <div>{s.startTime}</div>
                          <Badge variant="gray">{s.slotType}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSlot && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <h4 className="font-medium">Your Information</h4>
                    <Input placeholder="Full Name" value={patientName} onChange={e => setPatientName(e.target.value)} />
                    <Input placeholder="Phone Number" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} />
                    <Input placeholder="Email (optional)" value={patientEmail} onChange={e => setPatientEmail(e.target.value)} />
                    <Input placeholder="Reason for visit (optional)" value={reason} onChange={e => setReason(e.target.value)} />
                    <Button className="w-full" onClick={doBooking} loading={loading}>Confirm Booking</Button>
                  </div>
                )}
              </div>
            </CardBody></Card>
          )}

          {bookingMessage && (
            <Card><CardBody className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">Booking Submitted!</h3>
              <p className="text-gray-500 mb-4">{bookingMessage}</p>
              <Button onClick={() => { setBookingMessage(''); setSelectedSlot(''); setPatientName(''); setPatientPhone(''); setPatientEmail(''); setReason(''); }}>Book Another</Button>
            </CardBody></Card>
          )}
        </div>
      )}

      {tab === 'manage' && (
        <div className="table-container">
          <table><thead><tr><th>Patient</th><th>Phone</th><th>Doctor</th><th>Date/Time</th><th>Source</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {requests.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">No booking requests</td></tr> :
                requests.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="font-medium">{r.patientName}</td>
                    <td className="text-xs">{r.patientPhone}</td>
                    <td className="text-xs">{r.doctorName || '-'}</td>
                    <td className="text-xs">{r.slotDate} {r.slotTime}</td>
                    <td><Badge>{r.source}</Badge></td>
                    <td><Badge variant={r.status === 'confirmed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'warning'}>{r.status}</Badge></td>
                    <td>
                      <div className="flex gap-1">
                        {r.status === 'pending' && <>
                          <Button variant="ghost" size="sm" onClick={async () => { await api.put(`/booking/manage/requests/${r.id}`, { status: 'confirmed' }); loadRequests(); }}>Confirm</Button>
                          <Button variant="ghost" size="sm" onClick={async () => { await api.put(`/booking/manage/requests/${r.id}`, { status: 'cancelled' }); loadRequests(); }}>Cancel</Button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
