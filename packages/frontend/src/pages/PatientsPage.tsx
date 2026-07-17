import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../lib/api';
import {
  isValidEgyptianPhone,
  isValidEgyptianNationalId,
  isValidEmail,
  isValidName,
  checkPasswordStrength,
} from '../lib/validators';
import { Plus, Search, ChevronLeft, ChevronRight, Loader2, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [newPatient, setNewPatient] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'male' as const,
    phone: '', email: '', bloodType: '', nationality: '',
    nationalId: '',
    nationalIdType: 'national',
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

  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (!isValidName(value)) return 'Only letters, spaces, hyphens allowed';
        if (value.length < 2) return 'Must be at least 2 characters';
        return null;
      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (!isValidName(value)) return 'Only letters, spaces, hyphens allowed';
        if (value.length < 2) return 'Must be at least 2 characters';
        return null;
      case 'dateOfBirth':
        if (!value) return 'Date of birth is required';
        if (new Date(value) > new Date()) return 'Date cannot be in the future';
        if (new Date(value) < new Date('1900-01-01')) return 'Invalid date';
        return null;
      case 'gender':
        if (!value) return 'Gender is required';
        return null;
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!isValidEgyptianPhone(value)) return 'Enter a valid Egyptian phone (e.g. 01012345678)';
        return null;
      case 'email':
        if (value && !isValidEmail(value)) return 'Enter a valid email address';
        return null;
      case 'nationalId':
        if (value && !isValidEgyptianNationalId(value)) return 'Enter a valid 14-digit National ID';
        return null;
      default:
        return null;
    }
  };

  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'phone'];
    
    for (const field of requiredFields) {
      const error = validateField(field, (newPatient as any)[field]);
      if (error) errors[field] = error;
    }
    
    // Validate optional fields only if they have values
    if (newPatient.email) {
      const error = validateField('email', newPatient.email);
      if (error) errors.email = error;
    }
    if (newPatient.nationalId) {
      const error = validateField('nationalId', newPatient.nationalId);
      if (error) errors.nationalId = error;
    }
    
    setFormErrors(errors);
    setTouchedFields({
      firstName: true, lastName: true, dateOfBirth: true,
      gender: true, phone: true, email: true, nationalId: true,
    });
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (field: string, value: string) => {
    setNewPatient(prev => ({ ...prev, [field]: value }));
    if (touchedFields[field]) {
      const error = validateField(field, value);
      setFormErrors(prev => {
        const next = { ...prev };
        if (error) next[field] = error;
        else delete next[field];
        return next;
      });
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, (newPatient as any)[field]);
    setFormErrors(prev => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    try {
      await patientsApi.create(newPatient);
      toast.success('Patient created successfully');
      setShowNewModal(false);
      setNewPatient({ firstName: '', lastName: '', dateOfBirth: '', gender: 'male', phone: '', email: '', bloodType: '', nationality: '', nationalId: '', nationalIdType: 'national' });
      setFormErrors({});
      setTouchedFields({});
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

  const getFieldError = (field: string) => {
    if (!touchedFields[field]) return undefined;
    return formErrors[field];
  };

  const inputClass = (field: string) =>
    `input ${formErrors[field] && touchedFields[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`;

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
            <input
              type="text"
              placeholder={`${t('common.search')} by name, MRN, phone...`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10"
            />
            <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-5 h-5 text-gray-400" />
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
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                  <td className="font-mono text-xs text-primary-600">{p.medicalRecordNumber}</td>
                  <td className="font-medium">{p.firstName}</td>
                  <td>{p.lastName}</td>
                  <td>{p.dateOfBirth}</td>
                  <td>{p.gender === 'male' ? t('patient.gender.male') : t('patient.gender.female')}</td>
                  <td dir="ltr" className="text-left">{p.phone}</td>
                  <td><span className="badge-info">{p.bloodType || '-'}</span></td>
                  <td>
                    <span className={p.status === 'active' || p.status === true ? 'badge-success' : 'badge-gray'}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link to={`/patients/${p.id}`} className="btn-ghost btn-sm">
                        {t('common.edit')}
                      </Link>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="btn-ghost btn-sm text-red-600">
                        {t('common.delete')}
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
            <div className="flex items-center justify-between card-header">
              <h2 className="text-lg font-semibold">{t('patient.new')}</h2>
              <button onClick={() => setShowNewModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} noValidate>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('patient.firstName')} *</label>
                    <input className={inputClass('firstName')} value={newPatient.firstName}
                      onChange={e => handleFieldChange('firstName', e.target.value)}
                      onBlur={() => handleFieldBlur('firstName')} required />
                    {getFieldError('firstName') && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {getFieldError('firstName')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">{t('patient.lastName')} *</label>
                    <input className={inputClass('lastName')} value={newPatient.lastName}
                      onChange={e => handleFieldChange('lastName', e.target.value)}
                      onBlur={() => handleFieldBlur('lastName')} required />
                    {getFieldError('lastName') && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {getFieldError('lastName')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('patient.dob')} *</label>
                    <input type="date" className={inputClass('dateOfBirth')} value={newPatient.dateOfBirth}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => handleFieldChange('dateOfBirth', e.target.value)}
                      onBlur={() => handleFieldBlur('dateOfBirth')} required />
                    {getFieldError('dateOfBirth') && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {getFieldError('dateOfBirth')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">{t('patient.gender')} *</label>
                    <select className={inputClass('gender')} value={newPatient.gender}
                      onChange={e => handleFieldChange('gender', e.target.value)}
                      onBlur={() => handleFieldBlur('gender')}>
                      <option value="male">{t('patient.gender.male')}</option>
                      <option value="female">{t('patient.gender.female')}</option>
                    </select>
                    {getFieldError('gender') && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {getFieldError('gender')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('patient.phone')} *</label>
                    <input className={inputClass('phone')} placeholder="01012345678"
                      value={newPatient.phone}
                      onChange={e => handleFieldChange('phone', e.target.value)}
                      onBlur={() => handleFieldBlur('phone')} required />
                    {getFieldError('phone') ? (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {getFieldError('phone')}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">Egyptian format: 01X XXX XXXX</p>
                    )}
                  </div>
                  <div>
                    <label className="label">{t('patient.email')}</label>
                    <input type="email" className={inputClass('email')} value={newPatient.email}
                      onChange={e => handleFieldChange('email', e.target.value)}
                      onBlur={() => handleFieldBlur('email')} />
                    {getFieldError('email') && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {getFieldError('email')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('patient.bloodType')}</label>
                    <select className="input" value={newPatient.bloodType}
                      onChange={e => handleFieldChange('bloodType', e.target.value)}>
                      <option value="">{t('common.filter')}</option>
                      <option value="A+">A+</option><option value="A-">A-</option>
                      <option value="B+">B+</option><option value="B-">B-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      <option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('patient.nationalId')}</label>
                    <input className={inputClass('nationalId')} placeholder="14-digit National ID"
                      maxLength={14} value={newPatient.nationalId}
                      onChange={e => handleFieldChange('nationalId', e.target.value.replace(/\D/g, '').substring(0, 14))}
                      onBlur={() => handleFieldBlur('nationalId')} />
                    {getFieldError('nationalId') ? (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {getFieldError('nationalId')}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">14-digit Egyptian National ID</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label">{t('patient.nationality')}</label>
                  <input className="input" value={newPatient.nationality}
                    onChange={e => handleFieldChange('nationality', e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowNewModal(false); setFormErrors({}); setTouchedFields({}); }} className="btn-secondary">
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
