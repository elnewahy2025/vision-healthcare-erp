import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { MessageCircle, Plus, Eye } from 'lucide-react';
import {
  Card, CardBody, Button, Input, Select, Modal, Badge, PageLoader,
  EmptyState,
} from '../components/ui';
import api from '../lib/api';
import { sanitizeString, escapeHtml } from '../lib/sanitize';

/* ── Types ─────────────────────────────────────────────────────────── */

interface Template {
  id: string;
  name: string;
  category: string;
  body_text: string;
  language: string;
  status: string;
  variables: string[];
  is_active: boolean;
}

/* ── Constants ─────────────────────────────────────────────────────── */

const CATEGORY_VARIANTS: Record<string, 'success' | 'warning' | 'info' | 'gray'> = {
  marketing: 'info',
  utility: 'success',
  authentication: 'warning',
};

/* ── Component ─────────────────────────────────────────────────────── */

export default function WhatsAppTemplatesPage() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Create modal ── */
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'utility',
    language: 'en',
    bodyText: '',
    variables: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /* ── Preview modal ── */
  const [showPreview, setShowPreview] = useState<Template | null>(null);

  /* ── Data fetching ── */

  const fetchTemplates = useCallback(async (): Promise<void> => {
    try {
      const { data } = await api.get('/whatsapp/templates');
      setTemplates((data.data ?? []) as Template[]);
    } catch {
      toast.error(t('waTmpl.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  /* ── Initial load ── */

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      await fetchTemplates();
      if (cancelled) setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [fetchTemplates]);

  /* ── Create handler ── */

  const handleCreate = useCallback(async (): Promise<void> => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = t('waTmpl.nameAndBodyRequired');
    if (!form.bodyText.trim()) errors.bodyText = t('waTmpl.nameAndBodyRequired');
    if (!form.category) errors.category = t('waTmpl.categoryRequired');
    if (!form.language) errors.language = t('waTmpl.languageRequired');
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCreateLoading(true);
    try {
      await api.post('/whatsapp/templates', {
        name: sanitizeString(form.name),
        category: form.category,
        language: form.language,
        bodyText: sanitizeString(form.bodyText),
        variables: form.variables.split(',').map((v) => v.trim()).filter(Boolean),
      });
      toast.success(t('waTmpl.templateCreated'));
      setShowCreate(false);
      setForm({ name: '', category: 'utility', language: 'en', bodyText: '', variables: '' });
      void fetchTemplates();
    } catch {
      toast.error(t('waTmpl.templateCreateFailed'));
    } finally {
      setCreateLoading(false);
    }
  }, [form, t, fetchTemplates]);

  /* ── Render ── */

  if (loading) return <PageLoader message={t('common.loading')} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('waTmpl.title')}</h1>
            <p className="text-sm text-gray-500">{t('waTmpl.subtitle')}</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" />
          {t('waTmpl.newTemplate')}
        </Button>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="w-8 h-8 text-gray-400" />}
          title={t('waTmpl.noTemplates')}
          message={t('waTmpl.createFirst')}
        />
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl) => (
            <Card key={tmpl.id}>
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold">{escapeHtml(tmpl.name)}</span>
                      <Badge variant={CATEGORY_VARIANTS[tmpl.category] ?? 'gray'}>
                        {tmpl.category}
                      </Badge>
                      <Badge>{tmpl.language}</Badge>
                      <span className={`text-xs ${tmpl.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                        {tmpl.is_active ? t('waTmpl.active') : t('waTmpl.inactive')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{escapeHtml(tmpl.body_text)}</p>
                    {tmpl.variables?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {tmpl.variables.map((v) => (
                          <span key={v} className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setShowPreview(tmpl)}
                      className="p-2 rounded hover:bg-gray-100"
                      aria-label="Preview"
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create Modal ── */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={t('waTmpl.newTemplate')}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleCreate()} loading={createLoading} disabled={createLoading}>
              {t('waTmpl.createTemplate')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('waTmpl.templateName')}
            placeholder={t('waTmpl.templateNamePlaceholder')}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            error={formErrors.name}
          />
          <Select
            label={t('waTmpl.category')}
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            options={[
              { value: 'utility', label: t('waTmpl.utility') },
              { value: 'marketing', label: t('waTmpl.marketing') },
              { value: 'authentication', label: t('waTmpl.authentication') },
            ]}
            error={formErrors.category}
          />
          <Select
            label={t('waTmpl.language')}
            value={form.language}
            onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
            options={[
              { value: 'en', label: t('waTmpl.english') },
              { value: 'ar', label: t('waTmpl.arabic') },
              { value: 'ar_eg', label: t('waTmpl.arabicEgypt') },
            ]}
            error={formErrors.language}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('waTmpl.bodyText')}
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 h-32 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('waTmpl.bodyPlaceholder')}
              value={form.bodyText}
              onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))}
            />
            {formErrors.bodyText && <p className="text-xs text-red-600 mt-1">{formErrors.bodyText}</p>}
          </div>
          <Input
            label={t('waTmpl.variables')}
            placeholder={t('waTmpl.variablesPlaceholder')}
            value={form.variables}
            onChange={(e) => setForm((f) => ({ ...f, variables: e.target.value }))}
          />
        </div>
      </Modal>

      {/* ── Preview Modal ── */}
      <Modal
        open={!!showPreview}
        onClose={() => setShowPreview(null)}
        title={t('waTmpl.preview')}
      >
        {showPreview && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge variant={CATEGORY_VARIANTS[showPreview.category] ?? 'gray'}>
                {showPreview.category}
              </Badge>
              <Badge>{showPreview.language}</Badge>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-sm whitespace-pre-wrap">
              {escapeHtml(showPreview.body_text)}
            </div>
            {showPreview.variables?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">{t('waTmpl.variablesLabel')}</p>
                <div className="flex gap-1 flex-wrap">
                  {showPreview.variables.map((v) => (
                    <span key={v} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
