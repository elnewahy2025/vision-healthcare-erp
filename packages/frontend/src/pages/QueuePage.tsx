import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../lib/api';
import api from '../lib/api';
import { ListOrdered, SkipForward, CheckCircle, XCircle, Plus, Search, Loader2, User, X, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QueuePage() {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Patient search
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const [newEntry, setNewEntry] = useState({
    patientId: '', serviceType: 'consultation', priority: 0,
  });

  const loadQueue = async () => {
    try {
      const r = await api.get('/queue');
      setQueue(r.data.data);
    } catch {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQueue(); }, []);

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
    setNewEntry(prev => ({ ...prev, patientId: patient.id }));
    setSelectedPatient(patient);
    setSearchResults([]);
    setShowPatientDropdown(false);
    setFormErrors(prev => { const next = { ...prev }; delete next.patientId; return next; });
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    if (!newEntry.patientId) errors.patientId = t('validate.queue.patientRequired');
    setFormErrors(errors);
    setTouchedFields({ patientId: true });
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setNewEntry({ patientId: '', serviceType: 'consultation', priority: 0 });
    setSelectedPatient(null);
    setFormErrors({});
    setTouchedFields({});
  };

  const handleAddToQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    try {
      await api.post('/queue', {
        patientId: newEntry.patientId,
        serviceType: newEntry.serviceType,
        priority: newEntry.priority,
      });
      toast.success('Patient added to queue');
      setShowAddModal(false);
      resetForm();
      await loadQueue();
    } catch {
      toast.error('Failed to add to queue');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const confirmMsg = status === 'completed' ? 'Mark this patient as completed?' :
                       status === 'skipped' ? 'Skip this patient?' :
                       'Call this patient now?';
    if (!confirm(confirmMsg)) return;
    setActionLoading(id);
    try {
      await api.put(`/queue/${id}/status`, { status });
      toast.success(status === 'completed' ? 'Completed' : status === 'skipped' ? 'Skipped' : 'Called');
      await loadQueue();
    } catch {
      toast.error('Failed to update queue');
    } finally {
      setActionLoading(null);
    }
  };

  const inputClass = (field: string) =>
    `input ${formErrors[field] && touchedFields[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`;

  const getFieldError = (field: string) => {
    if (!touchedFields[field]) return undefined;
    return formErrors[field];
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;

  const waiting = queue.filter((e: any) => e.status === 'waiting');
  const inProgress = queue.filter((e: any) => e.status === 'in_progress');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('queue.title')}</h1>
          <p className="text-gray-500 mt-1">{waiting.length} waiting, {inProgress.length} in progress</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('queue.addToQueue')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiting Column */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-primary-600" />
              {t('queue.waiting')} ({waiting.length})
            </h3>
          </div>
          <div className="card-body">
            {waiting.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('queue.queueEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {waiting.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-lg font-bold text-primary-600 w-8 text-center">{e.position}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{e.patientName}</p>
                        <span className="font-mono text-xs text-gray-400">{e.queueNumber}</span>
                      </div>
                      <p className="text-xs text-gray-500">{e.serviceType}</p>
                    </div>
                    <button onClick={() => updateStatus(e.id, 'in_progress')}
                      disabled={actionLoading === e.id}
                      className="btn-primary btn-sm">
                      {actionLoading === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SkipForward className="w-3 h-3" />}
                      {t('queue.call')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {t('queue.inProgress')} ({inProgress.length})
            </h3>
          </div>
          <div className="card-body">
            {inProgress.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('queue.noActiveVisits')}</p>
            ) : (
              <div className="space-y-2">
                {inProgress.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{e.patientName}</p>
                        <span className="font-mono text-xs text-gray-400">{e.queueNumber}</span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {e.serviceType}
                        {e.startedAt && <span className="ml-1">• {new Date(e.startedAt).toLocaleTimeString()}</span>}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => updateStatus(e.id, 'completed')}
                        disabled={actionLoading === e.id}
                        className="btn-ghost btn-sm text-green-600">
                        {actionLoading === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        {t('queue.done')}
                      </button>
                      <button onClick={() => updateStatus(e.id, 'skipped')}
                        disabled={actionLoading === e.id}
                        className="btn-ghost btn-sm text-gray-500">
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add to Queue Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); resetForm(); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between card-header">
              <h2 className="text-lg font-semibold">{t('queue.addToQueue')}</h2>
              <button onClick={() => { setShowAddModal(false); resetForm(); }}
                className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddToQueue} noValidate>
              <div className="p-6 space-y-4">
                {/* Patient Search */}
                <div ref={patientSearchRef} className="relative">
                  <label className="label">{t('queue.patient')} *</label>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-gray-400" />
                    <input type="text" className={inputClass('patientId') + ' pl-10'}
                      placeholder="Search patient by name, MRN, or phone..."
                      value={selectedPatient ? `${selectedPatient.name} (${selectedPatient.mrn})` : ''}
                      onChange={e => {
                        setSelectedPatient(null);
                        setNewEntry(prev => ({ ...prev, patientId: '' }));
                        searchPatients(e.target.value);
                      }}
                      onFocus={() => searchResults.length > 0 && setShowPatientDropdown(true)} />
                    {selectedPatient && (
                      <button type="button" onClick={() => { setSelectedPatient(null); setNewEntry(prev => ({ ...prev, patientId: '' })); }}
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
                      <AlertCircle className="w-3.5 h-3.5" />
                      {getFieldError('patientId')}
                    </p>
                  )}
                </div>

                {/* Service Type & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('queue.serviceType')}</label>
                    <select className="input" value={newEntry.serviceType}
                      onChange={e => setNewEntry(prev => ({ ...prev, serviceType: e.target.value }))}>
                      <option value="consultation">Consultation</option>
                      <option value="followup">Follow-up</option>
                      <option value="emergency">Emergency</option>
                      <option value="lab">Laboratory</option>
                      <option value="radiology">Radiology</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="vaccination">Vaccination</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Priority</label>
                    <select className="input" value={newEntry.priority}
                      onChange={e => setNewEntry(prev => ({ ...prev, priority: Number(e.target.value) }))}>
                      <option value={0}>Normal</option>
                      <option value={1}>High</option>
                      <option value={2}>Urgent</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('queue.addToQueue')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
