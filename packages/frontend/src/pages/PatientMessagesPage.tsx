import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { MessageSquare, Send, Search, Phone } from 'lucide-react';
import api from '../lib/api';

export default function PatientMessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadConversations = async () => {
    try {
      const r = await api.get('/patient-messages/conversations/list');
      setConversations(r.data.data);
    } catch {}
    setLoading(false);
  };

  const loadMessages = async (patientId: string) => {
    try {
      const r = await api.get(`/patient-messages/${patientId}`);
      setMessages(r.data.data);
    } catch { setMessages([]); }
  };

  useEffect(() => { loadConversations(); }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Patient Messages</h1><p className="text-gray-500 mt-1">{conversations.length} conversations</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardBody>
              <h3 className="font-semibold mb-3">Conversations</h3>
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No conversations</p>
              ) : conversations.map((c: any) => (
                <div key={c.patientId}
                  className={`p-3 rounded-lg cursor-pointer mb-2 transition-all ${selectedPatient?.patientId === c.patientId ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-gray-50'}`}
                  onClick={() => { setSelectedPatient(c); loadMessages(c.patientId); }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{c.patientName}</p>
                    {Number(c.unread) > 0 && <Badge variant="warning">{c.unread}</Badge>}
                  </div>
                  <p className="text-xs text-gray-500">{c.patientPhone}</p>
                  <p className="text-xs text-gray-400 mt-1">{c.totalMessages} messages · Last {c.lastMessageAt?.split('T')[0]}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedPatient ? (
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                  <div>
                    <h3 className="font-semibold">{selectedPatient.patientName}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedPatient.patientPhone}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No messages in this conversation</p>
                  ) : messages.map((m: any) => (
                    <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${m.direction === 'outbound' ? 'bg-gray-100 rounded-tl-none' : 'bg-primary-50 rounded-tr-none'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{m.direction === 'outbound' ? (m.senderName || 'Staff') : 'Patient'}</span>
                          {!m.isRead && m.direction === 'outbound' && <Badge variant="warning">New</Badge>}
                        </div>
                        <p className="text-sm">{m.body}</p>
                        <p className="text-xs text-gray-400 mt-1">{m.createdAt?.split('T')[0]} {m.createdAt?.split('T')[1]?.slice(0, 5)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={async (e: any) => {
                      if (e.key === 'Enter' && newMessage.trim()) {
                        await api.post('/patient-messages/send', { patientId: selectedPatient.patientId, message: newMessage });
                        setNewMessage('');
                        loadMessages(selectedPatient.patientId);
                        loadConversations();
                      }
                    }}
                  />
                  <Button onClick={async () => {
                    if (!newMessage.trim()) return;
                    await api.post('/patient-messages/send', { patientId: selectedPatient.patientId, message: newMessage });
                    setNewMessage('');
                    loadMessages(selectedPatient.patientId);
                    loadConversations();
                  }}><Send className="w-4 h-4" /></Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card><CardBody className="text-center py-16">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Select a conversation to view messages</p>
            </CardBody></Card>
          )}
        </div>
      </div>
    </div>
  );
}
