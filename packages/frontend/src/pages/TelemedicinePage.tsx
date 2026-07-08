import { useState, useEffect } from 'react';
import { Badge, Button, Card, CardBody, Spinner } from '../components/ui';
import { Video, Plus, ExternalLink } from 'lucide-react';
import api from '../lib/api';

export default function TelemedicinePage() {
  const [sessions, setSessions] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/telemedicine/sessions').then(r => setSessions(r.data.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner size="lg" className="py-16" />;
  return (<div>
    <div className="page-header"><div><h1 className="page-title">Telemedicine</h1><p className="text-gray-500 mt-1">{sessions.length} sessions</p></div><Button><Plus className="w-4 h-4" /> New Session</Button></div>
    <div className="table-container"><table><thead><tr><th>Room</th><th>Patient</th><th>Doctor</th><th>Status</th><th>Provider</th><th>Duration</th><th>Actions</th></tr></thead><tbody>
      {sessions.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">No sessions</td></tr> :
        sessions.map((s: any) => (<tr key={s.id} className="hover:bg-gray-50">
          <td className="font-mono text-xs">{s.roomName}</td><td className="font-medium">{s.patientName}</td>
          <td>{s.doctorName || '-'}</td><td><Badge>{s.status}</Badge></td>
          <td>{s.provider}</td><td className="text-xs">{s.durationSeconds ? Math.floor(s.durationSeconds / 60) + 'm' : '-'}</td>
          <td>{s.meetingLink && <a href={s.meetingLink} target="_blank" className="btn-ghost btn-sm"><ExternalLink className="w-3 h-3" /> Join</a>}</td>
        </tr>))}
    </tbody></table></div></div>);
}