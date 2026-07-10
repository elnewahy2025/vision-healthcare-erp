import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { appointmentsApi, patientsApi } from '../lib/api';
import { Plus, Calendar, Clock, Loader2, Search, X, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AppointmentsPage() {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchPatientQuery, setSearchPatientQuery] = useState('');

  const [newAppointment, setNewAppointment] = useState({
    patientId: '', doctorId: '', branchId: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    startTime: '09:00', duration: 15,
    type: 'consultation' as const,
    reason: '', isWalkIn: false, isVirtual: false,
  });

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await appointmentsApi.list({
        page, limit: 10, date: filterDate || undefined,
        status: filterStatus || undefined,
      });
      setAppointments(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAppointments(); }, [page, filterDate, filterStatus]);

  const searchPatients = async (q: string) => {
    setSearchPatientQuery(q);
    if (q.length < 2) return setSearchResults([]);
    try {
      const results = await patientsApi.search(q);
      setSearchResults(results);
    } catch { setSearchResults([]); }
  };

  const selectPatient = (patient: any) => {
    setNewAppointment({ ...newAppointment, patientId: patient.id });
    setSearchPatientQuery(`${patient.name} (${patient.mrn})`);
    setSearchResults([]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppointment.patientId) { toast.error('Please select a patient'); return; }
    setSaving(true);
    try {
      await appointmentsApi.create(newAppointment);
      toast.success('Appointment created');
      setShowNewModal(false);
      setNewAppointment({
        patientId: '', doctorId: '', branchId: '',
        appointmentDate: new Date().toISOString().split('T')[0],
        startTime: '09:00', duration: 15, type: 'consultation',
        reason: '', isWalkIn: false, isVirtual: false,
      });
      setSearchPatientQuery('');
      loadAppointments();
    } catch {
      toast.error('Failed to create appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckIn = async (id: string) => {
    try { await appointmentsApi.checkIn(id); toast.success('Checked in'); loadAppointments(); }
    catch { toast.error('Failed to check in'); }
  };

  const handleComplete = async (id: string) => {
    try { await appointmentsApi.complete(id); toast.success('Completed'); loadAppointments(); }
    catch { toast.error('Failed to complete'); }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Cancel reason:');
    try { await appointmentsApi.cancel(id, reason || undefined); toast.success('Cancelled'); loadAppointments(); }
    catch { toast.error('Failed to cancel'); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'badge-info', confirmed: 'badge-info',
      checked_in: 'badge-warning', in_progress: 'badge-warning',
      completed: 'badge-success', cancelled: 'badge-danger',
      no_show: 'badge-gray',
    };
    return map[status] || 'badge-gray';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('appointment.title')}</h1>
          <p className="text-gray-500 mt-1">{pagination.total} appointments</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('appointment.new')}
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <div>
              <label className="label">{t('appointment.date')}</label>
              <input type="date" className="input" value={filterDate}
                onChange={e => { setFilterDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="label">{t('common.status')}</label>
              <select className="input" value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                <option value="">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('appointment.patient')}</th>
              <th>{t('appointment.date')}</th>
              <th>{t('appointment.time')}</th>
              <th>{t('appointment.type')}</th>
              <th>{t('appointment.doctor')}</th>
              <th>{t('common.status')}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" /></td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">{t('common.noData')}</td></tr>
            ) : (
              appointments.map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td>
                    <p className="font-medium">{a.patientName}</p>
                    <p className="text-xs text-gray-500 font-mono">{a.patientMrn}</p>
                  </td>
                  <td>{a.appointmentDate}</td>
                  <td>{a.startTime} - {a.endTime}</td>
                  <td><span className="badge-info">{a.type}</span></td>
                  <td>{a.doctorName || '-'}</td>
                  <td><span className={statusBadge(a.status)}>{a.status}</span></td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {a.status === 'scheduled' && (
                        <button onClick={() => handleCheckIn(a.id)} className="btn-ghost btn-sm">Check In</button>
                      )}
                      {a.status === 'checked_in' && (
                        <button onClick={() => handleComplete(a.id)} className="btn-ghost btn-sm text-green-600">Complete</button>
                      )}
                      {(a.status === 'scheduled' || a.status === 'confirmed') && (
                        <button onClick={() => handleCancel(a.id)} className="btn-ghost btn-sm text-red-600">Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Appointment Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <h2 className="text-lg font-semibold">{t('appointment.new')}</h2>
            </div>
            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4">
                {/* Patient Search */}
                <div className="relative">
                  <label className="label">{t('appointment.patient')} *</label>
                  <input
                    className="input"
                    placeholder="Search patient by name, MRN, phone..."
                    value={searchPatientQuery}
                    onChange={e => searchPatients(e.target.value)}
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectPatient(p)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3"
                        >
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.mrn} | {p.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('appointment.date')} *</label>
                    <input type="date" className="input"
                      value={newAppointment.appointmentDate}
                      onChange={e => setNewAppointment({...newAppointment, appointmentDate: e.target.value})} required />
                  </div>
                  <div>
                    <label className="label">{t('appointment.time')} *</label>
                    <input type="time" className="input"
                      value={newAppointment.startTime}
                      onChange={e => setNewAppointment({...newAppointment, startTime: e.target.value})} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('appointment.type')}</label>
                    <select className="input" value={newAppointment.type}
                      onChange={e => setNewAppointment({...newAppointment, type: e.target.value as any})}>
                      <option value="consultation">Consultation</option>
                      <option value="followup">Follow-up</option>
                      <option value="checkup">Check-up</option>
                      <option value="emergency">Emergency</option>
                      <option value="procedure">Procedure</option>
                      <option value="telemedicine">Telemedicine</option>
                      <option value="vaccination">Vaccination</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('appointment.duration')} (min)</label>
                    <select className="input" value={newAppointment.duration}
                      onChange={e => setNewAppointment({...newAppointment, duration: Number(e.target.value)})}>
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">{t('appointment.reason')}</label>
                  <textarea className="input" rows={2} value={newAppointment.reason}
                    onChange={e => setNewAppointment({...newAppointment, reason: e.target.value})} />
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newAppointment.isWalkIn}
                      onChange={e => setNewAppointment({...newAppointment, isWalkIn: e.target.checked})}
                      className="rounded border-gray-300 text-primary-600" />
                    <span className="text-sm">{t('appointment.walkIn')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newAppointment.isVirtual}
                      onChange={e => setNewAppointment({...newAppointment, isVirtual: e.target.checked})}
                      className="rounded border-gray-300 text-primary-600" />
                    <span className="text-sm">{t('appointment.virtual')}</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowNewModal(false)} className="btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
