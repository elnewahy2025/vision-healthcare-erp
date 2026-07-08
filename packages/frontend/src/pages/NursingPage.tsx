import { useState, useEffect } from 'react';
import { Badge, Button, Card, CardBody, Input, Spinner } from '../components/ui';
import { Stethoscope, Plus } from 'lucide-react';
import api from '../lib/api';

export default function NursingPage() {
  const [tasks, setTasks] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  useEffect(() => { api.get('/nursing/tasks').then(r => setTasks(r.data.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner size="lg" className="py-16" />;
  const filtered = tasks.filter((t: any) => !filter || t.status === filter);
  return (<div>
    <div className="page-header"><div><h1 className="page-title">Nursing</h1><p className="text-gray-500 mt-1">{tasks.length} tasks</p></div><Button><Plus className="w-4 h-4" /> New Task</Button></div>
    <div className="flex gap-2 mb-6">
      <Button variant={!filter ? 'primary' : 'secondary'} onClick={() => setFilter('')}>All ({tasks.length})</Button>
      <Button variant={filter === 'pending' ? 'primary' : 'secondary'} onClick={() => setFilter('pending')}>Pending</Button>
      <Button variant={filter === 'in_progress' ? 'primary' : 'secondary'} onClick={() => setFilter('in_progress')}>In Progress</Button>
      <Button variant={filter === 'completed' ? 'primary' : 'secondary'} onClick={() => setFilter('completed')}>Completed</Button>
    </div>
    <div className="table-container"><table><thead><tr><th>Title</th><th>Patient</th><th>Category</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead><tbody>
      {filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No tasks</td></tr> :
        filtered.map((t: any) => (<tr key={t.id} className="hover:bg-gray-50">
          <td className="font-medium">{t.title}</td><td>{t.patientName}</td>
          <td><Badge variant="info">{t.category}</Badge></td>
          <td><Badge variant={t.priority === 'high' ? 'danger' : t.priority === 'urgent' ? 'warning' : 'info'}>{t.priority}</Badge></td>
          <td><Badge>{t.status}</Badge></td><td className="text-xs">{t.dueAt?.split('T')[0] || '-'}</td>
        </tr>))}
    </tbody></table></div></div>);
}