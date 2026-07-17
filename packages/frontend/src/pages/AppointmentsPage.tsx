import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { appointmentsApi, patientsApi } from '../lib/api';
import { isValidTime, isFutureDate } from '../lib/validators';
import { Plus, Loader2, Search, X, User, AlertCircle, CalendarCheck, CheckCircle2, Ban } from 'lucide-react';
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
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

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

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPatients = (q: string) => {
    setSearchPatientQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await patientsApi.search(q);
        setSearchResults(results);
        setShowSearchDropdown(true);
      } catch {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 300);
  };

  const selectPatient = (patient: any) => {
    setNewAppointment(prev => ({ ...prev, patientId: patient.id }));
    setSearchPatientQuery(`${patient.name} (${patient.mrn})`);
    setSearchResults([]);
    setShowSearchDropdown(false);
    // Clear patient error
    setFormErrors(prev => { const next = { ...prev }; delete next.patientId; return next; });
  };

  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'patientId':
        return !value ? t('validate.selectPatient') : null;
      case 'appointmentDate':
        if (!value) return t('validate.required');
        if (!isFutureDate(value) && value !== new Date().toISOString().split('T')[0]) {
          return t('validate.futureDate');
        }
        return null;
      case 'startTime':
        if (!value) return t('validate.required');
        if (!isValidTime(value)) return t('validate.invalidTime');
        return null;
      default:
        return null;
    }
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    const requiredFields = ['patientId', 'appointmentDate', 'startTime'] as const;
    for (const field of requiredFields) {
      const error = validateField(field, (newAppointment as any)[field]);
      if (error) errors[field] = error;
    }
    setFormErrors(errors);
    setTouchedFields({ patientId: true, appointmentDate: true, startTime: true });
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (field: string, value: any) => {
    setNewAppointment(prev => ({ ...prev, [field]: value }));
    if (touchedFields[field]) {
      const error = validateField(field, value);
      setFormErrors(prev => {
        const next = { ...prev };
        if (error) next[field] = error;
        else delete next[field];
        return next;
      });
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, (newAppointment as any)[field]);
    setFormErrors(prev => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  const resetForm = () => {
    setNewAppointment({
      patientId: '', doctorId: '', branchId: '',
      appointmentDate: new Date().toISOString().split('T')[0],
      startTime: '09:00', duration: 15, type: 'consultation',
      reason: '', isWalkIn: false, isVirtual: false,
    });
    setSearchPatientQuery('');
    setFormErrors({});
    setTouchedFields({});
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    try {
      await appointmentsApi.create(newAppointment);
      toast.success('Appointment created');
      setShowNewModal(false);
      resetForm();
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
    if (reason === null) return; // user pressed Cancel
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

  const getFieldError = (field: string) => {
    if (!touchedFields[field]) return undefined;
    return formErrors[field];
  };

  const inputClass = (field: string) =>
    `input ${formErrors[field] && touchedFields[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`;

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
                <option value="">{t('common.filter')}</option>
                <option value="scheduled">{t('appointment.status.scheduled')}</option>
                <option value="confirmed">{t('appointment.status.confirmed')}</option>
                <option value="checked_in">{t('appointment.status.checkedIn')}</option>
                <option value="in_progress">{t('appointment.status.inProgress')}</option>
                <option value="completed">{t('appointment.status.completed')}</option>
                <option value="cancelled">{t('appointment.status.cancelled')}</option>
                <option value="no_show">{t('appointment.status.noShow')}</option>
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
              <th>{t('common.actions')}</th>
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
                        <button onClick={() => handleCheckIn(a.id)} className="btn-ghost btn-sm">
                          <CalendarCheck className="w-3.5 h-3.5" />
                          {t('appointment.status.checkedIn')}
                        </button>
                      )}
                      {a.status === 'checked_in' && (
                        <button onClick={() => handleComplete(a.id)} className="btn-ghost btn-sm text-green-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('appointment.status.completed')}
                        </button>
                      )}
                      {(a.status === 'scheduled' || a.status === 'confirmed') && (
                        <button onClick={() => handleCancel(a.id)} className="btn-ghost btn-sm text-red-600">
                          <Ban className="w-3.5 h-3.5" />
                          {t('appointment.status.cancelled')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-secondary btn-sm">←</button>
          <span className="text-sm text-gray-600">Page {page} / {pagination.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages} className="btn-secondary btn-sm">→</button>
        </div>
      )}

      {/* New Appointment Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between card-header">
              <h2 className="text-lg font-semibold">{t('appointment.new')}</h2>
              <button onClick={() => { setShowNewModal(false); resetForm(); }}
                className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} noValidate>
              <div className="p-6 space-y-4">
                {/* Patient Search */}
                <div ref={searchRef} className="relative">
                  <label className="label">{t('appointment.patient')} *</label>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      className={inputClass('patientId') + ' pl-10'}
                      placeholder="Search patient by name, MRN, or phone..."
                      value={searchPatientQuery}
                      onChange={e => searchPatients(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                    />
                    {searchPatientQuery && (
                      <button type="button" onClick={() => { setSearchPatientQuery(''); setSearchResults([]); setShowSearchDropdown(false); setNewAppointment(prev => ({ ...prev, patientId: '' })); }}
                        className="absolute top-1/2 -translate-y-1/2 right-3 p-1 rounded hover:bg-gray-100">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                  {showSearchDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
                  {getFieldError('patientId') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {getFieldError('patientId')}
                    </p>
                  )}
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('appointment.date')} *</label>
                    <input type="date" className={inputClass('appointmentDate')}
                      value={newAppointment.appointmentDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => handleFieldChange('appointmentDate', e.target.value)}
                      onBlur={() => handleFieldBlur('appointmentDate')} required />
                    {getFieldError('appointmentDate') && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {getFieldError('appointmentDate')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">{t('appointment.time')} *</label>
                    <input type="time" className={inputClass('startTime')}
                      value={newAppointment.startTime}
                      onChange={e => handleFieldChange('startTime', e.target.value)}
                      onBlur={() => handleFieldBlur('startTime')} required />
                    {getFieldError('startTime') && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {getFieldError('startTime')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Type & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('appointment.type')}</label>
                    <select className="input" value={newAppointment.type}
                      onChange={e => handleFieldChange('type', e.target.value)}>
                      <option value="consultation">{t('appointment.type')}</option>
                      <option value="followup">{t('appointment.status.scheduled')} - Follow-up</option>
                      <option value="checkup">Check-up</option>
                      <option value="emergency">Emergency</option>
                      <option value="procedure">Procedure</option>
                      <option value="telemedicine">{t('appointment.virtual')}</option>
                      <option value="vaccination">Vaccination</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('appointment.duration')} (min)</label>
                    <select className="input" value={newAppointment.duration}
                      onChange={e => handleFieldChange('duration', Number(e.target.value))}>
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="label">{t('appointment.reason')}</label>
                  <textarea className="input" rows={2}
                    placeholder={t('appointment.reasonPlaceholder')}
                    value={newAppointment.reason}
                    onChange={e => handleFieldChange('reason', e.target.value)} />
                </div>

                {/* Checkboxes */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newAppointment.isWalkIn}
                      onChange={e => handleFieldChange('isWalkIn', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600" />
                    <span className="text-sm">{t('appointment.walkIn')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newAppointment.isVirtual}
                      onChange={e => handleFieldChange('isVirtual', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600" />
                    <span className="text-sm">{t('appointment.virtual')}</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowNewModal(false); resetForm(); }} className="btn-secondary">{t('common.cancel')}</button>
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
