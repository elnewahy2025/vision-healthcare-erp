import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Modal, Input, Select, PatientSearchField } from '../components/ui';
import { Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReferralForm {
  patientId: string;
  referralType: string;
  priority: string;
  reason: string;
  clinicalNotes: string;
  externalFacility: string;
  externalDoctor: string;
  consentObtained: boolean;
}

const INITIAL_FORM: ReferralForm = {
  patientId: '', referralType: 'specialist', priority: 'normal',
  reason: '', clinicalNotes: '', externalFacility: '', externalDoctor: '', consentObtained: true,
};

export default function ReferralsPage() {
  const { t } = useTranslation();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ReferralForm, string>>>({});
  const [newRef, setNewRef] = useState<ReferralForm>(INITIAL_FORM);

  useEffect(() => {
    api.get('/referrals').then(r => setReferrals(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ReferralForm, string>> = {};
    if (!newRef.patientId) errors.patientId = t('validate.referral.patientRequired');
    if (!newRef.reason.trim()) errors.reason = t('validate.referral.reasonRequired');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => { setNewRef(INITIAL_FORM); setFormErrors({}); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      await api.post('/referrals', newRef);
      toast.success('Referral created');
      setShowNewModal(false);
      resetForm();
      const r = await api.get('/referrals');
      setReferrals(r.data.data);
    } catch { toast.error('Failed to create referral'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;

  const filtered = referrals.filter(r =>
    !search || r.patientName?.toLowerCase().includes(search.toLowerCase()) || r.referralNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const isExternal = newRef.referralType === 'external';

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{t('referral.title')}</h1><p className="text-gray-500 mt-1">{referrals.length} referrals</p></div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary"><Plus className="w-4 h-4" />{t('referral.newReferral')}</button>
      </div>

      <div className="card mb-6"><div className="card-body">
        <Input type="search" placeholder={`${t('common.search')} referrals...`} value={search} onChange={e => setSearch(e.target.value)} />
      </div></div>

      <div className="table-container">
        <table>
          <thead><tr><th>{t('referral.referralNumber')}</th><th>{t('referral.patient')}</th><th>{t('referral.type')}</th><th>{t('referral.status')}</th><th>{t('referral.priority')}</th><th>{t('referral.date')}</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">{t('referral.noReferrals')}</td></tr> :
              filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="font-mono text-xs text-primary-600">{r.referralNumber}</td>
                  <td className="font-medium">{r.patientName}</td>
                  <td><span className="badge-info">{t(`referral.${r.referralType}`)}</span></td>
                  <td><span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-info'}`}>{r.status}</span></td>
                  <td><span className={`badge ${r.priority === 'emergency' ? 'badge-danger' : r.priority === 'urgent' ? 'badge-warning' : 'badge-info'}`}>{r.priority}</span></td>
                  <td className="text-xs">{r.referralDate}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={showNewModal} onClose={() => { setShowNewModal(false); resetForm(); }} title={t('referral.newReferral')} size="lg"
        footer={<>
          <button onClick={() => { setShowNewModal(false); resetForm(); }} className="btn-secondary">{t('common.cancel')}</button>
          <button type="submit" form="ref-form" disabled={saving} className="btn-primary">{saving && <Loader2 className="w-4 h-4 animate-spin" />}{t('common.save')}</button>
        </>}>
        <form id="ref-form" onSubmit={handleCreate} noValidate className="space-y-4">
          <PatientSearchField value={newRef.patientId}
            onChange={id => { setNewRef(prev => ({ ...prev, patientId: id })); setFormErrors(prev => { const n = { ...prev }; delete n.patientId; return n; }); }}
            error={formErrors.patientId} required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label={t('referral.type')} value={newRef.referralType}
              onChange={e => setNewRef(prev => ({ ...prev, referralType: e.target.value }))}
              options={[{ value: 'specialist', label: t('referral.specialist') }, { value: 'general', label: t('referral.general') }, { value: 'internal', label: t('referral.internal') }, { value: 'external', label: t('referral.external') }]} />
            <Select label={t('referral.priority')} value={newRef.priority}
              onChange={e => setNewRef(prev => ({ ...prev, priority: e.target.value }))}
              options={[{ value: 'normal', label: t('referral.normal') }, { value: 'urgent', label: t('lab.urgent') }, { value: 'emergency', label: t('lab.stat') }]} />
          </div>

          {isExternal && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <Input label={t('referral.externalFacility')} value={newRef.externalFacility} onChange={e => setNewRef(prev => ({ ...prev, externalFacility: e.target.value }))} />
              <Input label={t('referral.externalDoctor')} value={newRef.externalDoctor} onChange={e => setNewRef(prev => ({ ...prev, externalDoctor: e.target.value }))} />
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{t('referral.reason')} *</label>
            <textarea className={`input ${formErrors.reason ? 'border-red-500' : ''}`} rows={2} placeholder="Reason for referral..."
              value={newRef.reason} onChange={e => setNewRef(prev => ({ ...prev, reason: e.target.value }))} />
            {formErrors.reason && <p className="text-sm text-red-600">{formErrors.reason}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{t('referral.clinicalNotes')}</label>
            <textarea className="input" rows={3} placeholder="Relevant history, diagnoses, medications..."
              value={newRef.clinicalNotes} onChange={e => setNewRef(prev => ({ ...prev, clinicalNotes: e.target.value }))} />
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={newRef.consentObtained}
              onChange={e => setNewRef(prev => ({ ...prev, consentObtained: e.target.checked }))}
              className="rounded border-gray-300 text-primary-600" />
            <span className="text-sm">{t('referral.consentObtained')}</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
