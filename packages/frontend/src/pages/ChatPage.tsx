import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, Button, Input, Modal, Spinner, EmptyState, Badge } from '../components/ui';
import { MessageSquare, Send, Search, Plus, User, Paperclip, CheckCheck, Clock, ArrowLeft } from 'lucide-react';
import api from '../lib/api';

interface Conversation {
  id: string;
  title: string;
  patient_id: string;
  appointment_id: string;
  is_active: boolean;
  unread_count: number;
  last_message: string;
  last_message_at: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  message_type: string;
  content: string;
  created_at: string;
  is_edited: boolean;
  is_deleted: boolean;
}

interface Participant {
  conversation_id: string;
  user_id: string;
  role: string;
  unread_count: number;
}

export default function ChatPage() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewConv, setShowNewConv] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [convPagination, setConvPagination] = useState({ page: 1, total: 1 });
  const [msgPagination, setMsgPagination] = useState({ page: 1, total: 1 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newConvForm, setNewConvForm] = useState({
    title: '',
    participantIds: '',
    participantRoles: 'staff',
  });

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversations
  const loadConversations = async () => {
    try {
      const res = await api.get('/chat/conversations', { params: { page: convPagination.page, limit: 20 } });
      setConversations(res.data.data);
      setConvPagination(p => ({ ...p, total: res.data.pagination.totalPages }));
    } catch { /* empty */ }
  };

  // Load unread count
  const loadUnread = async () => {
    try {
      const res = await api.get('/chat/unread');
      setUnreadCount(res.data.data.unreadCount);
    } catch { /* empty */ }
  };

  // Load messages for active conversation
  const loadMessages = async (convId: string) => {
    setMessagesLoading(true);
    try {
      const res = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(res.data.data);
      setMsgPagination(p => ({ ...p, total: res.data.pagination.totalPages }));

      // Mark as read
      await api.post(`/chat/conversations/${convId}/read`);
      loadUnread();
    } finally { setMessagesLoading(false); }
  };

  // Load participants
  const loadParticipants = async (convId: string) => {
    try {
      const res = await api.get(`/chat/conversations/${convId}/participants`);
      setParticipants(res.data.data);
      const online = await api.get(`/chat/conversations/${convId}/online`);
      setOnlineUsers(online.data.data.onlineUsers);
    } catch { /* empty */ }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadConversations(), loadUnread()]).finally(() => setLoading(false));
  }, [convPagination.page]);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv);
      loadParticipants(activeConv);
    }
  }, [activeConv]);

  // Poll for unread count every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !activeConv) return;
    setSending(true);
    try {
      const res = await api.post(`/chat/conversations/${activeConv}/messages`, {
        content: newMessage.trim(),
        messageType: 'text',
      });
      setMessages(prev => [...prev, res.data.data]);
      setNewMessage('');
      // Update conversation preview
      setConversations(prev => prev.map(c =>
        c.id === activeConv ? { ...c, last_message: newMessage.trim(), last_message_at: new Date().toISOString() } : c
      ));
    } finally { setSending(false); }
  };

  // Create new conversation
  const handleCreateConv = async () => {
    if (!newConvForm.title || !newConvForm.participantIds) return;
    try {
      const participantIds = newConvForm.participantIds.split(',').map(s => s.trim());
      const participantRoles = participantIds.map(() => newConvForm.participantRoles);
      const res = await api.post('/chat/conversations', {
        title: newConvForm.title,
        participantIds,
        participantRoles,
      });
      setConversations(prev => [res.data.data, ...prev]);
      setActiveConv(res.data.data.id);
      setShowNewConv(false);
      setNewConvForm({ title: '', participantIds: '', participantRoles: 'staff' });
    } catch { /* empty */ }
  };

  // Keyboard shortcut (Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString();
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Conversations Sidebar */}
      <div className="w-80 shrink-0 bg-white rounded-xl border flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">{t('nav.chat')}</h2>
            <div className="relative">
              <Button size="sm" onClick={() => setShowNewConv(true)} icon={<Plus className="w-4 h-4" />}>
                New
              </Button>
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No conversations</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv.id)}
                className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors ${
                  activeConv === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-sm truncate flex-1">{conv.title}</h3>
                  <span className="text-[10px] text-gray-400 ml-2">{formatTimestamp(conv.last_message_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 truncate flex-1">{conv.last_message || 'No messages yet'}</p>
                  {conv.unread_count > 0 && (
                    <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-2">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {convPagination.total > 1 && (
          <div className="flex justify-between items-center px-4 py-2 border-t bg-gray-50">
            <Button variant="secondary" size="sm" disabled={convPagination.page <= 1}
              onClick={() => setConvPagination(p => ({ ...p, page: p.page - 1 }))}>Prev</Button>
            <span className="text-xs text-gray-500">{convPagination.page}/{convPagination.total}</span>
            <Button variant="secondary" size="sm" disabled={convPagination.page >= convPagination.total}
              onClick={() => setConvPagination(p => ({ ...p, page: p.page + 1 }))}>Next</Button>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white rounded-xl border flex flex-col overflow-hidden">
        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium text-lg mb-1">Select a conversation</h3>
              <p className="text-sm">Choose a conversation from the left or start a new one</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="lg:hidden p-1 hover:bg-gray-200 rounded" onClick={() => setActiveConv(null)}>
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-semibold">
                    {conversations.find(c => c.id === activeConv)?.title || 'Chat'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {participants.map(p => (
                      <span key={p.user_id} className="text-xs text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {p.user_id.substring(0, 8)}
                      </span>
                    ))}
                    {onlineUsers.length > 0 && (
                      <span className="text-xs text-green-600 font-medium">● {onlineUsers.length} online</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/50">
              {messagesLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.filter(m => !m.is_deleted).map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_role === 'system' ? 'justify-center' : 'justify-start'}`}
                  >
                    {msg.sender_role === 'system' ? (
                      <div className="bg-gray-200 text-gray-500 text-xs px-3 py-1 rounded-full">
                        {msg.content}
                      </div>
                    ) : (
                      <div className={`max-w-[75%] ${
                        msg.message_type === 'text' ? 'bg-blue-500 text-white rounded-2xl rounded-tl-sm px-4 py-2.5' : ''
                      }`}>
                        {msg.message_type === 'text' ? (
                          <div>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] opacity-70">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <CheckCheck className="w-3 h-3 opacity-70" />
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-700">
                            <p className="italic">[{msg.message_type}] {msg.content}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    className="w-full rounded-xl border-gray-300 border p-3 pr-10 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px] max-h-32"
                    placeholder="Type a message..."
                    rows={1}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button className="absolute right-2 bottom-2 p-1.5 rounded-lg hover:bg-gray-100 min-w-[32px] min-h-[32px] flex items-center justify-center">
                    <Paperclip className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <Button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  icon={<Send className="w-4 h-4" />}
                  className="min-h-[44px]"
                >
                  Send
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Press Enter to send, Shift+Enter for new line</p>
            </div>
          </>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConv && (
        <Modal open={showNewConv} onClose={() => setShowNewConv(false)} title="New Conversation">
          <div className="space-y-4">
            <Input label="Conversation Title" placeholder="e.g. Follow-up discussion" value={newConvForm.title}
              onChange={(e) => setNewConvForm(p => ({ ...p, title: e.target.value }))} />
            <Input label="Participant IDs (comma-separated)" placeholder="user-uuid-1, user-uuid-2"
              value={newConvForm.participantIds}
              onChange={(e) => setNewConvForm(p => ({ ...p, participantIds: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role for Participants</label>
              <select className="w-full rounded-lg border-gray-300 border p-2"
                value={newConvForm.participantRoles}
                onChange={(e) => setNewConvForm(p => ({ ...p, participantRoles: e.target.value }))}>
                <option value="doctor">Doctor</option>
                <option value="patient">Patient</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button onClick={handleCreateConv} icon={<Plus className="w-4 h-4" />}>Create Conversation</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
