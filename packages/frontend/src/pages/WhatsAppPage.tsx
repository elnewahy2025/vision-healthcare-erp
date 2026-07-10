import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, Button, Input, Select, Modal, Spinner, EmptyState, Badge } from '../components/ui';
import { MessageCircle, Send, Search, BarChart3, Plus, Eye, Clock } from 'lucide-react';
import api from '../lib/api';

interface WhatsAppMessage {
  id: string;
  to_number: string;
  message: string;
  template_name: string;
  message_type: string;
  status: string;
  direction: string;
  created_at: string;
}

interface WhatsAppStats {
  total: number;
  today: number;
  byStatus: Array<{ status: string; count: number }>;
  byType: Array<{ message_type: string; count: number }>;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  body_text: string;
  language: string;
  status: string;
}

export default function WhatsAppPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'send' | 'messages' | 'templates' | 'stats'>('messages');
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 1, limit: 20 });
  const [statusFilter, setStatusFilter] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<WhatsAppMessage | null>(null);

  const [sendForm, setSendForm] = useState({
    to: '',
    message: '',
    templateName: '',
    templateParams: '',
  });

  const loadMessages = async () => {
    try {
      const params: any = { page: pagination.page, limit: pagination.limit };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/whatsapp/messages', { params });
      setMessages(res.data.data);
      setPagination(prev => ({ ...prev, total: res.data.pagination.totalPages }));
    } catch { /* empty */ }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/whatsapp/stats');
      setStats(res.data.data);
    } catch { /* empty */ }
  };

  const loadTemplates = async () => {
    try {
      const res = await api.get('/whatsapp/templates');
      setTemplates(res.data.data);
    } catch { /* empty */ }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMessages(), loadStats(), loadTemplates()])
      .finally(() => setLoading(false));
  }, [tab, statusFilter, pagination.page]);

  const handleSend = async () => {
    if (!sendForm.to) return;
    setSending(true);
    try {
      const payload: any = { to: sendForm.to, messageType: 'text' };
      if (sendForm.templateName) {
        payload.templateName = sendForm.templateName;
        payload.templateParams = ['en', ...(sendForm.templateParams.split(',').map(s => s.trim()).filter(Boolean))];
        payload.messageType = 'template';
      } else {
        payload.message = sendForm.message;
      }
      await api.post('/whatsapp/send', payload);
      setShowSendModal(false);
      setSendForm({ to: '', message: '', templateName: '', templateParams: '' });
      loadMessages();
    } finally { setSending(false); }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      read: 'bg-purple-100 text-purple-800',
      failed: 'bg-red-100 text-red-800',
      received: 'bg-yellow-100 text-yellow-800',
    };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
  };

  const formatNumber = (n: string) => {
    if (n.startsWith('+2')) return n;
    return `+${n.replace(/[^0-9]/g, '')}`;
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('nav.whatsapp')}</h1>
            <p className="text-sm text-gray-500">Send and manage WhatsApp messages</p>
          </div>
        </div>
        <Button onClick={() => setShowSendModal(true)} icon={<Send className="w-4 h-4" />}>
          New Message
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {(['messages', 'send', 'templates', 'stats'] as const).map(tabKey => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
              tab === tabKey ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tabKey}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {tab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardBody>
              <p className="text-sm text-gray-500">Total Messages</p>
              <p className="text-3xl font-bold text-green-600">{stats.total}</p>
            </CardBody></Card>
            <Card><CardBody>
              <p className="text-sm text-gray-500">Sent Today</p>
              <p className="text-3xl font-bold text-blue-600">{stats.today}</p>
            </CardBody></Card>
            {stats.byStatus?.map(s => (
              <Card key={s.status}><CardBody>
                <p className="text-sm text-gray-500 capitalize">{s.status}</p>
                <p className="text-3xl font-bold">{Number(s.count)}</p>
              </CardBody></Card>
            ))}
          </div>
          <Card><CardBody>
            <h3 className="font-semibold mb-3">By Message Type</h3>
            <div className="flex gap-3 flex-wrap">
              {stats.byType?.map(t => (
                <div key={t.message_type} className="flex items-center gap-2">
                  <Badge>{t.message_type}</Badge>
                  <span className="font-medium">{Number(t.count)}</span>
                </div>
              ))}
            </div>
          </CardBody></Card>
        </div>
      )}

      {/* Messages Tab */}
      {tab === 'messages' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'sent', label: 'Sent' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'read', label: 'Read' },
                { value: 'failed', label: 'Failed' },
                { value: 'received', label: 'Received' },
              ]}
            />
          </div>

          {messages.length === 0 ? (
            <EmptyState icon={<MessageCircle className="w-12 h-12" />} title="No messages" message="No WhatsApp messages yet" />
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {messages.map(msg => (
                    <tr key={msg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          msg.direction === 'outbound' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>{msg.direction}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{formatNumber(msg.to_number)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{msg.message || msg.template_name}</td>
                      <td className="px-4 py-3 text-sm">{msg.message_type}</td>
                      <td className="px-4 py-3">{statusBadge(msg.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(msg.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedMessage(msg)} className="p-1 rounded hover:bg-gray-100">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              <div className="flex justify-between items-center px-4 py-3 border-t">
                <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.total}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={pagination.page <= 1}
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Prev</Button>
                  <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.total}
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {tab === 'templates' && (
        <div className="space-y-4">
          <Card><CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">WhatsApp Templates</h3>
            </div>
            {templates.length === 0 ? (
              <EmptyState icon={<MessageCircle className="w-12 h-12" />} title="No templates" message="Create templates in Meta Business Suite" />
            ) : (
              <div className="space-y-3">
                {templates.map(tmpl => (
                  <div key={tmpl.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{tmpl.name}</p>
                        <p className="text-sm text-gray-500">{tmpl.body_text}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{tmpl.category}</Badge>
                        <Badge>{tmpl.language}</Badge>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          tmpl.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>{tmpl.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody></Card>
        </div>
      )}

      {/* Send Tab (inline) */}
      {tab === 'send' && (
        <Card><CardBody>
          <h3 className="font-semibold mb-4">Send WhatsApp Message</h3>
          <div className="space-y-4 max-w-lg">
            <Input label="To (Phone Number)" placeholder="+201234567890" value={sendForm.to}
              onChange={(e) => setSendForm(p => ({ ...p, to: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message Type</label>
              <select
                className="w-full rounded-lg border-gray-300 border p-2"
                value={sendForm.templateName ? 'template' : 'text'}
                onChange={(e) => setSendForm(p => ({ ...p, templateName: e.target.value === 'template' ? '' : '' }))}
              >
                <option value="text">Text Message</option>
                <option value="template">Template Message</option>
              </select>
            </div>
            {!sendForm.templateName ? (
              <textarea className="w-full rounded-lg border-gray-300 border p-3 h-32" placeholder="Type your message..."
                value={sendForm.message} onChange={(e) => setSendForm(p => ({ ...p, message: e.target.value }))} />
            ) : (
              <>
                <Input label="Template Name" placeholder="e.g. appointment_reminder"
                  value={sendForm.templateName} onChange={(e) => setSendForm(p => ({ ...p, templateName: e.target.value }))} />
                <Input label="Template Params (comma-separated)" placeholder="e.g. John, 2026-01-15"
                  value={sendForm.templateParams} onChange={(e) => setSendForm(p => ({ ...p, templateParams: e.target.value }))} />
              </>
            )}
            <Button onClick={handleSend} disabled={sending || !sendForm.to} icon={<Send className="w-4 h-4" />}>
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </CardBody></Card>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <Modal open={!!selectedMessage} onClose={() => setSelectedMessage(null)} title="Message Details">
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-gray-500">Direction:</span><span>{selectedMessage.direction}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">To:</span><span>{formatNumber(selectedMessage.to_number)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Type:</span><span>{selectedMessage.message_type}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Status:</span>{statusBadge(selectedMessage.status)}</div>
            <div className="flex justify-between"><span className="text-gray-500">Date:</span><span>{new Date(selectedMessage.created_at).toLocaleString()}</span></div>
            {selectedMessage.message && (
              <div><p className="text-gray-500 mb-1">Message:</p><p className="bg-gray-50 p-3 rounded-lg">{selectedMessage.message}</p></div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
