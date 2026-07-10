import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { BarChart3, Plus, Search, MessageSquare } from 'lucide-react';
import api from '../lib/api';

export default function CrmPage() {
  const [tab, setTab] = useState<'campaigns' | 'feedback'>('campaigns');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/crm/campaigns').then(r => setCampaigns(r.data.data)).catch(() => []),
      api.get('/crm/feedback').then(r => setFeedback(r.data.data?.feedback || [])).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  const avgRating = feedback.length ? (feedback.reduce((s: number, f: any) => s + f.rating, 0) / feedback.length).toFixed(1) : 'N/A';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM</h1>
          <p className="text-gray-500 mt-1">{campaigns.length} campaigns · Avg rating: {avgRating}</p>
        </div>
        <Button><Plus className="w-4 h-4" /> New Campaign</Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'campaigns' ? 'primary' : 'secondary'} onClick={() => setTab('campaigns')}><BarChart3 className="w-4 h-4" /> Campaigns ({campaigns.length})</Button>
        <Button variant={tab === 'feedback' ? 'primary' : 'secondary'} onClick={() => setTab('feedback')}><MessageSquare className="w-4 h-4" /> Feedback ({feedback.length})</Button>
      </div>

      <Card className="mb-6"><CardBody>
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>

      {tab === 'campaigns' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Budget</th><th>Target</th><th>Reached</th><th>Conversions</th><th>Status</th></tr></thead>
            <tbody>
              {campaigns.filter((c: any) => !search || c.name?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">No campaigns</td></tr>
              ) : campaigns.filter((c: any) => !search || c.name?.toLowerCase().includes(search.toLowerCase())).map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="font-medium">{c.name}</td>
                  <td><Badge>{c.type}</Badge></td>
                  <td>{c.budget?.toFixed(2)} SAR</td>
                  <td>{c.targetCount}</td>
                  <td>{c.reachedCount}</td>
                  <td>{c.conversionCount}</td>
                  <td><Badge variant={c.status === 'active' ? 'success' : c.status === 'draft' ? 'warning' : 'gray'}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'feedback' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Patient</th><th>Rating</th><th>Category</th><th>Comment</th><th>Date</th></tr></thead>
            <tbody>
              {feedback.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">No feedback</td></tr> :
                feedback.map((f: any) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="font-medium">{f.patientName}</td>
                    <td>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</td>
                    <td><Badge>{f.category}</Badge></td>
                    <td className="text-xs max-w-xs truncate">{f.comment}</td>
                    <td className="text-xs">{f.createdAt?.split('T')[0]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
