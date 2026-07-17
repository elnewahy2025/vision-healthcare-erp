import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { emrApi, patientsApi } from '../lib/api';
import { Plus, FileText, Search, Loader2, User, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmrPage() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [patientFilter, setPatientFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const [newEmr, setNewEmr] = useState({
    patientId: '', encounterType: 'new' as const,
    chiefComplaint: '', subjective: '', objective: '',
    assessment: '', plan: '', notes: '',
    vitals: {
      bloodPressureSystolic: 120, bloodPressureDiastolic: 80,
      heartRate: 72, respiratoryRate: 16, temperature: 37,
      oxygenSaturation: 98, height: 170, weight: 70, painLevel: 0,
    },
    addVitals: false,
  });

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await emrApi.list({ page, limit: 10, patientId: patientFilter || undefined });
      setRecords(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load records'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRecords(); }, [page, patientFilter]);

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
    setNewEmr(prev => ({ ...prev, patientId: patient.id }));
    setSelectedPatient(patient);
    setSearchResults([]);
    setShowSearchDropdown(false);
    setFormErrors(prev => { const next = { ...prev }; delete next.patientId; return next; });
  };

  const validateVitals = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    const v = newEmr.vitals;
    if (v.bloodPressureSystolic < 50 || v.bloodPressureSystolic > 300) errors['vitals.bpSystolic'] = t('validate.vitals.bloodPressure');
    if (v.bloodPressureDiastolic < 30 || v.bloodPressureDiastolic > 200) errors['vitals.bpDiastolic'] = t('validate.vitals.bloodPressure');
    if (v.heartRate < 30 || v.heartRate > 250) errors['vitals.heartRate'] = t('validate.vitals.heartRate');
    if (v.temperature < 30 || v.temperature > 42) errors['vitals.temperature'] = t('validate.vitals.temperature');
    if (v.oxygenSaturation < 0 || v.oxygenSaturation > 100) errors['vitals.o2Sat'] = t('validate.vitals.o2Sat');
    if (v.painLevel < 0 || v.painLevel > 10) errors['vitals.painLevel'] = t('validate.vitals.painLevel');
    if (v.height < 50 || v.height > 250) errors['vitals.height'] = t('validate.vitals.height');
    if (v.weight < 20 || v.weight > 300) errors['vitals.weight'] = t('validate.vitals.weight');
    return errors;
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    if (!newEmr.patientId) errors.patientId = t('validate.patientRequired');
    if (newEmr.addVitals) {
      Object.assign(errors, validateVitals());
    }
    setFormErrors(errors);
    setTouchedFields({ patientId: true });
    return Object.keys(errors).length === 0;
  };

  const handleVitalsChange = (field: string, value: number) => {
    setNewEmr(prev => ({
      ...prev,
      vitals: { ...prev.vitals, [field]: value },
    }));
    if (touchedFields[`vitals.${field}`]) {
      const v = { ...newEmr.vitals, [field]: value };
      let error: string | null = null;
      switch (field) {
        case 'bloodPressureSystolic': if (v.bloodPressureSystolic < 50 || v.bloodPressureSystolic > 300) error = t('validate.vitals.bloodPressure'); break;
        case 'bloodPressureDiastolic': if (v.bloodPressureDiastolic < 30 || v.bloodPressureDiastolic > 200) error = t('validate.vitals.bloodPressure'); break;
        case 'heartRate': if (v.heartRate < 30 || v.heartRate > 250) error = t('validate.vitals.heartRate'); break;
        case 'temperature': if (v.temperature < 30 || v.temperature > 42) error = t('validate.vitals.temperature'); break;
        case 'oxygenSaturation': if (v.oxygenSaturation < 0 || v.oxygenSaturation > 100) error = t('validate.vitals.o2Sat'); break;
        case 'painLevel': if (v.painLevel < 0 || v.painLevel > 10) error = t('validate.vitals.painLevel'); break;
        case 'height': if (v.height < 50 || v.height > 250) error = t('validate.vitals.height'); break;
        case 'weight': if (v.weight < 20 || v.weight > 300) error = t('validate.vitals.weight'); break;
      }
      setFormErrors(prev => {
        const next = { ...prev };
        if (error) next[`vitals.${field}`] = error;
        else delete next[`vitals.${field}`];
        return next;
      });
    }
  };

  const resetForm = () => {
    setNewEmr({
      patientId: '', encounterType: 'new',
      chiefComplaint: '', subjective: '', objective: '',
      assessment: '', plan: '', notes: '',
      vitals: {
        bloodPressureSystolic: 120, bloodPressureDiastolic: 80,
        heartRate: 72, respiratoryRate: 16, temperature: 37,
        oxygenSaturation: 98, height: 170, weight: 70, painLevel: 0,
      },
      addVitals: false,
    });
    setSelectedPatient(null);
    setFormErrors({});
    setTouchedFields({});
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    try {
      await emrApi.create({
        patientId: newEmr.patientId,
        encounterType: newEmr.encounterType,
        chiefComplaint: newEmr.chiefComplaint,
        subjective: newEmr.subjective,
        objective: newEmr.objective,
        assessment: newEmr.assessment,
        plan: newEmr.plan,
        notes: newEmr.notes,
        vitals: newEmr.addVitals ? newEmr.vitals : undefined,
      });
      toast.success('EMR record created');
      setShowNewModal(false);
      resetForm();
      loadRecords();
    } catch { toast.error('Failed to create EMR record'); }
    finally { setSaving(false); }
  };

  const handleSign = async (id: string) => {
    try { await emrApi.sign(id); toast.success('Record signed'); loadRecords(); }
    catch { toast.error('Failed to sign'); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: 'badge-gray', completed: 'badge-info',
      signed: 'badge-success', amended: 'badge-warning',
    };
    return map[s] || 'badge-gray';
  };

  const inputClass = (field: string) =>
    `input ${formErrors[field] && touchedFields[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`;

  const getFieldError = (field: string) => {
    if (!touchedFields[field]) return undefined;
    return formErrors[field];
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('emr.title')}</h1>
          <p className="text-gray-500 mt-1">{pagination.total} records</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('emr.new')}
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('appointment.patient')}</th>
              <th>{t('emr.date')}</th>
              <th>{t('emr.type')}</th>
              <th>{t('emr.chiefComplaint')}</th>
              <th>{t('emr.assessment')}</th>
              <th>{t('common.status')}</th>
              <th>{t('emr.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" /></td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">{t('common.noData')}</td></tr>
            ) : (
              records.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td>
                    <p className="font-medium">{r.patientName}</p>
                    <p className="text-xs text-gray-500 font-mono">{r.patientMrn}</p>
                  </td>
                  <td>{r.encounterDate}</td>
                  <td><span className="badge-info">{r.encounterType}</span></td>
                  <td className="max-w-xs truncate">{r.chiefComplaint || '-'}</td>
                  <td>{r.assessment || '-'}</td>
                  <td><span className={statusBadge(r.status)}>{r.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      {r.status !== 'signed' && (
                        <button onClick={() => handleSign(r.id)} className="btn-ghost btn-sm text-green-600">
                          <FileText className="w-3.5 h-3.5" />
                          Sign
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

      {/* New EMR Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => { setShowNewModal(false); resetForm(); }}>
          <div className="modal-content max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between card-header">
              <h2 className="text-lg font-semibold">{t('emr.newRecord')}</h2>
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
                      value={selectedPatient ? `${selectedPatient.name} (${selectedPatient.mrn})` : ''}
                      onChange={e => {
                        setSelectedPatient(null);
                        setNewEmr(prev => ({ ...prev, patientId: '' }));
                        searchPatients(e.target.value);
                      }}
                      onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                    />
                    {selectedPatient && (
                      <button type="button" onClick={() => { setSelectedPatient(null); setNewEmr(prev => ({ ...prev, patientId: '' })); }}
                        className="absolute top-1/2 -translate-y-1/2 right-3 p-1 rounded hover:bg-gray-100">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                  {showSearchDropdown && searchResults.length > 0 && (
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

                {/* Encounter Type */}
                <div>
                  <label className="label">{t('emr.type')}</label>
                  <select className="input" value={newEmr.encounterType}
                    onChange={e => setNewEmr({...newEmr, encounterType: e.target.value as any})}>
                    <option value="new">New</option>
                    <option value="followup">Follow-up</option>
                    <option value="emergency">Emergency</option>
                    <option value="annual">Annual</option>
                    <option value="preoperative">Pre-operative</option>
                    <option value="postoperative">Post-operative</option>
                    <option value="telemedicine">{t('appointment.virtual')}</option>
                  </select>
                </div>

                {/* SOAP Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('emr.chiefComplaint')}</label>
                    <textarea className="input" rows={2} value={newEmr.chiefComplaint}
                      onChange={e => setNewEmr({...newEmr, chiefComplaint: e.target.value})}
                      placeholder="Patient's main complaint..." />
                  </div>
                  <div>
                    <label className="label">{t('emr.subjective')}</label>
                    <textarea className="input" rows={2} value={newEmr.subjective}
                      onChange={e => setNewEmr({...newEmr, subjective: e.target.value})}
                      placeholder="Patient-reported symptoms..." />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('emr.objective')}</label>
                    <textarea className="input" rows={3} value={newEmr.objective}
                      onChange={e => setNewEmr({...newEmr, objective: e.target.value})}
                      placeholder="Physical exam findings, vitals..." />
                  </div>
                  <div>
                    <label className="label">{t('emr.assessment')}</label>
                    <textarea className="input" rows={3} value={newEmr.assessment}
                      onChange={e => setNewEmr({...newEmr, assessment: e.target.value})}
                      placeholder="Diagnosis, differential..." />
                  </div>
                </div>
                <div>
                  <label className="label">{t('emr.plan')}</label>
                  <textarea className="input" rows={3} value={newEmr.plan}
                    onChange={e => setNewEmr({...newEmr, plan: e.target.value})}
                    placeholder="Treatment plan, medications, follow-up..." />
                </div>

                {/* Vitals Toggle */}
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newEmr.addVitals}
                    onChange={e => setNewEmr({...newEmr, addVitals: e.target.checked})}
                    className="rounded border-gray-300 text-primary-600" />
                  <span className="text-sm font-medium">{t('emr.addVitals')}</span>
                </label>

                {newEmr.addVitals && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="label text-xs">{t('emr.bpSystolic')}</label>
                      <input type="number" min="50" max="300" className={inputClass('vitals.bpSystolic')}
                        value={newEmr.vitals.bloodPressureSystolic}
                        onChange={e => handleVitalsChange('bloodPressureSystolic', Number(e.target.value))}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, 'vitals.bloodPressureSystolic': true }))} />
                      {getFieldError('vitals.bpSystolic') && (
                        <p className="mt-0.5 text-xs text-red-600">{getFieldError('vitals.bpSystolic')}</p>
                      )}
                    </div>
                    <div>
                      <label className="label text-xs">{t('emr.bpDiastolic')}</label>
                      <input type="number" min="30" max="200" className={inputClass('vitals.bpDiastolic')}
                        value={newEmr.vitals.bloodPressureDiastolic}
                        onChange={e => handleVitalsChange('bloodPressureDiastolic', Number(e.target.value))}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, 'vitals.bloodPressureDiastolic': true }))} />
                      {getFieldError('vitals.bpDiastolic') && (
                        <p className="mt-0.5 text-xs text-red-600">{getFieldError('vitals.bpDiastolic')}</p>
                      )}
                    </div>
                    <div>
                      <label className="label text-xs">{t('emr.heartRate')}</label>
                      <input type="number" min="30" max="250" className={inputClass('vitals.heartRate')}
                        value={newEmr.vitals.heartRate}
                        onChange={e => handleVitalsChange('heartRate', Number(e.target.value))}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, 'vitals.heartRate': true }))} />
                      {getFieldError('vitals.heartRate') && (
                        <p className="mt-0.5 text-xs text-red-600">{getFieldError('vitals.heartRate')}</p>
                      )}
                    </div>
                    <div>
                      <label className="label text-xs">{t('emr.respiratoryRate')}</label>
                      <input type="number" min="5" max="60" className="input"
                        value={newEmr.vitals.respiratoryRate}
                        onChange={e => handleVitalsChange('respiratoryRate', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="label text-xs">{t('emr.temperature')}</label>
                      <input type="number" step="0.1" min="30" max="42" className={inputClass('vitals.temperature')}
                        value={newEmr.vitals.temperature}
                        onChange={e => handleVitalsChange('temperature', Number(e.target.value))}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, 'vitals.temperature': true }))} />
                      {getFieldError('vitals.temperature') && (
                        <p className="mt-0.5 text-xs text-red-600">{getFieldError('vitals.temperature')}</p>
                      )}
                    </div>
                    <div>
                      <label className="label text-xs">{t('emr.o2Sat')}</label>
                      <input type="number" min="0" max="100" className={inputClass('vitals.o2Sat')}
                        value={newEmr.vitals.oxygenSaturation}
                        onChange={e => handleVitalsChange('oxygenSaturation', Number(e.target.value))}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, 'vitals.oxygenSaturation': true }))} />
                      {getFieldError('vitals.o2Sat') && (
                        <p className="mt-0.5 text-xs text-red-600">{getFieldError('vitals.o2Sat')}</p>
                      )}
                    </div>
                    <div>
                      <label className="label text-xs">{t('emr.painLevel')}</label>
                      <input type="number" min="0" max="10" className={inputClass('vitals.painLevel')}
                        value={newEmr.vitals.painLevel}
                        onChange={e => handleVitalsChange('painLevel', Number(e.target.value))}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, 'vitals.painLevel': true }))} />
                      {getFieldError('vitals.painLevel') && (
                        <p className="mt-0.5 text-xs text-red-600">{getFieldError('vitals.painLevel')}</p>
                      )}
                    </div>
                    <div>
                      <label className="label text-xs">{t('emr.height')}</label>
                      <input type="number" min="50" max="250" className={inputClass('vitals.height')}
                        value={newEmr.vitals.height}
                        onChange={e => handleVitalsChange('height', Number(e.target.value))}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, 'vitals.height': true }))} />
                      {getFieldError('vitals.height') && (
                        <p className="mt-0.5 text-xs text-red-600">{getFieldError('vitals.height')}</p>
                      )}
                    </div>
                    <div>
                      <label className="label text-xs">{t('emr.weight')}</label>
                      <input type="number" min="20" max="300" className={inputClass('vitals.weight')}
                        value={newEmr.vitals.weight}
                        onChange={e => handleVitalsChange('weight', Number(e.target.value))}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, 'vitals.weight': true }))} />
                      {getFieldError('vitals.weight') && (
                        <p className="mt-0.5 text-xs text-red-600">{getFieldError('vitals.weight')}</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">{t('emr.notes')}</label>
                  <textarea className="input" rows={2} value={newEmr.notes}
                    onChange={e => setNewEmr({...newEmr, notes: e.target.value})} />
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
