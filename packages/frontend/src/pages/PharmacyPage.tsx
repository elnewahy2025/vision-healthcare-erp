import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../lib/api';
import api from '../lib/api';
import { Plus, Package, ListChecks, Search, Loader2, User, X, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PharmacyPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'inventory' | 'prescriptions'>('inventory');
  const [inventory, setInventory] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewDrugModal, setShowNewDrugModal] = useState(false);
  const [showNewRxModal, setShowNewRxModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Drug form
  const [drugForm, setDrugForm] = useState({
    drugName: '', genericName: '', brandName: '', dosageForm: 'tablet',
    strength: '', stockQuantity: 0, reorderLevel: 10, unitPrice: 0,
    batchNumber: '', expiryDate: '', manufacturer: '',
  });
  const [drugErrors, setDrugErrors] = useState<Record<string, string>>({});
  const [drugTouched, setDrugTouched] = useState<Record<string, boolean>>({});

  // Prescription form
  const [rxForm, setRxForm] = useState({
    patientId: '', notes: '',
    items: [] as any[],
  });
  const [rxErrors, setRxErrors] = useState<Record<string, string>>({});
  const [rxTouched, setRxTouched] = useState<Record<string, boolean>>({});

  // Patient search
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drug item form
  const [drugItem, setDrugItem] = useState({
    drugName: '', dosage: '', route: 'oral', frequency: 'daily',
    duration: '', quantity: 1, refills: 0, instructions: '',
  });
  const [drugItemErrors, setDrugItemErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      api.get('/pharmacy/inventory').then(r => setInventory(r.data.data)).catch(() => []),
      api.get('/pharmacy/prescriptions').then(r => setPrescriptions(r.data.data)).catch(() => []),
    ]).finally(() => setLoading(false));
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

  // --- Add Drug ---
  const validateDrug = (): boolean => {
    const errors: Record<string, string> = {};
    if (!drugForm.drugName.trim()) errors.drugName = t('validate.pharmacy.drugNameRequired');
    if (drugForm.stockQuantity < 0) errors.stockQuantity = 'Stock cannot be negative';
    setDrugErrors(errors);
    setDrugTouched({ drugName: true, stockQuantity: true });
    return Object.keys(errors).length === 0;
  };

  const handleCreateDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDrug()) return;
    setSaving(true);
    try {
      await api.post('/pharmacy/inventory', drugForm);
      toast.success('Drug added');
      setShowNewDrugModal(false);
      setDrugForm({ drugName: '', genericName: '', brandName: '', dosageForm: 'tablet', strength: '', stockQuantity: 0, reorderLevel: 10, unitPrice: 0, batchNumber: '', expiryDate: '', manufacturer: '' });
      setDrugErrors({});
      setDrugTouched({});
      const r = await api.get('/pharmacy/inventory');
      setInventory(r.data.data);
    } catch {
      toast.error('Failed to add drug');
    } finally {
      setSaving(false);
    }
  };

  const drugInputClass = (field: string) =>
    `input ${drugErrors[field] && drugTouched[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`;

  // --- New Prescription ---
  const searchPatients = (q: string) => {
    if (q.length < 2) { setPatientSearchResults([]); setShowPatientDropdown(false); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try { const results = await patientsApi.search(q); setPatientSearchResults(results); setShowPatientDropdown(true); }
      catch { setPatientSearchResults([]); }
    }, 300);
  };

  const selectPatient = (patient: any) => {
    setRxForm(prev => ({ ...prev, patientId: patient.id }));
    setSelectedPatient(patient);
    setPatientSearchResults([]);
    setShowPatientDropdown(false);
    setRxErrors(prev => { const next = { ...prev }; delete next.patientId; return next; });
  };

  const addDrugItem = () => {
    if (!drugItem.drugName.trim()) {
      setDrugItemErrors({ drugName: t('validate.pharmacy.drugNameRequired') });
      return;
    }
    setDrugItemErrors({});
    setRxForm(prev => ({ ...prev, items: [...prev.items, { ...drugItem }] }));
    setDrugItem({ drugName: '', dosage: '', route: 'oral', frequency: 'daily', duration: '', quantity: 1, refills: 0, instructions: '' });
    setRxErrors(prev => { const next = { ...prev }; delete next.items; return next; });
  };

  const removeDrugItem = (index: number) => {
    setRxForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const validateRx = (): boolean => {
    const errors: Record<string, string> = {};
    if (!rxForm.patientId) errors.patientId = t('validate.pharmacy.patientRequired');
    if (rxForm.items.length === 0) errors.items = t('validate.pharmacy.itemsRequired');
    setRxErrors(errors);
    setRxTouched({ patientId: true, items: true });
    return Object.keys(errors).length === 0;
  };

  const resetRxForm = () => {
    setRxForm({ patientId: '', notes: '', items: [] });
    setSelectedPatient(null);
    setRxErrors({});
    setRxTouched({});
  };

  const handleCreateRx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRx()) return;
    setSaving(true);
    try {
      await api.post('/pharmacy/prescriptions', {
        patientId: rxForm.patientId,
        notes: rxForm.notes,
        items: rxForm.items,
      });
      toast.success('Prescription created');
      setShowNewRxModal(false);
      resetRxForm();
      const r = await api.get('/pharmacy/prescriptions');
      setPrescriptions(r.data.data);
    } catch {
      toast.error('Failed to create prescription');
    } finally {
      setSaving(false);
    }
  };

  const handleDispense = async (id: string) => {
    if (!confirm('Confirm dispensing this prescription? Stock will be decremented.')) return;
    try {
      await api.post(`/pharmacy/prescriptions/${id}/dispense`, { items: [] });
      toast.success('Prescription dispensed');
      const r = await api.get('/pharmacy/prescriptions');
      setPrescriptions(r.data.data);
    } catch {
      toast.error('Failed to dispense');
    }
  };

  const rxInputClass = (field: string) =>
    `input ${rxErrors[field] && rxTouched[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`;

  const getRxFieldError = (field: string) => {
    if (!rxTouched[field]) return undefined;
    return rxErrors[field];
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('pharmacy.title')}</h1></div>
        <button onClick={() => tab === 'inventory' ? setShowNewDrugModal(true) : setShowNewRxModal(true)}
          className="btn-primary">
          {tab === 'inventory' ? <><Package className="w-4 h-4" /> {t('pharmacy.addDrug')}</> : <><Plus className="w-4 h-4" /> {t('pharmacy.newPrescription')}</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('inventory')}
          className={`btn ${tab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}>
          <Package className="w-4 h-4" /> {t('pharmacy.inventory')} ({inventory.length})
        </button>
        <button onClick={() => setTab('prescriptions')}
          className={`btn ${tab === 'prescriptions' ? 'btn-primary' : 'btn-secondary'}`}>
          <ListChecks className="w-4 h-4" /> {t('pharmacy.prescriptions')} ({prescriptions.length})
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="relative">
            <input type="text" placeholder={`${t('common.search')}...`}
              value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" />
            <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('pharmacy.drugName')}</th>
                <th>{t('pharmacy.genericName')}</th>
                <th>{t('pharmacy.stock')}</th>
                <th>{t('pharmacy.reorderLevel')}</th>
                <th>{t('pharmacy.price')}</th>
                <th>{t('pharmacy.expiry')}</th>
                <th>{t('pharmacy.status')}</th>
              </tr>
            </thead>
            <tbody>
              {inventory.filter((d: any) => !search || d.drugName?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">{t('pharmacy.noInventory')}</td></tr>
              ) : inventory.filter((d: any) => !search || d.drugName?.toLowerCase().includes(search.toLowerCase())).map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="font-medium">{d.drugName}</td>
                  <td className="text-xs text-gray-500">{d.genericName || '-'}</td>
                  <td><span className={`font-medium ${d.stockQuantity < d.reorderLevel ? 'text-red-600' : 'text-green-600'}`}>{d.stockQuantity}</span></td>
                  <td className="text-xs">{d.reorderLevel}</td>
                  <td>{d.unitPrice ? d.unitPrice.toFixed(2) + ' EGP' : '-'}</td>
                  <td className="text-xs">{d.expiryDate || '-'}</td>
                  <td><span className={`badge ${d.status === 'active' ? 'badge-success' : 'badge-gray'}`}>{d.status || 'active'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Prescriptions Tab */}
      {tab === 'prescriptions' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('pharmacy.rxNumber')}</th>
                <th>{t('pharmacy.patient')}</th>
                <th>{t('pharmacy.items')}</th>
                <th>{t('pharmacy.status')}</th>
                <th>{t('pharmacy.date')}</th>
                <th>{t('pharmacy.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">{t('pharmacy.noPrescriptions')}</td></tr>
              ) : prescriptions.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="font-mono text-xs text-primary-600">{p.prescriptionNumber}</td>
                  <td className="font-medium">{p.patientName}</td>
                  <td>{p.items?.length || 0} items</td>
                  <td><span className={`badge ${p.status === 'dispensed' ? 'badge-success' : 'badge-info'}`}>{p.status}</span></td>
                  <td className="text-xs">{p.createdAt?.split('T')[0]}</td>
                  <td>
                    {p.status !== 'dispensed' && (
                      <button onClick={() => handleDispense(p.id)} className="btn-ghost btn-sm text-green-600">
                        {t('pharmacy.dispense')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Drug Modal */}
      {showNewDrugModal && (
        <div className="modal-overlay" onClick={() => setShowNewDrugModal(false)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between card-header">
              <h2 className="text-lg font-semibold">{t('pharmacy.addDrug')}</h2>
              <button onClick={() => setShowNewDrugModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateDrug} noValidate>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('pharmacy.drugName')} *</label>
                    <input className={drugInputClass('drugName')} value={drugForm.drugName}
                      onChange={e => setDrugForm(prev => ({ ...prev, drugName: e.target.value }))}
                      onBlur={() => setDrugTouched(prev => ({ ...prev, drugName: true }))} required />
                    {drugErrors.drugName && drugTouched.drugName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />{drugErrors.drugName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">{t('pharmacy.genericName')}</label>
                    <input className="input" value={drugForm.genericName}
                      onChange={e => setDrugForm(prev => ({ ...prev, genericName: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">{t('pharmacy.brandName')}</label>
                    <input className="input" value={drugForm.brandName}
                      onChange={e => setDrugForm(prev => ({ ...prev, brandName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">{t('pharmacy.dosageForm')}</label>
                    <select className="input" value={drugForm.dosageForm}
                      onChange={e => setDrugForm(prev => ({ ...prev, dosageForm: e.target.value }))}>
                      <option value="tablet">Tablet</option>
                      <option value="capsule">Capsule</option>
                      <option value="syrup">Syrup</option>
                      <option value="injection">Injection</option>
                      <option value="cream">Cream</option>
                      <option value="drops">Drops</option>
                      <option value="inhaler">Inhaler</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('pharmacy.strength')}</label>
                    <input className="input" placeholder="e.g. 500mg" value={drugForm.strength}
                      onChange={e => setDrugForm(prev => ({ ...prev, strength: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">{t('pharmacy.stock')} *</label>
                    <input type="number" min="0" className={drugInputClass('stockQuantity')}
                      value={drugForm.stockQuantity}
                      onChange={e => setDrugForm(prev => ({ ...prev, stockQuantity: Number(e.target.value) }))}
                      onBlur={() => setDrugTouched(prev => ({ ...prev, stockQuantity: true }))} required />
                    {drugErrors.stockQuantity && drugTouched.stockQuantity && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />{drugErrors.stockQuantity}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">{t('pharmacy.reorderLevel')}</label>
                    <input type="number" min="0" className="input" value={drugForm.reorderLevel}
                      onChange={e => setDrugForm(prev => ({ ...prev, reorderLevel: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="label">{t('pharmacy.price')} (EGP)</label>
                    <input type="number" min="0" step="0.01" className="input" value={drugForm.unitPrice}
                      onChange={e => setDrugForm(prev => ({ ...prev, unitPrice: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">{t('pharmacy.batchNumber')}</label>
                    <input className="input" value={drugForm.batchNumber}
                      onChange={e => setDrugForm(prev => ({ ...prev, batchNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">{t('pharmacy.expiry')}</label>
                    <input type="date" className="input" value={drugForm.expiryDate}
                      onChange={e => setDrugForm(prev => ({ ...prev, expiryDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">{t('pharmacy.manufacturer')}</label>
                    <input className="input" value={drugForm.manufacturer}
                      onChange={e => setDrugForm(prev => ({ ...prev, manufacturer: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowNewDrugModal(false)} className="btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Prescription Modal */}
      {showNewRxModal && (
        <div className="modal-overlay" onClick={() => { setShowNewRxModal(false); resetRxForm(); }}>
          <div className="modal-content max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between card-header">
              <h2 className="text-lg font-semibold">{t('pharmacy.newPrescription')}</h2>
              <button onClick={() => { setShowNewRxModal(false); resetRxForm(); }}
                className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateRx} noValidate>
              <div className="p-6 space-y-4">
                {/* Patient Search */}
                <div ref={patientSearchRef} className="relative">
                  <label className="label">{t('pharmacy.patient')} *</label>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-gray-400" />
                    <input type="text" className={rxInputClass('patientId') + ' pl-10'}
                      placeholder="Search patient by name, MRN, or phone..."
                      value={selectedPatient ? `${selectedPatient.name} (${selectedPatient.mrn})` : ''}
                      onChange={e => {
                        setSelectedPatient(null);
                        setRxForm(prev => ({ ...prev, patientId: '' }));
                        searchPatients(e.target.value);
                      }}
                      onFocus={() => patientSearchResults.length > 0 && setShowPatientDropdown(true)} />
                    {selectedPatient && (
                      <button type="button" onClick={() => { setSelectedPatient(null); setRxForm(prev => ({ ...prev, patientId: '' })); }}
                        className="absolute top-1/2 -translate-y-1/2 right-3 p-1 rounded hover:bg-gray-100">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                  {showPatientDropdown && patientSearchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {patientSearchResults.map((p: any) => (
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
                  {getRxFieldError('patientId') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />{getRxFieldError('patientId')}
                    </p>
                  )}
                </div>

                {/* Drug Item Form */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">{t('pharmacy.addDrugItem')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">{t('pharmacy.drugName')} *</label>
                      <input className={`input ${drugItemErrors.drugName ? 'border-red-500' : ''}`}
                        value={drugItem.drugName}
                        onChange={e => { setDrugItem(prev => ({ ...prev, drugName: e.target.value })); setDrugItemErrors({}); }} />
                      {drugItemErrors.drugName && (
                        <p className="mt-0.5 text-xs text-red-600">{drugItemErrors.drugName}</p>
                      )}
                    </div>
                    <div>
                      <label className="label text-xs">{t('pharmacy.dosage')}</label>
                      <input className="input" placeholder="e.g. 500mg" value={drugItem.dosage}
                        onChange={e => setDrugItem(prev => ({ ...prev, dosage: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="label text-xs">{t('pharmacy.route')}</label>
                      <select className="input" value={drugItem.route}
                        onChange={e => setDrugItem(prev => ({ ...prev, route: e.target.value }))}>
                        <option value="oral">Oral</option>
                        <option value="iv">IV</option>
                        <option value="im">IM</option>
                        <option value="sc">SC</option>
                        <option value="topical">Topical</option>
                        <option value="rectal">Rectal</option>
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">{t('pharmacy.frequency')}</label>
                      <select className="input" value={drugItem.frequency}
                        onChange={e => setDrugItem(prev => ({ ...prev, frequency: e.target.value }))}>
                        <option value="daily">Daily</option>
                        <option value="twice_daily">Twice Daily</option>
                        <option value="three_times">Three Times</option>
                        <option value="four_times">Four Times</option>
                        <option value="as_needed">As Needed</option>
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">{t('pharmacy.duration')}</label>
                      <input className="input" placeholder="e.g. 7 days" value={drugItem.duration}
                        onChange={e => setDrugItem(prev => ({ ...prev, duration: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label text-xs">{t('pharmacy.quantity')}</label>
                      <input type="number" min="1" className="input" value={drugItem.quantity}
                        onChange={e => setDrugItem(prev => ({ ...prev, quantity: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">{t('pharmacy.refills')}</label>
                      <input type="number" min="0" className="input" value={drugItem.refills}
                        onChange={e => setDrugItem(prev => ({ ...prev, refills: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="label text-xs">{t('pharmacy.instructions')}</label>
                      <input className="input" placeholder="e.g. Take with food" value={drugItem.instructions}
                        onChange={e => setDrugItem(prev => ({ ...prev, instructions: e.target.value }))} />
                    </div>
                  </div>
                  <button type="button" onClick={addDrugItem} className="btn-secondary btn-sm">
                    <Plus className="w-3.5 h-3.5" /> {t('pharmacy.addDrugItem')}
                  </button>
                </div>

                {/* Added Items */}
                {rxForm.items.length > 0 && (
                  <div>
                    <label className="label">{t('pharmacy.drugItems')} ({rxForm.items.length})</label>
                    <div className="space-y-2">
                      {rxForm.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{item.drugName} - {item.dosage}</p>
                            <p className="text-xs text-gray-500">{item.route} | {item.frequency} | {item.duration} | Qty: {item.quantity}</p>
                          </div>
                          <button type="button" onClick={() => removeDrugItem(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {getRxFieldError('items') && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />{getRxFieldError('items')}
                  </p>
                )}

                {/* Notes */}
                <div>
                  <label className="label">{t('pharmacy.notes')}</label>
                  <textarea className="input" rows={2} value={rxForm.notes}
                    onChange={e => setRxForm(prev => ({ ...prev, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowNewRxModal(false); resetRxForm(); }} className="btn-secondary">{t('common.cancel')}</button>
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
