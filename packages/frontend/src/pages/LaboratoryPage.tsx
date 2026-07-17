import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../lib/api';
import api from '../lib/api';
import { Plus, Search, Loader2, User, X, AlertCircle, FlaskConical, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LaboratoryPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);

  // Patient search
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const [newOrder, setNewOrder] = useState({
    patientId: '', priority: 'routine',
    clinicalNotes: '', tests: [] as any[],
  });

  useEffect(() => {
    Promise.all([
      api.get('/lab/orders').then(r => setOrders(r.data.data)).catch(() => {}),
      api.get('/lab/catalog').then(r => setCatalog(r.data.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) {
        setShowCatalogDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPatients = (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      setShowPatientDropdown(false);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await patientsApi.search(q);
        setSearchResults(results);
        setShowPatientDropdown(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);
  };

  const selectPatient = (patient: any) => {
    setNewOrder(prev => ({ ...prev, patientId: patient.id }));
    setSelectedPatient(patient);
    setSearchResults([]);
    setShowPatientDropdown(false);
    setFormErrors(prev => { const next = { ...prev }; delete next.patientId; return next; });
  };

  const filteredCatalog = catalog.filter(c =>
    !catalogSearch || c.testName?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    c.testCode?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    c.category?.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const addTest = (test: any) => {
    if (newOrder.tests.some(t => t.testCode === test.testCode)) {
      toast.error('Test already added');
      return;
    }
    setNewOrder(prev => ({
      ...prev,
      tests: [...prev.tests, {
        testCode: test.testCode, testName: test.testName,
        specimenType: test.specimenType, referenceRange: test.referenceRange, unit: test.unit,
      }],
    }));
    setCatalogSearch('');
    setShowCatalogDropdown(false);
    setFormErrors(prev => { const next = { ...prev }; delete next.tests; return next; });
  };

  const removeTest = (index: number) => {
    setNewOrder(prev => ({
      ...prev,
      tests: prev.tests.filter((_, i) => i !== index),
    }));
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    if (!newOrder.patientId) errors.patientId = t('validate.lab.patientRequired');
    if (!newOrder.priority) errors.priority = t('validate.lab.priorityRequired');
    if (newOrder.tests.length === 0) errors.tests = t('validate.lab.testsRequired');
    setFormErrors(errors);
    setTouchedFields({ patientId: true, priority: true, tests: true });
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setNewOrder({ patientId: '', priority: 'routine', clinicalNotes: '', tests: [] });
    setSelectedPatient(null);
    setFormErrors({});
    setTouchedFields({});
    setCatalogSearch('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    try {
      await api.post('/lab/orders', {
        patientId: newOrder.patientId,
        priority: newOrder.priority,
        clinicalNotes: newOrder.clinicalNotes,
        tests: newOrder.tests,
      });
      toast.success('Lab order created');
      setShowNewModal(false);
      resetForm();
      // Reload orders
      const r = await api.get('/lab/orders');
      setOrders(r.data.data);
    } catch {
      toast.error('Failed to create lab order');
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
          <h1 className="page-title">{t('lab.title')}</h1>
          <p className="text-gray-500 mt-1">{orders.length} orders</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('lab.newOrder')}
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
              <th>{t('lab.orderNumber')}</th>
              <th>{t('lab.patient')}</th>
              <th>{t('lab.status')}</th>
              <th>{t('lab.priority')}</th>
              <th>{t('lab.date')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-500">{t('lab.noOrders')}</td></tr>
            ) : filtered.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="font-mono text-xs text-primary-600">{o.orderNumber}</td>
                <td>
                  <p className="font-medium">{o.patientName}</p>
                  <p className="text-xs text-gray-500 font-mono">{o.patientMrn}</p>
                </td>
                <td><span className={`badge ${o.status === 'completed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-info'}`}>{o.status}</span></td>
                <td><span className={`badge ${o.priority === 'urgent' ? 'badge-danger' : o.priority === 'stat' ? 'badge-warning' : 'badge-info'}`}>{t(`lab.${o.priority}`)}</span></td>
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
              <h2 className="text-lg font-semibold">{t('lab.newOrder')}</h2>
              <button onClick={() => { setShowNewModal(false); resetForm(); }}
                className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} noValidate>
              <div className="p-6 space-y-4">
                {/* Patient Search */}
                <div ref={patientSearchRef} className="relative">
                  <label className="label">{t('lab.patient')} *</label>
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

                {/* Priority */}
                <div>
                  <label className="label">{t('lab.priority')} *</label>
                  <select className={inputClass('priority')} value={newOrder.priority}
                    onChange={e => {
                      setNewOrder(prev => ({ ...prev, priority: e.target.value }));
                      setFormErrors(prev => { const next = { ...prev }; delete next.priority; return next; });
                    }}
                    onBlur={() => setTouchedFields(prev => ({ ...prev, priority: true }))}>
                    <option value="routine">{t('lab.routine')}</option>
                    <option value="urgent">{t('lab.urgent')}</option>
                    <option value="stat">{t('lab.stat')}</option>
                  </select>
                  {getFieldError('priority') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {getFieldError('priority')}
                    </p>
                  )}
                </div>

                {/* Test Selection */}
                <div ref={catalogRef} className="relative">
                  <label className="label">{t('lab.selectTests')} *</label>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-gray-400" />
                    <input type="text" className="input pl-10" placeholder={t('lab.searchTests')}
                      value={catalogSearch}
                      onChange={e => {
                        setCatalogSearch(e.target.value);
                        if (e.target.value.length >= 1) setShowCatalogDropdown(true);
                        else setShowCatalogDropdown(false);
                      }}
                      onFocus={() => catalogSearch.length >= 1 && setShowCatalogDropdown(true)} />
                  </div>
                  {showCatalogDropdown && filteredCatalog.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCatalog.slice(0, 20).map((c: any) => (
                        <button key={c.testCode} type="button" onClick={() => addTest(c)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{c.testName}</p>
                            <p className="text-xs text-gray-500">{c.testCode} | {c.category} | {c.specimenType}</p>
                          </div>
                          <Plus className="w-4 h-4 text-primary-600" />
                        </button>
                      ))}
                    </div>
                  )}
                  {showCatalogDropdown && filteredCatalog.length === 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                      {t('lab.noResults')}
                    </div>
                  )}
                  {getFieldError('tests') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {getFieldError('tests')}
                    </p>
                  )}
                </div>

                {/* Added Tests */}
                {newOrder.tests.length > 0 && (
                  <div>
                    <label className="label">{t('lab.addedTests')} ({newOrder.tests.length})</label>
                    <div className="space-y-2">
                      {newOrder.tests.map((test, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{test.testName}</p>
                            <p className="text-xs text-gray-500">{test.testCode} | {test.specimenType}</p>
                          </div>
                          <button type="button" onClick={() => removeTest(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clinical Notes */}
                <div>
                  <label className="label">{t('lab.clinicalNotes')}</label>
                  <textarea className="input" rows={2} value={newOrder.clinicalNotes}
                    onChange={e => setNewOrder(prev => ({ ...prev, clinicalNotes: e.target.value }))}
                    placeholder="Clinical indication for tests..." />
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
