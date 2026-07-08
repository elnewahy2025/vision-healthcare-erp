import { useState, useEffect } from 'react';
import { Badge, Button, Card, CardBody, Spinner } from '../components/ui';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../lib/api';

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/notifications').then(r => setNotifs(r.data.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  const markRead = async (id: string) => { await api.put('/notifications/' + id + '/read'); setNotifs(notifs.map((n: any) => n.id === id ? { ...n, status: 'read' } : n)); };
  if (loading) return <Spinner size="lg" className="py-16" />;
  const unread = notifs.filter((n: any) => n.status === 'pending').length;
  return (<div>
    <div className="page-header"><div><h1 className="page-title">Notifications</h1><p className="text-gray-500 mt-1">{unread} unread of {notifs.length} total</p></div></div>
    <Card><CardBody>
      {notifs.length === 0 ? <p className="text-gray-500 text-center py-8">No notifications</p> : (
        <div className="space-y-2">{notifs.map((n: any) => (
          <div key={n.id} className={'flex items-center gap-3 p-3 rounded-lg ' + (n.status === 'pending' ? 'bg-blue-50' : 'bg-gray-50')}>
            <Bell className={'w-5 h-5 ' + (n.status === 'pending' ? 'text-blue-600' : 'text-gray-400')} />
            <div className="flex-1"><p className="text-sm font-medium">{n.subject || 'Notification'}</p><p className="text-xs text-gray-500">{n.channel} - {new Date(n.createdAt).toLocaleDateString()}</p></div>
            {n.status === 'pending' && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}><CheckCheck className="w-4 h-4" /> Mark Read</Button>}
            <Badge>{n.status}</Badge>
          </div>
        ))}</div>
      )}
    </CardBody></Card></div>);
}