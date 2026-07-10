import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Select, Modal, Spinner, EmptyState, Badge } from '../components/ui';
import { MessageCircle, Plus, Edit, Trash2, Send, Eye } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Template { id: string; name: string; category: string; body_text: string; language: string; status: string; variables: string[]; is_active: boolean; }

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: '', category: 'utility', language: 'en', bodyText: '', variables: '' });

  const load = async () => {
    setLoading(true);
    try { const res = await api.get('/whatsapp/templates'); setTemplates(res.data.data || []); }
    catch { /* empty */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.bodyText) return toast.error('Name and body required');
    try {
      await api.post('/whatsapp/templates', {
        name: form.name, category: form.category, language: form.language,
        bodyText: form.bodyText, variables: form.variables.split(',').map(v => v.trim()).filter(Boolean),
      });
      toast.success('Template created'); setShowCreate(false);
      setForm({ name: '', category: 'utility', language: 'en', bodyText: '', variables: '' });
      load();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const categoryBadge = (c: string) => {
    const colors: Record<string, string> = { marketing: 'bg-purple-100 text-purple-800', utility: 'bg-blue-100 text-blue-800', authentication: 'bg-green-100 text-green-800' };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[c] || 'bg-gray-100'}`}>{c}</span>;
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg"><MessageCircle className="w-6 h-6 text-green-600" /></div>
          <div><h1 className="text-2xl font-bold">WhatsApp Templates</h1><p className="text-sm text-gray-500">Create and manage WhatsApp message templates</p></div>
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<Plus className="w-4 h-4" />}>New Template</Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState icon={<MessageCircle className="w-12 h-12" />} title="No templates" message="Create your first WhatsApp template" />
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <Card key={t.id}>
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{t.name}</span>
                      {categoryBadge(t.category)}
                      <Badge>{t.language}</Badge>
                      <span className={`text-xs ${t.is_active ? 'text-green-600' : 'text-gray-400'}`}>{t.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{t.body_text}</p>
                    {t.variables?.length > 0 && (
                      <div className="flex gap-1 mt-1">{t.variables.map(v => <span key={v} className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">{`{{${v}}}`}</span>)}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowPreview(t)} className="p-2 rounded hover:bg-gray-100"><Eye className="w-4 h-4 text-gray-500" /></button>
                    <button className="p-2 rounded hover:bg-gray-100"><Edit className="w-4 h-4 text-gray-500" /></button>
                    <button className="p-2 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create WhatsApp Template">
          <div className="space-y-4">
            <Input label="Template Name" placeholder="e.g. appointment_reminder" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              options={[{ value: 'utility', label: 'Utility' }, { value: 'marketing', label: 'Marketing' }, { value: 'authentication', label: 'Authentication' }]} />
            <Select label="Language" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
              options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'Arabic' }, { value: 'ar_eg', label: 'Arabic (Egypt)' }]} />
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Body Text</label>
              <textarea className="w-full border rounded-lg p-3 h-32 text-sm" placeholder="Hello {{name}}, your appointment is on {{date}}..."
                value={form.bodyText} onChange={e => setForm(f => ({ ...f, bodyText: e.target.value }))} /></div>
            <Input label="Variables (comma-separated)" placeholder="name, date, time" value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))} />
            <Button onClick={handleCreate} icon={<Plus className="w-4 h-4" />}>Create Template</Button>
          </div>
        </Modal>
      )}

      {showPreview && (
        <Modal open={!!showPreview} onClose={() => setShowPreview(null)} title="Template Preview">
          <div className="space-y-4">
            <div className="flex gap-2"><Badge>{showPreview.category}</Badge><Badge>{showPreview.language}</Badge></div>
            <div className="bg-green-50 rounded-xl p-4 text-sm whitespace-pre-wrap">{showPreview.body_text}</div>
            {showPreview.variables?.length > 0 && (
              <div><p className="text-sm font-medium mb-1">Variables:</p>
                <div className="flex gap-1">{showPreview.variables.map(v => <span key={v} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">{`{{${v}}}`}</span>)}</div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
