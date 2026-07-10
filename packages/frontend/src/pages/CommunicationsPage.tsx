import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import React from 'react';
import { Send, Mail, Phone, MessageSquare, Search, BarChart3, History } from 'lucide-react';
import api from '../lib/api';

export default function CommunicationsPage() {
  const [tab, setTab] = useState<'send' | 'history' | 'stats'>('send');
  const [templates, setTemplates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('appointment_reminder');
  const [recipient, setRecipient] = useState('');
  const [sentMsg, setSentMsg] = useState('');

  const load = () => Promise.all([
    api.get('/communications/templates').then(r => setTemplates(r.data.data)).catch(() => []),
    api.get('/communications/history').then(r => setHistory(r.data.data)).catch(() => []),
    api.get('/communications/stats').then(r => setStats(r.data.data)).catch(() => null),
  ]).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  const doSend = async () => {
    try {
      const r = await api.post('/communications/send', {
        templateCode: selectedTemplate, recipient,
        variables: { date: new Date().toISOString().split('T')[0], time: '10:00', clinicName: 'Vision Healthcare' }
      });
      setSentMsg(r.data.message || 'Sent!');
      load();
    } catch (e: any) { setSentMsg('Error: ' + (e.response?.data?.error || 'Failed')); }
  };

  const channelIcons: Record<string, any> = { email: Mail, sms: MessageSquare, whatsapp: Phone };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Communications</h1><p className="text-gray-500 mt-1">{stats?.total || 0} total messages</p></div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'send' ? 'primary' : 'secondary'} onClick={() => setTab('send')}><Send className="w-4 h-4" /> Send</Button>
        <Button variant={tab === 'history' ? 'primary' : 'secondary'} onClick={() => setTab('history')}><History className="w-4 h-4" /> History ({history.length})</Button>
        <Button variant={tab === 'stats' ? 'primary' : 'secondary'} onClick={() => setTab('stats')}><BarChart3 className="w-4 h-4" /> Stats</Button>
      </div>

      {tab === 'send' && (
        <div className="max-w-lg mx-auto">
          <Card><CardBody>
            <h2 className="text-lg font-semibold mb-4">Send Communication</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                  {templates.map((t: any) => <option key={t.code} value={t.code}>{t.code.replace(/_/g, ' ')} ({t.channel})</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Recipient</label>
                <Input placeholder="email@example.com or +966501234567" value={recipient} onChange={e => setRecipient(e.target.value)} />
              </div>
              {sentMsg ? (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">{sentMsg}</div>
              ) : (
                <Button className="w-full" onClick={doSend} disabled={!recipient}>
                  <Send className="w-4 h-4" /> Send
                </Button>
              )}
            </div>
          </CardBody></Card>
        </div>
      )}

      {tab === 'history' && (
        <div className="table-container">
          <table><thead><tr><th>Subject</th><th>Channel</th><th>Recipient</th><th>Status</th><th>Reference</th><th>Sent</th></tr></thead>
            <tbody>
              {history.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No communications sent</td></tr> :
                history.map((h: any) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="font-medium text-sm max-w-xs truncate">{h.subject}</td>
                    <td>{channelIcons[h.channel] ? <span className="flex items-center gap-1">{React.createElement(channelIcons[h.channel], { className: 'w-3 h-3' })} {h.channel}</span> : h.channel}</td>
                    <td className="text-xs">{h.recipient}</td>
                    <td><Badge variant={h.status === 'sent' ? 'success' : h.status === 'failed' ? 'danger' : 'warning'}>{h.status}</Badge></td>
                    <td className="text-xs">{h.referenceType ? `${h.referenceType}:${h.referenceId?.slice(0, 8)}` : '-'}</td>
                    <td className="text-xs">{h.sentAt?.split('T')[0] || h.createdAt?.split('T')[0]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'stats' && stats && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card><CardBody><p className="text-sm text-gray-500">Total Messages</p><p className="text-2xl font-bold">{stats.total}</p></CardBody></Card>
            {stats.byChannel?.map((b: any) => (
              <Card key={b.channel}><CardBody><p className="text-sm text-gray-500 capitalize">{b.channel}</p><p className="text-2xl font-bold">{b.count}</p></CardBody></Card>
            ))}
          </div>
          <Card><CardBody>
            <h3 className="font-semibold mb-3">By Status</h3>
            <div className="flex gap-3 flex-wrap">
              {stats.byStatus?.map((b: any) => (
                <div key={b.status} className="flex items-center gap-2">
                  <Badge>{b.status}</Badge>
                  <span className="font-medium">{b.count}</span>
                </div>
              ))}
            </div>
          </CardBody></Card>
        </div>
      )}
    </div>
  );
}
