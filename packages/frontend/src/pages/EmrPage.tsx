import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { emrApi, patientsApi } from '../lib/api';
import { Plus, FileText, Search, Loader2, User, Calendar, Activity } from 'lucide-react';
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

  const searchPatients = async (q: string) => {
    if (q.length < 2) return setSearchResults([]);
    try { setSearchResults(await patientsApi.search(q)); }
    catch { setSearchResults([]); }
  };

  const selectPatient = (patient: any) => {
    setNewEmr({ ...newEmr, patientId: patient.id });
    setSelectedPatient(patient);
    setSearchResults([]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmr.patientId) { toast.error('Select a patient'); return; }
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
      setSelectedPatient(null);
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

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('appointment.patient')}</th>
              <th>Date</th>
              <th>Type</th>
              <th>Chief Complaint</th>
              <th>Diagnosis</th>
              <th>{t('common.status')}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
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
                  <td>{r.diagnosis?.length || 0} dx</td>
                  <td><span className={statusBadge(r.status)}>{r.status}</span></td>
                  <td>
                    {r.status === 'draft' && (
                      <button onClick={() => handleSign(r.id)} className="btn-ghost btn-sm">Sign</button>
                    )}
                    <button className="btn-ghost btn-sm">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New EMR Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="card-header"><h2 className="text-lg font-semibold">{t('emr.new')}</h2></div>
            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Patient Search */}
                <div className="relative">
                  <label className="label">{t('appointment.patient')} *</label>
                  {selectedPatient ? (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium">{selectedPatient.name}</span>
                      <span className="text-xs text-gray-500 font-mono">{selectedPatient.mrn}</span>
                      <button type="button" onClick={() => { setSelectedPatient(null); setNewEmr({...newEmr, patientId: ''}); }}
                        className="mr-auto text-red-500 text-xs">Change</button>
                    </div>
                  ) : (
                    <>
                      <input className="input" placeholder="Search patient..."
                        onChange={e => searchPatients(e.target.value)} />
                      {searchResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                          {searchResults.map((p: any) => (
                            <button key={p.id} type="button" onClick={() => selectPatient(p)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                              {p.name} - {p.mrn}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Encounter Type</label>
                    <select className="input" value={newEmr.encounterType}
                      onChange={e => setNewEmr({...newEmr, encounterType: e.target.value as any})}>
                      <option value="new">New Patient</option>
                      <option value="followup">Follow-up</option>
                      <option value="emergency">Emergency</option>
                      <option value="annual">Annual</option>
                      <option value="telemedicine">Telemedicine</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Chief Complaint</label>
                  <input className="input" value={newEmr.chiefComplaint}
                    onChange={e => setNewEmr({...newEmr, chiefComplaint: e.target.value})}
                    placeholder="Patient's main concern" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Subjective (S)</label>
                    <textarea className="input" rows={3} value={newEmr.subjective}
                      onChange={e => setNewEmr({...newEmr, subjective: e.target.value})}
                      placeholder="Symptoms, history, patient's words..." />
                  </div>
                  <div>
                    <label className="label">Objective (O)</label>
                    <textarea className="input" rows={3} value={newEmr.objective}
                      onChange={e => setNewEmr({...newEmr, objective: e.target.value})}
                      placeholder="Physical exam findings, vitals..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Assessment (A)</label>
                    <textarea className="input" rows={3} value={newEmr.assessment}
                      onChange={e => setNewEmr({...newEmr, assessment: e.target.value})}
                      placeholder="Diagnosis, differential..." />
                  </div>
                  <div>
                    <label className="label">Plan (P)</label>
                    <textarea className="input" rows={3} value={newEmr.plan}
                      onChange={e => setNewEmr({...newEmr, plan: e.target.value})}
                      placeholder="Treatment plan, medications, follow-up..." />
                  </div>
                </div>

                {/* Vitals toggle */}
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newEmr.addVitals}
                    onChange={e => setNewEmr({...newEmr, addVitals: e.target.checked})}
                    className="rounded border-gray-300 text-primary-600" />
                  <span className="text-sm font-medium">Add Vitals</span>
                </label>

                {newEmr.addVitals && (
                  <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg">
                    <div><label className="label text-xs">BP Systolic</label>
                      <input type="number" className="input" value={newEmr.vitals.bloodPressureSystolic}
                        onChange={e => setNewEmr({...newEmr, vitals: {...newEmr.vitals, bloodPressureSystolic: Number(e.target.value)}})} /></div>
                    <div><label className="label text-xs">BP Diastolic</label>
                      <input type="number" className="input" value={newEmr.vitals.bloodPressureDiastolic}
                        onChange={e => setNewEmr({...newEmr, vitals: {...newEmr.vitals, bloodPressureDiastolic: Number(e.target.value)}})} /></div>
                    <div><label className="label text-xs">Heart Rate</label>
                      <input type="number" className="input" value={newEmr.vitals.heartRate}
                        onChange={e => setNewEmr({...newEmr, vitals: {...newEmr.vitals, heartRate: Number(e.target.value)}})} /></div>
                    <div><label className="label text-xs">Temperature</label>
                      <input type="number" step="0.1" className="input" value={newEmr.vitals.temperature}
                        onChange={e => setNewEmr({...newEmr, vitals: {...newEmr.vitals, temperature: Number(e.target.value)}})} /></div>
                    <div><label className="label text-xs">O2 Sat %</label>
                      <input type="number" className="input" value={newEmr.vitals.oxygenSaturation}
                        onChange={e => setNewEmr({...newEmr, vitals: {...newEmr.vitals, oxygenSaturation: Number(e.target.value)}})} /></div>
                    <div><label className="label text-xs">Pain (0-10)</label>
                      <input type="number" min="0" max="10" className="input" value={newEmr.vitals.painLevel}
                        onChange={e => setNewEmr({...newEmr, vitals: {...newEmr.vitals, painLevel: Number(e.target.value)}})} /></div>
                    <div><label className="label text-xs">Height (cm)</label>
                      <input type="number" className="input" value={newEmr.vitals.height}
                        onChange={e => setNewEmr({...newEmr, vitals: {...newEmr.vitals, height: Number(e.target.value)}})} /></div>
                    <div><label className="label text-xs">Weight (kg)</label>
                      <input type="number" className="input" value={newEmr.vitals.weight}
                        onChange={e => setNewEmr({...newEmr, vitals: {...newEmr.vitals, weight: Number(e.target.value)}})} /></div>
                  </div>
                )}

                <div>
                  <label className="label">Additional Notes</label>
                  <textarea className="input" rows={2} value={newEmr.notes}
                    onChange={e => setNewEmr({...newEmr, notes: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t">
                <button type="button" onClick={() => setShowNewModal(false)} className="btn-secondary">{t('common.cancel')}</button>
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
