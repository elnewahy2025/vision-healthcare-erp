import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../lib/api';
import api from '../lib/api';
import { Plus, Search, Loader2, User, X, AlertCircle, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReferralsPage() {
  const { t } = useTranslation();
  const [referrals, setReferrals] = useState<any[]>([]);
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

  const [newRef, setNewRef] = useState({
    patientId: '', referralType: 'specialist', priority: 'normal',
    reason: '', clinicalNotes: '', receivingDoctorId: '',
    externalFacility: '', externalDoctor: '', consentObtained: true,
  });

  const loadReferrals = async () => {
    try {
      const r = await api.get('/referrals');
      setReferrals(r.data.data);
    } catch {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReferrals(); }, []);

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
    setNewRef(prev => ({ ...prev, patientId: patient.id }));
    setSelectedPatient(patient);
    setSearchResults([]);
    setShowPatientDropdown(false);
    setFormErrors(prev => { const next = { ...prev }; delete next.patientId; return next; });
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    if (!newRef.patientId) errors.patientId = t('validate.referral.patientRequired');
    if (!newRef.reason.trim()) errors.reason = t('validate.referral.reasonRequired');
    setFormErrors(errors);
    setTouchedFields({ patientId: true, reason: true });
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setNewRef({
      patientId: '', referralType: 'specialist', priority: 'normal',
      reason: '', clinicalNotes: '', receivingDoctorId: '',
      externalFacility: '', externalDoctor: '', consentObtained: true,
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
      await api.post('/referrals', newRef);
      toast.success('Referral created');
      setShowNewModal(false);
      resetForm();
      await loadReferrals();
    } catch {
      toast.error('Failed to create referral');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field: string) =>
    `input ${formErrors[field] && touchedFields[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`;

  const getFieldError = (field: string) => {
    if (!touchedFields[field]) return undefined;
    return formErrors[field];
  };

  const isExternal = newRef.referralType === 'external';

  const filtered = referrals.filter((r: any) =>
    !search || r.patientName?.toLowerCase().includes(search.toLowerCase()) ||
    r.referralNumber?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('referral.title')}</h1>
          <p className="text-gray-500 mt-1">{referrals.length} referrals</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('referral.newReferral')}
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="relative">
            <input type="text" placeholder={`${t('common.search')} referrals...`}
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
              <th>{t('referral.referralNumber')}</th>
              <th>{t('referral.patient')}</th>
              <th>{t('referral.type')}</th>
              <th>{t('referral.status')}</th>
              <th>{t('referral.priority')}</th>
              <th>{t('referral.date')}</th>
              <th>{t('referral.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">{t('referral.noReferrals')}</td></tr>
            ) : filtered.map((r: any) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="font-mono text-xs text-primary-600">{r.referralNumber}</td>
                <td className="font-medium">{r.patientName}</td>
                <td><span className="badge-info">{t(`referral.${r.referralType}`)}</span></td>
                <td><span className={`badge ${r.status === 'completed' ? 'badge-success' : r.status === 'cancelled' ? 'badge-danger' : 'badge-info'}`}>{r.status}</span></td>
                <td><span className={`badge ${r.priority === 'emergency' ? 'badge-danger' : r.priority === 'urgent' ? 'badge-warning' : 'badge-info'}`}>{r.priority}</span></td>
                <td className="text-xs">{r.referralDate}</td>
                <td><button className="btn-ghost btn-sm"><ArrowLeftRight className="w-3.5 h-3.5" /> View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Referral Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => { setShowNewModal(false); resetForm(); }}>
          <div className="modal-content max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between card-header">
              <h2 className="text-lg font-semibold">{t('referral.newReferral')}</h2>
              <button onClick={() => { setShowNewModal(false); resetForm(); }}
                className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} noValidate>
              <div className="p-6 space-y-4">
                {/* Patient Search */}
                <div ref={patientSearchRef} className="relative">
                  <label className="label">{t('referral.patient')} *</label>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-gray-400" />
                    <input type="text" className={inputClass('patientId') + ' pl-10'}
                      placeholder="Search patient by name, MRN, or phone..."
                      value={selectedPatient ? `${selectedPatient.name} (${selectedPatient.mrn})` : ''}
                      onChange={e => {
                        setSelectedPatient(null);
                        setNewRef(prev => ({ ...prev, patientId: '' }));
                        searchPatients(e.target.value);
                      }}
                      onFocus={() => searchResults.length > 0 && setShowPatientDropdown(true)} />
                    {selectedPatient && (
                      <button type="button" onClick={() => { setSelectedPatient(null); setNewRef(prev => ({ ...prev, patientId: '' })); }}
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

                {/* Type & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('referral.type')}</label>
                    <select className="input" value={newRef.referralType}
                      onChange={e => setNewRef(prev => ({ ...prev, referralType: e.target.value }))}>
                      <option value="specialist">{t('referral.specialist')}</option>
                      <option value="general">{t('referral.general')}</option>
                      <option value="internal">{t('referral.internal')}</option>
                      <option value="external">{t('referral.external')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('referral.priority')}</label>
                    <select className="input" value={newRef.priority}
                      onChange={e => setNewRef(prev => ({ ...prev, priority: e.target.value }))}>
                      <option value="normal">{t('referral.normal')}</option>
                      <option value="urgent">{t('lab.urgent')}</option>
                      <option value="emergency">{t('lab.stat')}</option>
                    </select>
                  </div>
                </div>

                {/* External fields */}
                {isExternal && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="label">{t('referral.externalFacility')}</label>
                      <input className="input" value={newRef.externalFacility}
                        onChange={e => setNewRef(prev => ({ ...prev, externalFacility: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">{t('referral.externalDoctor')}</label>
                      <input className="input" value={newRef.externalDoctor}
                        onChange={e => setNewRef(prev => ({ ...prev, externalDoctor: e.target.value }))} />
                    </div>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="label">{t('referral.reason')} *</label>
                  <textarea className={inputClass('reason')} rows={2}
                    placeholder="Reason for referral..."
                    value={newRef.reason}
                    onChange={e => setNewRef(prev => ({ ...prev, reason: e.target.value }))}
                    onBlur={() => setTouchedFields(prev => ({ ...prev, reason: true }))} />
                  {getFieldError('reason') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />{getFieldError('reason')}
                    </p>
                  )}
                </div>

                {/* Clinical Notes */}
                <div>
                  <label className="label">{t('referral.clinicalNotes')}</label>
                  <textarea className="input" rows={3}
                    placeholder="Relevant history, diagnoses, medications..."
                    value={newRef.clinicalNotes}
                    onChange={e => setNewRef(prev => ({ ...prev, clinicalNotes: e.target.value }))} />
                </div>

                {/* Consent */}
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newRef.consentObtained}
                    onChange={e => setNewRef(prev => ({ ...prev, consentObtained: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600" />
                  <span className="text-sm">{t('referral.consentObtained')}</span>
                </label>
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
