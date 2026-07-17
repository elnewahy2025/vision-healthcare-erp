import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../lib/api';
import api from '../lib/api';
import { Plus, Search, Loader2, User, X, AlertCircle, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';

const STUDY_TYPES = [
  'X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography',
  'DEXA', 'Fluoroscopy', 'Nuclear Medicine', 'PET Scan', 'Angiography',
];

export default function RadiologyPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
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

  const [newOrder, setNewOrder] = useState({
    patientId: '', studyType: '', bodyPart: '',
    priority: 'routine', clinicalIndication: '',
  });

  useEffect(() => {
    api.get('/radiology/orders').then(r => setOrders(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

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
    setNewOrder(prev => ({ ...prev, patientId: patient.id }));
    setSelectedPatient(patient);
    setSearchResults([]);
    setShowPatientDropdown(false);
    setFormErrors(prev => { const next = { ...prev }; delete next.patientId; return next; });
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    if (!newOrder.patientId) errors.patientId = t('validate.rad.patientRequired');
    if (!newOrder.studyType) errors.studyType = t('validate.rad.studyTypeRequired');
    setFormErrors(errors);
    setTouchedFields({ patientId: true, studyType: true });
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setNewOrder({ patientId: '', studyType: '', bodyPart: '', priority: 'routine', clinicalIndication: '' });
    setSelectedPatient(null);
    setFormErrors({});
    setTouchedFields({});
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    try {
      await api.post('/radiology/orders', {
        patientId: newOrder.patientId,
        studyType: newOrder.studyType,
        bodyPart: newOrder.bodyPart,
        priority: newOrder.priority,
        clinicalIndication: newOrder.clinicalIndication,
      });
      toast.success('Radiology order created');
      setShowNewModal(false);
      resetForm();
      const r = await api.get('/radiology/orders');
      setOrders(r.data.data);
    } catch {
      toast.error('Failed to create radiology order');
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

  const filtered = orders.filter((o: any) =>
    !search || o.patientName?.toLowerCase().includes(search.toLowerCase()) || o.orderNumber?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('radiology.title')}</h1>
          <p className="text-gray-500 mt-1">{orders.length} orders</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('radiology.newOrder')}
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="relative">
            <input type="text" placeholder={`${t('common.search')} orders...`}
              value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" />
            <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('radiology.orderNumber')}</th>
              <th>{t('radiology.patient')}</th>
              <th>{t('radiology.studyType')}</th>
              <th>{t('radiology.bodyPart')}</th>
              <th>{t('radiology.status')}</th>
              <th>{t('radiology.priority')}</th>
              <th>{t('radiology.date')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">{t('radiology.noOrders')}</td></tr>
            ) : filtered.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="font-mono text-xs text-primary-600">{o.orderNumber}</td>
                <td>
                  <p className="font-medium">{o.patientName}</p>
                  <p className="text-xs text-gray-500 font-mono">{o.patientMrn}</p>
                </td>
                <td><span className="badge-info">{o.studyType}</span></td>
                <td>{o.bodyPart || '-'}</td>
                <td><span className={`badge ${o.status === 'completed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-info'}`}>{o.status}</span></td>
                <td><span className={`badge ${o.priority === 'urgent' ? 'badge-danger' : 'badge-info'}`}>{o.priority}</span></td>
                <td className="text-xs">{o.orderDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Order Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => { setShowNewModal(false); resetForm(); }}>
          <div className="modal-content max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between card-header">
              <h2 className="text-lg font-semibold">{t('radiology.newOrder')}</h2>
              <button onClick={() => { setShowNewModal(false); resetForm(); }}
                className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} noValidate>
              <div className="p-6 space-y-4">
                {/* Patient Search */}
                <div ref={patientSearchRef} className="relative">
                  <label className="label">{t('radiology.patient')} *</label>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-gray-400" />
                    <input type="text" className={inputClass('patientId') + ' pl-10'}
                      placeholder="Search patient by name, MRN, or phone..."
                      value={selectedPatient ? `${selectedPatient.name} (${selectedPatient.mrn})` : ''}
                      onChange={e => {
                        setSelectedPatient(null);
                        setNewOrder(prev => ({ ...prev, patientId: '' }));
                        searchPatients(e.target.value);
                      }}
                      onFocus={() => searchResults.length > 0 && setShowPatientDropdown(true)} />
                    {selectedPatient && (
                      <button type="button" onClick={() => { setSelectedPatient(null); setNewOrder(prev => ({ ...prev, patientId: '' })); }}
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

                {/* Study Type & Body Part */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('radiology.studyType')} *</label>
                    <select className={inputClass('studyType')} value={newOrder.studyType}
                      onChange={e => {
                        setNewOrder(prev => ({ ...prev, studyType: e.target.value }));
                        setFormErrors(prev => { const next = { ...prev }; delete next.studyType; return next; });
                      }}
                      onBlur={() => setTouchedFields(prev => ({ ...prev, studyType: true }))}>
                      <option value="">Select study type</option>
                      {STUDY_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {getFieldError('studyType') && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {getFieldError('studyType')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">{t('radiology.bodyPart')}</label>
                    <input type="text" className="input" placeholder="e.g. Chest, Abdomen, Knee..."
                      value={newOrder.bodyPart}
                      onChange={e => setNewOrder(prev => ({ ...prev, bodyPart: e.target.value }))} />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="label">{t('radiology.priority')}</label>
                  <select className="input" value={newOrder.priority}
                    onChange={e => setNewOrder(prev => ({ ...prev, priority: e.target.value }))}>
                    <option value="routine">{t('lab.routine')}</option>
                    <option value="urgent">{t('lab.urgent')}</option>
                    <option value="stat">{t('lab.stat')}</option>
                  </select>
                </div>

                {/* Clinical Indication */}
                <div>
                  <label className="label">{t('radiology.clinicalIndication')}</label>
                  <textarea className="input" rows={3}
                    placeholder="Reason for study, symptoms, relevant history..."
                    value={newOrder.clinicalIndication}
                    onChange={e => setNewOrder(prev => ({ ...prev, clinicalIndication: e.target.value }))} />
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
