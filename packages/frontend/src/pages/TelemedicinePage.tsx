import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../lib/api';
import api from '../lib/api';
import { Plus, Search, Loader2, User, X, AlertCircle, Video, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TelemedicinePage() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const [newSession, setNewSession] = useState({
    patientId: '', provider: 'internal', meetingLink: '',
    recordingEnabled: false, notes: '',
  });

  const loadSessions = async () => {
    try { const r = await api.get('/telemedicine/sessions'); setSessions(r.data.data); }
    catch { toast.error('Failed to load sessions'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) setShowPatientDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const searchPatients = (q: string) => {
    if (q.length < 2) { setSearchResults([]); setShowPatientDropdown(false); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try { setSearchResults(await patientsApi.search(q)); setShowPatientDropdown(true); }
      catch { setSearchResults([]); }
    }, 300);
  };

  const selectPatient = (patient: any) => {
    setNewSession(prev => ({ ...prev, patientId: patient.id }));
    setSelectedPatient(patient);
    setSearchResults([]);
    setShowPatientDropdown(false);
    setFormErrors(prev => { const n = { ...prev }; delete n.patientId; return n; });
  };

  const resetForm = () => {
    setNewSession({ patientId: '', provider: 'internal', meetingLink: '', recordingEnabled: false, notes: '' });
    setSelectedPatient(null);
    setFormErrors({});
    setTouchedFields({});
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSession.patientId) {
      setFormErrors({ patientId: t('validate.tele.patientRequired') });
      setTouchedFields({ patientId: true });
      return;
    }
    setSaving(true);
    try {
      await api.post('/telemedicine/sessions', newSession);
      toast.success('Session created');
      setShowNewModal(false);
      resetForm();
      await loadSessions();
    } catch { toast.error('Failed to create session'); }
    finally { setSaving(false); }
  };

  const handleStatus = async (id: string, status: string) => {
    if (!confirm(`Start this session?`)) return;
    try { await api.put(`/telemedicine/sessions/${id}/status`, { status }); toast.success('Session started'); await loadSessions(); }
    catch { toast.error('Failed to update session'); }
  };

  const ic = (f: string) => `input ${formErrors[f] && touchedFields[f] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;

  const filtered = sessions.filter(s => !search || s.patientName?.toLowerCase().includes(search.toLowerCase()) || s.roomName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('tele.title')}</h1><p className="text-gray-500 mt-1">{sessions.length} sessions</p></div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary"><Plus className="w-4 h-4" />{t('tele.newSession')}</button>
      </div>

      <div className="card mb-6"><div className="card-body">
        <div className="relative">
          <input type="text" placeholder={`${t('common.search')} sessions...`} value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" />
          <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-5 h-5 text-gray-400" />
        </div>
      </div></div>

      <div className="table-container">
        <table>
          <thead><tr>
            <th>{t('tele.room')}</th><th>{t('tele.patient')}</th><th>{t('tele.doctor')}</th>
            <th>{t('tele.status')}</th><th>{t('tele.provider')}</th><th>{t('tele.duration')}</th><th>{t('tele.actions')}</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">{t('tele.noSessions')}</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="font-mono text-xs text-primary-600">{s.roomName}</td>
                <td className="font-medium">{s.patientName}</td>
                <td>{s.doctorName || '-'}</td>
                <td><span className={`badge ${s.status === 'completed' ? 'badge-success' : s.status === 'active' ? 'badge-warning' : 'badge-info'}`}>{s.status}</span></td>
                <td>{s.provider}</td>
                <td className="text-xs">{s.durationSeconds ? Math.floor(s.durationSeconds / 60) + 'm' : '-'}</td>
                <td>
                  <div className="flex gap-1">
                    {s.meetingLink && (
                      <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm text-blue-600">
                        <ExternalLink className="w-3 h-3" />{t('tele.join')}
                      </a>
                    )}
                    {s.status === 'scheduled' && (
                      <button onClick={() => handleStatus(s.id, 'active')} className="btn-ghost btn-sm text-green-600">
                        <Video className="w-3 h-3" />Start
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNewModal && (
        <div className="modal-overlay" onClick={() => { setShowNewModal(false); resetForm(); }}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between card-header">
              <h2 className="text-lg font-semibold">{t('tele.newSession')}</h2>
              <button onClick={() => { setShowNewModal(false); resetForm(); }} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreate} noValidate>
              <div className="p-6 space-y-4">
                <div ref={patientSearchRef} className="relative">
                  <label className="label">{t('tele.patient')} *</label>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-gray-400" />
                    <input type="text" className={ic('patientId') + ' pl-10'} placeholder="Search patient..."
                      value={selectedPatient ? `${selectedPatient.name} (${selectedPatient.mrn})` : ''}
                      onChange={e => { setSelectedPatient(null); setNewSession(prev => ({ ...prev, patientId: '' })); searchPatients(e.target.value); }}
                      onFocus={() => searchResults.length > 0 && setShowPatientDropdown(true)} />
                    {selectedPatient && <button type="button" onClick={() => { setSelectedPatient(null); setNewSession(prev => ({ ...prev, patientId: '' })); }} className="absolute top-1/2 -translate-y-1/2 right-3 p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>}
                  </div>
                  {showPatientDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map(p => (
                        <button key={p.id} type="button" onClick={() => selectPatient(p)} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3">
                          <User className="w-4 h-4 text-gray-400" /><div><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-gray-500">{p.mrn} | {p.phone}</p></div>
                        </button>
                      ))}
                    </div>
                  )}
                  {formErrors.patientId && touchedFields.patientId && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{formErrors.patientId}</p>}
                </div>

                <div>
                  <label className="label">{t('tele.provider')}</label>
                  <select className="input" value={newSession.provider} onChange={e => setNewSession(prev => ({ ...prev, provider: e.target.value }))}>
                    <option value="internal">{t('tele.internal')}</option>
                    <option value="zoom">{t('tele.zoom')}</option>
                    <option value="teams">{t('tele.teams')}</option>
                    <option value="other">{t('tele.other')}</option>
                  </select>
                </div>

                <div>
                  <label className="label">Meeting Link (optional)</label>
                  <input type="url" className="input" placeholder="https://..." value={newSession.meetingLink}
                    onChange={e => setNewSession(prev => ({ ...prev, meetingLink: e.target.value }))} />
                </div>

                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newSession.recordingEnabled}
                    onChange={e => setNewSession(prev => ({ ...prev, recordingEnabled: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600" />
                  <span className="text-sm">{t('tele.recording')}</span>
                </label>

                <div>
                  <label className="label">{t('tele.notes')}</label>
                  <textarea className="input" rows={2} value={newSession.notes}
                    onChange={e => setNewSession(prev => ({ ...prev, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowNewModal(false); resetForm(); }} className="btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
