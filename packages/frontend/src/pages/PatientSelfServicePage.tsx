import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Select, Badge, Spinner, Modal } from '../components/ui';
import { Calendar, Clock, User, FileText, CreditCard, CheckCircle, ArrowRight, ArrowLeft, Stethoscope, FlaskConical, PillBottle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Doctor { id: string; name: string; specialization: string; }
interface TimeSlot { time: string; available: boolean; }
interface Appointment { id: string; date: string; time: string; doctor_name: string; type: string; status: string; reason: string; }
interface LabResult { id: string; test_name: string; result: string; unit: string; reference_range: string; status: string; date: string; }
interface Prescription { id: string; medication: string; dosage: string; frequency: string; duration: string; prescribed_date: string; }
interface Invoice { id: string; invoice_number: string; total_amount: number; status: string; created_at: string; items: any[]; }

export default function PatientSelfServicePage() {
  const [activeTab, setActiveTab] = useState<'book' | 'appointments' | 'lab' | 'prescriptions' | 'invoices'>('book');
  const [loading, setLoading] = useState(false);

  // Booking state
  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [appointmentType, setAppointmentType] = useState('consultation');
  const [reason, setReason] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const fetchDoctors = async () => {
    try {
      const { data } = await api.get('/users?role=doctor&is_active=true');
      setDoctors(data.data?.rows || data.data || []);
    } catch { toast.error('Failed to load doctors'); }
  };

  const fetchSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;
    try {
      const { data } = await api.get(`/appointments/slots?doctor_id=${selectedDoctor.id}&date=${selectedDate}`);
      const slots = data.data || [];
      setAvailableSlots(Array.isArray(slots) ? slots : generateDefaultSlots());
    } catch { setAvailableSlots(generateDefaultSlots()); }
  };

  const generateDefaultSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let h = 9; h <= 17; h++) {
      slots.push({ time: `${h.toString().padStart(2, '0')}:00`, available: Math.random() > 0.3 });
      if (h < 17) slots.push({ time: `${h.toString().padStart(2, '0')}:30`, available: Math.random() > 0.3 });
    }
    return slots;
  };

  const bookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) { toast.error('Please complete all selections'); return; }
    setLoading(true);
    try {
      await api.post('/appointments', {
        doctor_id: selectedDoctor.id, date: selectedDate, time: selectedTime,
        type: appointmentType, reason,
      });
      setBookingSuccess(true);
      toast.success('Appointment booked successfully!');
    } catch { toast.error('Failed to book appointment'); }
    setLoading(false);
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/appointments?limit=50');
      setAppointments(data.data?.rows || data.data || []);
    } catch {}
    setLoading(false);
  };

  const fetchLabResults = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/laboratory/results?limit=50');
      setLabResults(data.data?.rows || data.data || []);
    } catch {}
    setLoading(false);
  };

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/pharmacy/prescriptions?limit=50');
      setPrescriptions(data.data?.rows || data.data || []);
    } catch {}
    setLoading(false);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/billing/invoices?limit=50');
      setInvoices(data.data?.rows || data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
  }, []);

  useEffect(() => { if (activeTab === 'appointments') fetchAppointments(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'lab') fetchLabResults(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'prescriptions') fetchPrescriptions(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'invoices') fetchInvoices(); }, [activeTab]);
  useEffect(() => { fetchSlots(); }, [selectedDoctor, selectedDate]);

  const resetBooking = () => {
    setStep(1); setSelectedDoctor(null); setSelectedDate(''); setSelectedTime('');
    setAppointmentType('consultation'); setReason(''); setBookingSuccess(false);
  };

  const tabs = [
    { key: 'book', label: 'Book Appointment', icon: Calendar },
    { key: 'appointments', label: 'My Appointments', icon: Clock },
    { key: 'lab', label: 'Lab Results', icon: FlaskConical },
    { key: 'prescriptions', label: 'Prescriptions', icon: PillBottle },
    { key: 'invoices', label: 'My Invoices', icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Patient Portal</h1>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Booking Wizard */}
      {activeTab === 'book' && (
        <Card><CardBody className="p-6">
          {bookingSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Appointment Booked!</h2>
              <p className="text-gray-500 mb-4">Your appointment with {selectedDoctor?.name} on {selectedDate} at {selectedTime} has been confirmed.</p>
              <Button onClick={resetBooking}>Book Another Appointment</Button>
            </div>
          ) : (
            <>
              {/* Progress Steps */}
              <div className="flex items-center justify-center gap-4 mb-8">
                {['Select Doctor', 'Choose Date & Time', 'Confirm'].map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{step > i + 1 ? '✓' : i + 1}</div>
                    <span className={`text-sm ${step === i + 1 ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>{s}</span>
                    {i < 2 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                  </div>
                ))}
              </div>

              {/* Step 1: Select Doctor */}
              {step === 1 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Select a Doctor</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {doctors.map((d) => (
                      <button key={d.id} onClick={() => { setSelectedDoctor(d); setStep(2); }}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${selectedDoctor?.id === d.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center"><Stethoscope className="w-5 h-5 text-primary-600" /></div>
                          <div>
                            <p className="font-medium text-gray-900">{d.name}</p>
                            <p className="text-xs text-gray-500">{d.specialization || 'General Practice'}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {doctors.length === 0 && <p className="text-gray-500 col-span-full text-center py-4">No doctors available</p>}
                  </div>
                </div>
              )}

              {/* Step 2: Date & Time */}
              {step === 2 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Choose Date & Time for {selectedDoctor?.name}</h3>
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /> Back</Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                      <Input type="date" value={selectedDate} min={new Date().toISOString().split('T')[0]} onChange={(e: any) => setSelectedDate(e.target.value)} />
                      <Select label="Appointment Type" value={appointmentType} onChange={(e: any) => setAppointmentType(e.target.value)} className="mt-4" options={[{value:"consultation",label:"Consultation"},{value:"follow-up",label:"Follow-up"},{value:"emergency",label:"Emergency"},{value:"telemedicine",label:"Telemedicine"}]} />
                    </div>
                    {selectedDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Available Slots</label>
                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                          {availableSlots.map((s) => (
                            <button key={s.time} disabled={!s.available} onClick={() => setSelectedTime(s.time)}
                              className={`p-2 rounded-lg text-sm font-medium border ${!s.available ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : selectedTime === s.time ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 hover:border-primary-400'}`}>
                              {s.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedDate && selectedTime && (
                    <div className="mt-6 flex justify-end">
                      <Button onClick={() => setStep(3)}>Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 3 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Confirm Your Appointment</h3>
                  <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                    <p><span className="font-medium">Doctor:</span> {selectedDoctor?.name} ({selectedDoctor?.specialization})</p>
                    <p><span className="font-medium">Date:</span> {selectedDate}</p>
                    <p><span className="font-medium">Time:</span> {selectedTime}</p>
                    <p><span className="font-medium">Type:</span> {appointmentType}</p>
                    <Input label="Reason for Visit" value={reason} onChange={(e: any) => setReason(e.target.value)} placeholder="Describe your symptoms or reason..." className="mt-4" />
                  </div>
                  <div className="flex justify-between mt-6">
                    <Button variant="secondary" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                    <Button onClick={bookAppointment} disabled={loading}>{loading ? 'Booking...' : 'Confirm Booking'}</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody></Card>
      )}

      {/* My Appointments */}
      {activeTab === 'appointments' && (
        <Card><CardBody className="p-0">
          {loading ? <Spinner /> : appointments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No appointments found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Doctor</th><th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Reason</th>
              </tr></thead>
              <tbody>{appointments.map((a) => (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{a.date}</td><td className="px-4 py-3">{a.time}</td>
                  <td className="px-4 py-3 font-medium">{a.doctor_name}</td>
                  <td className="px-4 py-3"><Badge>{a.type}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={a.status === 'confirmed' ? 'success' : a.status === 'cancelled' ? 'danger' : 'warning'}>{a.status}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{a.reason || '-'}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </CardBody></Card>
      )}

      {/* Lab Results */}
      {activeTab === 'lab' && (
        <Card><CardBody className="p-0">
          {loading ? <Spinner /> : labResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No lab results available</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left">Test</th><th className="px-4 py-3 text-left">Result</th>
                <th className="px-4 py-3 text-left">Reference</th><th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr></thead>
              <tbody>{labResults.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">{r.test_name}</td>
                  <td className="px-4 py-3">{r.result} {r.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{r.reference_range}</td>
                  <td className="px-4 py-3"><Badge variant={r.status === 'normal' ? 'success' : r.status === 'critical' ? 'danger' : 'warning'}>{r.status}</Badge></td>
                  <td className="px-4 py-3">{r.date}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </CardBody></Card>
      )}

      {/* Prescriptions */}
      {activeTab === 'prescriptions' && (
        <Card><CardBody className="p-0">
          {loading ? <Spinner /> : prescriptions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No prescriptions found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left">Medication</th><th className="px-4 py-3 text-left">Dosage</th>
                <th className="px-4 py-3 text-left">Frequency</th><th className="px-4 py-3 text-left">Duration</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr></thead>
              <tbody>{prescriptions.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">{p.medication}</td>
                  <td className="px-4 py-3">{p.dosage}</td>
                  <td className="px-4 py-3">{p.frequency}</td>
                  <td className="px-4 py-3">{p.duration}</td>
                  <td className="px-4 py-3">{p.prescribed_date}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </CardBody></Card>
      )}

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <Card><CardBody className="p-0">
          {loading ? <Spinner /> : invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No invoices found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left">Invoice #</th><th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr></thead>
              <tbody>{invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                  <td className="px-4 py-3">{inv.total_amount?.toLocaleString()} EGP</td>
                  <td className="px-4 py-3"><Badge variant={inv.status === 'paid' ? 'success' : 'warning'}>{inv.status}</Badge></td>
                  <td className="px-4 py-3">{inv.created_at?.split('T')[0]}</td>
                  <td className="px-4 py-3"><Button size="sm" variant="secondary">View</Button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </CardBody></Card>
      )}
    </div>
  );
}
