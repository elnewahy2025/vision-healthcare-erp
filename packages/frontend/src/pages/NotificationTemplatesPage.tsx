import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { communicationsApi } from '../lib/api';
import { MessageSquare, Plus, Loader2, Send, Edit3, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationTemplatesPage() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try { setTemplates(await communicationsApi.templates()); }
    catch { toast.error('Failed to load templates'); }
    finally { setLoading(false); }
  };

  const startEdit = (t: any) => {
    setEditing(t.id);
    setEditSubject(t.subject || '');
    setEditBody(t.body);
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      await communicationsApi.updateTemplate(id, { subject: editSubject, body: editBody });
      toast.success('Template updated');
      setEditing(null);
      loadTemplates();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const sendTest = async (id: string) => {
    if (!testRecipient) return toast.error('Enter recipient email/phone');
    setTesting(id);
    try {
      const result = await communicationsApi.testTemplate(id, testRecipient);
      toast.success(result.sent ? 'Test sent!' : 'Send failed (check logs)');
    } catch { toast.error('Test failed'); }
    finally { setTesting(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><MessageSquare className="w-6 h-6" /> Notification Templates</h1>
          <p className="text-gray-500 mt-1">{templates.length} templates</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Template</button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {templates.map((t: any) => (
          <div key={t.id} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-medium text-gray-900">{t.key}</span>
                    <span className={`badge ${t.channel === 'email' ? 'badge-info' : 'badge-success'}`}>{t.channel}</span>
                    <span className="badge badge-gray">{t.locale}</span>
                    {!t.tenant_id && <span className="badge badge-gray">System</span>}
                  </div>
                  {editing === t.id ? (
                    <div className="space-y-2 mt-2">
                      {t.channel === 'email' && (
                        <input className="input" placeholder="Subject" value={editSubject}
                          onChange={e => setEditSubject(e.target.value)} />
                      )}
                      <textarea className="input min-h-[100px] font-mono text-sm" value={editBody}
                        onChange={e => setEditBody(e.target.value)} placeholder="Template body with {{variables}}" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(t.id)} disabled={saving} className="btn-primary btn-sm">
                          {saving && <Loader2 className="w-4 h-4 animate-spin" />} <Check className="w-4 h-4" /> Save
                        </button>
                        <button onClick={() => setEditing(null)} className="btn-secondary btn-sm"><X className="w-4 h-4" /> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {t.subject && <p className="text-sm text-gray-600 mt-1">Subject: <strong>{t.subject}</strong></p>}
                      <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap line-clamp-3">{t.body}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => startEdit(t)} className="btn-ghost btn-sm"><Edit3 className="w-3 h-3" /> Edit</button>
                        <div className="flex gap-1">
                          <input className="input text-xs py-1 max-w-[200px]" placeholder="Send test to..." value={testRecipient}
                            onChange={e => setTestRecipient(e.target.value)} />
                          <button onClick={() => sendTest(t.id)} disabled={testing === t.id} className="btn-ghost btn-sm">
                            {testing === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Test
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
