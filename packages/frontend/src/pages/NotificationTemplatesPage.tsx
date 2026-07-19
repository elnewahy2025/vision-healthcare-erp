import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { MessageSquare, Plus, Send, Edit3, X, Check } from 'lucide-react';
import { Button, Input, PageLoader, EmptyState, Badge } from '../components/ui';
import { communicationsApi } from '../lib/api';
import { sanitizeString } from '../lib/sanitize';

interface NotificationTemplate {
  id: string;
  key: string;
  channel: string;
  locale: string;
  subject?: string;
  body: string;
  tenant_id: string | null;
  is_active: boolean;
}

export default function NotificationTemplatesPage() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testRecipientError, setTestRecipientError] = useState('');
  const [testing, setTesting] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await communicationsApi.templates();
      setTemplates(data || []);
    } catch {
      toast.error(t('notifTmpl.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleLoad = useCallback(() => {
    loadTemplates();
  }, [loadTemplates]);

  const startEdit = useCallback((tmpl: NotificationTemplate) => {
    setEditing(tmpl.id);
    setEditSubject(tmpl.subject || '');
    setEditBody(tmpl.body);
  }, []);

  const saveEdit = useCallback(async (id: string) => {
    if (!editBody.trim()) {
      toast.error(t('notifTmpl.failedSave'));
      return;
    }
    setSaving(true);
    try {
      await communicationsApi.updateTemplate(id, {
        subject: sanitizeString(editSubject),
        body: sanitizeString(editBody),
      });
      toast.success(t('notifTmpl.templateUpdated'));
      setEditing(null);
      await loadTemplates();
    } catch {
      toast.error(t('notifTmpl.failedSave'));
    } finally {
      setSaving(false);
    }
  }, [editBody, editSubject, t, loadTemplates]);

  const sendTest = useCallback(async (id: string) => {
    const sanitized = sanitizeString(testRecipient.trim());
    if (!sanitized) {
      setTestRecipientError(t('notifTmpl.enterRecipient'));
      return;
    }
    setTestRecipientError('');
    setTesting(id);
    try {
      const result = await communicationsApi.testTemplate(id, sanitized);
      toast.success(result.sent ? t('notifTmpl.testSent') : t('notifTmpl.testFailed'));
    } catch {
      toast.error(t('notifTmpl.testError'));
    } finally {
      setTesting(null);
    }
  }, [testRecipient, t]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditSubject('');
    setEditBody('');
  }, []);

  if (loading) {
    return <PageLoader message={t('notifTmpl.loadingTemplates')} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" /> {t('notifTmpl.title')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('notifTmpl.templateCount', { count: templates.length })}
          </p>
        </div>
        <Button onClick={handleLoad} icon={<Plus className="w-4 h-4" />}>
          {t('notifTmpl.newTemplate')}
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-12 h-12" />}
          title={t('notifTmpl.noTemplates')}
          message={t('notifTmpl.noTemplates')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {sanitizeString(tmpl.key)}
                    </span>
                    <Badge variant={tmpl.channel === 'email' ? 'info' : 'success'}>
                      {tmpl.channel}
                    </Badge>
                    <Badge variant="gray">{tmpl.locale}</Badge>
                    {!tmpl.tenant_id && (
                      <Badge variant="gray">{t('notifTmpl.system')}</Badge>
                    )}
                  </div>

                  {editing === tmpl.id ? (
                    <div className="space-y-2 mt-2">
                      {tmpl.channel === 'email' && (
                        <Input
                          label={t('notifTmpl.subject')}
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                        />
                      )}
                      <textarea
                        className="w-full border rounded-lg p-3 min-h-[100px] font-mono text-sm"
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        placeholder={t('notifTmpl.templateBody')}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => saveEdit(tmpl.id)}
                          loading={saving}
                          size="sm"
                          icon={<Check className="w-4 h-4" />}
                        >
                          {t('notifTmpl.save')}
                        </Button>
                        <Button
                          onClick={cancelEdit}
                          variant="secondary"
                          size="sm"
                          icon={<X className="w-4 h-4" />}
                        >
                          {t('notifTmpl.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {tmpl.subject && (
                        <p className="text-sm text-gray-600 mt-1">
                          {t('notifTmpl.subject')}: <strong>{sanitizeString(tmpl.subject)}</strong>
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap line-clamp-3">
                        {sanitizeString(tmpl.body)}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          onClick={() => startEdit(tmpl)}
                          variant="secondary"
                          size="sm"
                          icon={<Edit3 className="w-3 h-3" />}
                        >
                          {t('notifTmpl.edit')}
                        </Button>
                        <div className="flex gap-1 items-center">
                          <Input
                            placeholder={t('notifTmpl.sendTestTo')}
                            value={testRecipient}
                            onChange={(e) => {
                              setTestRecipient(e.target.value);
                              if (testRecipientError) setTestRecipientError('');
                            }}
                            error={testRecipientError}
                            className="text-xs py-1 max-w-[200px]"
                          />
                          <Button
                            onClick={() => sendTest(tmpl.id)}
                            loading={testing === tmpl.id}
                            size="sm"
                            variant="secondary"
                            icon={<Send className="w-3 h-3" />}
                          >
                            {t('notifTmpl.test')}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
