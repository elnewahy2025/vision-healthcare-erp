import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../lib/api';
import api from '../lib/api';
import { Plus, Search, Loader2, User, X, AlertCircle, Home } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomeVisitsPage() {
  const { t } = useTranslation();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Patient search
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const [newVisit, setNewVisit] = useState({
    patientId: '', visitType: 'checkup', scheduledDate: '',
    scheduledTime: '', address: '', notes: '',
  });

  const loadVisits = async () => {
    try {
      const r = await api.get('/home-visits');
      setVisits(r.data.data);
    } catch {
      toast.error('Failed to load home visits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVisits(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPatients = (q: string) => {
    if (q.length < 2) { setSearchResults([]); setShowPatientDropdown(false); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try { const results = await patientsApi.search(q); setSearchResults(results); setShowPatientDropdown(true); }
      catch { setSearchResults([]); }
    }, 300);
  };

  const selectPatient = (patient: any) => {
    setNewVisit(prev => ({ ...prev, patientId: patient.id }));
    setSelectedPatient(patient);
    setSearchResults([]);
    setShowPatientDropdown(false);
    setFormErrors(prev => { const next = { ...prev }; delete next.patientId; return next; });
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    if (!newVisit.patientId) errors.patientId = t('validate.homeVisit.patientRequired');
    if (!newVisit.scheduledDate) errors.scheduledDate = t('validate.homeVisit.dateRequired');
    if (!newVisit.address.trim()) errors.address = t('validate.homeVisit.addressRequired');
    setFormErrors(errors);
    setTouchedFields({ patientId: true, scheduledDate: true, address: true });
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setNewVisit({ patientId: '', visitType: 'checkup', scheduledDate: '', scheduledTime: '', address: '', notes: '' });
    setSelectedPatient(null);
    setFormErrors({});
    setTouchedFields({});
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    try {
      await api.post('/home-visits', newVisit);
      toast.success('Home visit scheduled');
      setShowNewModal(false);
      resetForm();
      await loadVisits();
    } catch {
      toast.error('Failed to schedule visit');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!confirm(`Mark visit as ${status}?`)) return;
    try {
      await api.put(`/home-visits/${id}`, { status });
      toast.success(`Visit ${status}`);
      await loadVisits();
    } catch {
      toast.error('Failed to update visit');
    }
  };

  const inputClass = (field: string) =>
    `input ${formErrors[field] && touchedFields[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`;

  const getFieldError = (field: string) => {
    if (!touchedFields[field]) return undefined;
    return formErrors[field];
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;

  const filtered = visits.filter((v: any) =>
    !search || v.patientName?.toLowerCase().includes(search.toLowerCase()) ||
    v.visitNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('homeVisit.title')}</h1>
          <p className="text-gray-500 mt-1">{visits.length} visits</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('homeVisit.schedule')}
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="relative">
            <input type="text" placeholder={`${t('common.search')} visits...`}
              value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" />
            <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('homeVisit.visitNumber')}</th>
              <th>{t('homeVisit.patient')}</th>
              <th>{t('homeVisit.type')}</th>
              <th>{t('homeVisit.date')}</th>
              <th>{t('homeVisit.assignedTo')}</th>
              <th>{t('homeVisit.status')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">{t('homeVisit.noVisits')}</td></tr>
            ) : filtered.map((v: any) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="font-mono text-xs text-primary-600">{v.visitNumber}</td>
                <td className="font-medium">{v.patientName}</td>
                <td><span className="badge-info">{v.visitType}</span></td>
                <td className="text-xs">{v.scheduledDate}{v.scheduledTime ? ` ${v.scheduledTime}` : ''}</td>
                <td>{v.assignedToName || '-'}</td>
                <td><span className={`badge ${v.status === 'completed' ? 'badge-success' : v.status === 'cancelled' ? 'badge-danger' : v.status === 'in_progress' ? 'badge-warning' : 'badge-info'}`}>{v.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    {v.status === 'scheduled' && (
                      <button onClick={() => handleUpdateStatus(v.id, 'in_progress')}
                        className="btn-ghost btn-sm text-blue-600">{t('common.start')}</button>
                    )}
                    {v.status === 'in_progress' && (
                      <button onClick={() => handleUpdateStatus(v.id, 'completed')}
                        className="btn-ghost btn-sm text-green-600">{t('common.complete')}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Schedule Visit Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => { setShowNewModal(false); resetForm(); }}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between card-header">
              <h2 className="text-lg font-semibold">{t('homeVisit.schedule')}</h2>
              <button onClick={() => { setShowNewModal(false); resetForm(); }}
                className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} noValidate>
              <div className="p-6 space-y-4">
                {/* Patient Search */}
                <div ref={patientSearchRef} className="relative">
                  <label className="label">{t('homeVisit.patient')} *</label>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-gray-400" />
                    <input type="text" className={inputClass('patientId') + ' pl-10'}
                      placeholder="Search patient by name, MRN, or phone..."
                      value={selectedPatient ? `${selectedPatient.name} (${selectedPatient.mrn})` : ''}
                      onChange={e => {
                        setSelectedPatient(null);
                        setNewVisit(prev => ({ ...prev, patientId: '' }));
                        searchPatients(e.target.value);
                      }}
                      onFocus={() => searchResults.length > 0 && setShowPatientDropdown(true)} />
                    {selectedPatient && (
                      <button type="button" onClick={() => { setSelectedPatient(null); setNewVisit(prev => ({ ...prev, patientId: '' })); }}
                        className="absolute top-1/2 -translate-y-1/2 right-3 p-1 rounded hover:bg-gray-100">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                  {showPatientDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((p: any) => (
                        <button key={p.id} type="button" onClick={() => selectPatient(p)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3">
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
                      <AlertCircle className="w-3.5 h-3.5" />{getFieldError('patientId')}
                    </p>
                  )}
                </div>

                {/* Visit Type */}
                <div>
                  <label className="label">{t('homeVisit.type')}</label>
                  <select className="input" value={newVisit.visitType}
                    onChange={e => setNewVisit(prev => ({ ...prev, visitType: e.target.value }))}>
                    <option value="checkup">{t('homeVisit.checkup')}</option>
                    <option value="followup">{t('homeVisit.followup')}</option>
                    <option value="emergency">{t('homeVisit.emergency')}</option>
                    <option value="vaccination">{t('homeVisit.vaccination')}</option>
                    <option value="physiotherapy">{t('homeVisit.physiotherapy')}</option>
                  </select>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('homeVisit.date')} *</label>
                    <input type="date" className={inputClass('scheduledDate')}
                      value={newVisit.scheduledDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setNewVisit(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      onBlur={() => setTouchedFields(prev => ({ ...prev, scheduledDate: true }))} />
                    {getFieldError('scheduledDate') && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />{getFieldError('scheduledDate')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">{t('homeVisit.time')}</label>
                    <input type="time" className="input" value={newVisit.scheduledTime}
                      onChange={e => setNewVisit(prev => ({ ...prev, scheduledTime: e.target.value }))} />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="label">{t('homeVisit.address')} *</label>
                  <textarea className={inputClass('address')} rows={2}
                    placeholder="Full address for the visit..."
                    value={newVisit.address}
                    onChange={e => setNewVisit(prev => ({ ...prev, address: e.target.value }))}
                    onBlur={() => setTouchedFields(prev => ({ ...prev, address: true }))} />
                  {getFieldError('address') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />{getFieldError('address')}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="label">{t('homeVisit.notes')}</label>
                  <textarea className="input" rows={2}
                    placeholder="Special instructions..."
                    value={newVisit.notes}
                    onChange={e => setNewVisit(prev => ({ ...prev, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowNewModal(false); resetForm(); }} className="btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
