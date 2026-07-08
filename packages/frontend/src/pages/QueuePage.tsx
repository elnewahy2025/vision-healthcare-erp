import { useState, useEffect } from 'react';
import { Badge, Button, Card, CardBody, Spinner } from '../components/ui';
import { ListOrdered, SkipForward, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';

export default function QueuePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/queue').then(r => setQueue(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await api.put('/queue/' + id + '/status', { status });
    setQueue(queue.map((e: any) => e.id === id ? { ...e, status } : e));
  };

  if (loading) return <Spinner size="lg" className="py-16" />;

  const waiting = queue.filter((e: any) => e.status === 'waiting');
  const inProgress = queue.filter((e: any) => e.status === 'in_progress');

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Queue Management</h1><p className="text-gray-500 mt-1">{waiting.length} waiting, {inProgress.length} in progress</p></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardBody>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><ListOrdered className="w-5 h-5 text-primary-600" /> Waiting ({waiting.length})</h3>
          {waiting.length === 0 ? <p className="text-gray-500 text-sm">Queue is empty</p> : (
            <div className="space-y-2">{waiting.map((e: any) => (
              <div key={e.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg font-bold text-primary-600 w-8">{e.position}</span>
                <div className="flex-1"><p className="text-sm font-medium">{e.patientName}</p><p className="text-xs text-gray-500">{e.serviceType}</p></div>
                <Button size="sm" onClick={() => updateStatus(e.id, 'in_progress')}><SkipForward className="w-3 h-3" /> Call</Button>
              </div>
            ))}</div>
          )}
        </CardBody></Card>
        <Card><CardBody>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" /> In Progress ({inProgress.length})</h3>
          {inProgress.length === 0 ? <p className="text-gray-500 text-sm">No active visits</p> : (
            <div className="space-y-2">{inProgress.map((e: any) => (
              <div key={e.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="flex-1"><p className="text-sm font-medium">{e.patientName}</p><p className="text-xs text-gray-500">{e.serviceType}</p></div>
                <Button size="sm" variant="success" onClick={() => updateStatus(e.id, 'completed')}><CheckCircle className="w-3 h-3" /> Done</Button>
                <Button size="sm" variant="ghost" onClick={() => updateStatus(e.id, 'skipped')}><XCircle className="w-3 h-3" /></Button>
              </div>
            ))}</div>
          )}
        </CardBody></Card>
      </div>
    </div>
  );
}
