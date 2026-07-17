import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../lib/api';
import api from '../lib/api';
import { Plus, Search, Loader2, User, X, AlertCircle, Stethoscope, CheckCircle2, Clock, Play } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NursingPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
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

  const [newTask, setNewTask] = useState({
    patientId: '', title: '', description: '', category: 'general',
    priority: 'normal', dueAt: '',
  });

  const loadTasks = async () => {
    try {
      const r = await api.get('/nursing/tasks');
      setTasks(r.data.data);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

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
    setNewTask(prev => ({ ...prev, patientId: patient.id }));
    setSelectedPatient(patient);
    setSearchResults([]);
    setShowPatientDropdown(false);
    setFormErrors(prev => { const next = { ...prev }; delete next.patientId; return next; });
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    if (!newTask.patientId) errors.patientId = t('validate.nursing.patientRequired');
    if (!newTask.title.trim()) errors.title = t('validate.nursing.titleRequired');
    setFormErrors(errors);
    setTouchedFields({ patientId: true, title: true });
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setNewTask({ patientId: '', title: '', description: '', category: 'general', priority: 'normal', dueAt: '' });
    setSelectedPatient(null);
    setFormErrors({});
    setTouchedFields({});
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    try {
      await api.post('/nursing/tasks', newTask);
      toast.success('Task created');
      setShowNewModal(false);
      resetForm();
      await loadTasks();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const confirmMsg = status === 'completed' ? 'Mark task as completed?' : 'Start this task?';
    if (!confirm(confirmMsg)) return;
    setActionLoading(id);
    try {
      await api.put(`/nursing/tasks/${id}`, { status });
      toast.success(status === 'completed' ? 'Task completed' : 'Task started');
      await loadTasks();
    } catch {
      toast.error('Failed to update task');
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

  const filtered = tasks.filter((task: any) => !filter || task.status === filter);

  const filterButtons = [
    { key: '', label: t('nursing.all'), count: tasks.length },
    { key: 'pending', label: t('nursing.pending'), count: tasks.filter(t => t.status === 'pending').length },
    { key: 'in_progress', label: t('nursing.inProgress'), count: tasks.filter(t => t.status === 'in_progress').length },
    { key: 'completed', label: t('nursing.completed'), count: tasks.filter(t => t.status === 'completed').length },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nursing.title')}</h1>
          <p className="text-gray-500 mt-1">{tasks.length} tasks</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('nursing.newTask')}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterButtons.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`btn ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}>
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Tasks Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('nursing.title_')}</th>
              <th>{t('nursing.patient')}</th>
              <th>{t('nursing.category')}</th>
              <th>{t('nursing.priority')}</th>
              <th>{t('nursing.status')}</th>
              <th>{t('nursing.dueAt')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">{t('nursing.noTasks')}</td></tr>
            ) : filtered.map((task: any) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td>
                  <p className="font-medium">{task.title}</p>
                  {task.description && <p className="text-xs text-gray-500 truncate max-w-xs">{task.description}</p>}
                </td>
                <td className="font-medium">{task.patientName}</td>
                <td><span className="badge-info">{t(`nursing.${task.category}`) || task.category}</span></td>
                <td><span className={`badge ${task.priority === 'urgent' ? 'badge-danger' : task.priority === 'high' ? 'badge-warning' : 'badge-info'}`}>{t(`nursing.${task.priority}`) || task.priority}</span></td>
                <td><span className={`badge ${task.status === 'completed' ? 'badge-success' : task.status === 'in_progress' ? 'badge-warning' : 'badge-gray'}`}>{task.status}</span></td>
                <td className="text-xs">{task.dueAt?.split('T')[0] || '-'}</td>
                <td>
                  <div className="flex gap-1">
                    {task.status === 'pending' && (
                      <button onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                        disabled={actionLoading === task.id}
                        className="btn-ghost btn-sm text-blue-600">
                        {actionLoading === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Start
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button onClick={() => handleUpdateStatus(task.id, 'completed')}
                        disabled={actionLoading === task.id}
                        className="btn-ghost btn-sm text-green-600">
                        {actionLoading === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Complete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Task Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => { setShowNewModal(false); resetForm(); }}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between card-header">
              <h2 className="text-lg font-semibold">{t('nursing.newTask')}</h2>
              <button onClick={() => { setShowNewModal(false); resetForm(); }}
                className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} noValidate>
              <div className="p-6 space-y-4">
                {/* Patient Search */}
                <div ref={patientSearchRef} className="relative">
                  <label className="label">{t('nursing.patient')} *</label>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-4 h-4 text-gray-400" />
                    <input type="text" className={inputClass('patientId') + ' pl-10'}
                      placeholder="Search patient by name, MRN, or phone..."
                      value={selectedPatient ? `${selectedPatient.name} (${selectedPatient.mrn})` : ''}
                      onChange={e => {
                        setSelectedPatient(null);
                        setNewTask(prev => ({ ...prev, patientId: '' }));
                        searchPatients(e.target.value);
                      }}
                      onFocus={() => searchResults.length > 0 && setShowPatientDropdown(true)} />
                    {selectedPatient && (
                      <button type="button" onClick={() => { setSelectedPatient(null); setNewTask(prev => ({ ...prev, patientId: '' })); }}
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

                {/* Title */}
                <div>
                  <label className="label">{t('nursing.title_')} *</label>
                  <input className={inputClass('title')} placeholder="e.g. Administer IV antibiotics"
                    value={newTask.title}
                    onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    onBlur={() => setTouchedFields(prev => ({ ...prev, title: true }))} />
                  {getFieldError('title') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />{getFieldError('title')}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="label">{t('nursing.description')}</label>
                  <textarea className="input" rows={2} placeholder="Task details..."
                    value={newTask.description}
                    onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))} />
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('nursing.category')}</label>
                    <select className="input" value={newTask.category}
                      onChange={e => setNewTask(prev => ({ ...prev, category: e.target.value }))}>
                      <option value="general">{t('nursing.general')}</option>
                      <option value="medication">{t('nursing.medication')}</option>
                      <option value="vitals">{t('nursing.vitals')}</option>
                      <option value="wound_care">{t('nursing.woundCare')}</option>
                      <option value="patient_education">{t('nursing.patientEducation')}</option>
                      <option value="discharge">{t('nursing.discharge')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('nursing.priority')}</label>
                    <select className="input" value={newTask.priority}
                      onChange={e => setNewTask(prev => ({ ...prev, priority: e.target.value }))}>
                      <option value="normal">{t('nursing.normal')}</option>
                      <option value="high">{t('nursing.high')}</option>
                      <option value="urgent">{t('nursing.urgent')}</option>
                    </select>
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="label">{t('nursing.dueAt')}</label>
                  <input type="datetime-local" className="input" value={newTask.dueAt}
                    onChange={e => setNewTask(prev => ({ ...prev, dueAt: e.target.value }))} />
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
