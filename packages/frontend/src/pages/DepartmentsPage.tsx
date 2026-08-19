import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../stores/authStore';
import { departmentsApi } from '../lib/api/users';
import { Building2, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Can } from '../components/Can';

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export default function DepartmentsPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await departmentsApi.list();
      setDepartments(data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await departmentsApi.update(editing.id, { name: name.trim(), code: code.trim() });
      } else {
        await departmentsApi.create({ name: name.trim(), code: code.trim() });
      }
      setShowForm(false);
      setEditing(null);
      setName('');
      setCode('');
      await load();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this department?')) return;
    try {
      await departmentsApi.delete(id);
      await load();
    } catch {
      // silent
    }
  };

  const startEdit = (dept: Department) => {
    setEditing(dept);
    setName(dept.name);
    setCode(dept.code);
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">{t('nav.departments', 'Departments')}</h1>
        </div>
        {can('departments.create') && (
          <button onClick={() => { setShowForm(true); setEditing(null); setName(''); setCode(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
            <Plus className="h-4 w-4" /> {t('common.add', 'Add Department')}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-secondary mb-1">{t('common.name', 'Name')}</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="e.g. Ophthalmology" required />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-secondary mb-1">{t('common.code', 'Code')}</label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="e.g. OPHT" required />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
              <Check className="h-4 w-4" /> {saving ? '...' : t('common.save', 'Save')}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
              className="flex items-center gap-1 px-4 py-2 border border-border rounded-lg hover:bg-surface-secondary">
              <X className="h-4 w-4" /> {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted">{t('common.loading', 'Loading...')}</div>
      ) : departments.length === 0 ? (
        <div className="text-center py-8 text-muted">{t('common.noData', 'No departments found')}</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="text-left px-4 py-3 text-sm font-medium text-secondary">{t('common.name', 'Name')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-secondary">{t('common.code', 'Code')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-secondary">{t('common.status', 'Status')}</th>
                {can('departments.edit') && <th className="text-right px-4 py-3 text-sm font-medium text-secondary">{t('common.actions', 'Actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept.id} className="border-b border-border hover:bg-surface-secondary/50">
                  <td className="px-4 py-3 text-sm font-medium text-primary">{dept.name}</td>
                  <td className="px-4 py-3 text-sm text-secondary font-mono">{dept.code}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${dept.isActive ? 'bg-success-soft text-success' : 'bg-error-soft text-error'}`}>
                      {dept.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                    </span>
                  </td>
                  {can('departments.edit') && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => startEdit(dept)} className="p-1 hover:bg-surface-secondary rounded"><Pencil className="h-4 w-4" /></button>
                      {can('departments.delete') && (
                        <button onClick={() => handleDelete(dept.id)} className="p-1 hover:bg-error-soft rounded ml-1"><Trash2 className="h-4 w-4 text-error" /></button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
