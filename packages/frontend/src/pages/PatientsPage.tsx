import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../lib/api';
import { Plus, Search, ChevronLeft, ChevronRight, Loader2, User, Phone, Calendar, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatientsPage() {
  const { t, i18n } = useTranslation();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'male' as const,
    phone: '', email: '', bloodType: '', nationality: '',
  });

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await patientsApi.list({ page, limit: 10, search: search || undefined });
      setPatients(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPatients(); }, [page, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await patientsApi.create(newPatient);
      toast.success('Patient created successfully');
      setShowNewModal(false);
      setNewPatient({ firstName: '', lastName: '', dateOfBirth: '', gender: 'male', phone: '', email: '', bloodType: '', nationality: '' });
      loadPatients();
    } catch {
      toast.error('Failed to create patient');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this patient?')) return;
    try {
      await patientsApi.delete(id);
      toast.success('Patient deleted');
      loadPatients();
    } catch {
      toast.error('Failed to delete patient');
    }
  };

  const isRtl = i18n.language === 'ar';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('patient.title')}</h1>
          <p className="text-gray-500 mt-1">{pagination.total} total patients</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('patient.new')}
        </button>
      </div>

      {/* Search Bar */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={`${t('common.search')} by name, MRN, phone...`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('patient.mrn')}</th>
              <th>{t('patient.firstName')}</th>
              <th>{t('patient.lastName')}</th>
              <th>{t('patient.dob')}</th>
              <th>{t('patient.gender')}</th>
              <th>{t('patient.phone')}</th>
              <th>{t('patient.bloodType')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" />
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-500">{t('common.noData')}</td>
              </tr>
            ) : (
              patients.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="font-mono text-xs text-primary-600">{p.medicalRecordNumber}</td>
                  <td className="font-medium">{p.firstName}</td>
                  <td>{p.lastName}</td>
                  <td>{p.dateOfBirth}</td>
                  <td>{p.gender}</td>
                  <td dir="ltr" className="text-left">{p.phone}</td>
                  <td><span className="badge-info">{p.bloodType || '-'}</span></td>
                  <td>
                    <span className={p.status === 'active' ? 'badge-success' : 'badge-gray'}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link to={`/patients/${p.id}`} className="btn-ghost btn-sm">
                        View
                      </Link>
                      <button onClick={() => handleDelete(p.id)} className="btn-ghost btn-sm text-red-600">
                        Delete
                      </button>
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
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary btn-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="btn-secondary btn-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* New Patient Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <h2 className="text-lg font-semibold">{t('patient.new')}</h2>
            </div>
            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('patient.firstName')} *</label>
                    <input className="input" value={newPatient.firstName}
                      onChange={e => setNewPatient({...newPatient, firstName: e.target.value})} required />
                  </div>
                  <div>
                    <label className="label">{t('patient.lastName')} *</label>
                    <input className="input" value={newPatient.lastName}
                      onChange={e => setNewPatient({...newPatient, lastName: e.target.value})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('patient.dob')} *</label>
                    <input type="date" className="input" value={newPatient.dateOfBirth}
                      onChange={e => setNewPatient({...newPatient, dateOfBirth: e.target.value})} required />
                  </div>
                  <div>
                    <label className="label">{t('patient.gender')} *</label>
                    <select className="input" value={newPatient.gender}
                      onChange={e => setNewPatient({...newPatient, gender: e.target.value as any})}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('patient.phone')} *</label>
                    <input className="input" value={newPatient.phone}
                      onChange={e => setNewPatient({...newPatient, phone: e.target.value})} required />
                  </div>
                  <div>
                    <label className="label">{t('patient.email')}</label>
                    <input type="email" className="input" value={newPatient.email}
                      onChange={e => setNewPatient({...newPatient, email: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('patient.bloodType')}</label>
                    <select className="input" value={newPatient.bloodType}
                      onChange={e => setNewPatient({...newPatient, bloodType: e.target.value})}>
                      <option value="">Select</option>
                      <option value="A+">A+</option><option value="A-">A-</option>
                      <option value="B+">B+</option><option value="B-">B-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      <option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('patient.nationality')}</label>
                    <input className="input" value={newPatient.nationality}
                      onChange={e => setNewPatient({...newPatient, nationality: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowNewModal(false)} className="btn-secondary">
                  {t('common.cancel')}
                </button>
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
