import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Spinner, EmptyState } from '../components/ui';
import { TrendingUp, AlertTriangle, Calendar, BarChart3, Users, DollarSign, Brain } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface NoShowPrediction {
  appointmentId: string; patient: string; time: string;
  riskScore: number; riskLevel: string; factors: string[];
}

interface RevenueForecast {
  historical: Array<{ month: string; revenue: number; count: number }>;
  forecast: Array<{ month: string; predicted: number; low: number; high: number; confidence: number }>;
}

interface PatientRisk {
  type: string; score: number; level: string;
  factors: string[]; recommendation: string;
}

export default function PredictiveAnalyticsPage() {
  const [tab, setTab] = useState<'overview' | 'no-show' | 'revenue' | 'patient-risk'>('overview');
  const [noShows, setNoShows] = useState<NoShowPrediction[]>([]);
  const [forecast, setForecast] = useState<RevenueForecast | null>(null);
  const [risks, setRisks] = useState<PatientRisk[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [patientId, setPatientId] = useState('');
  const [months, setMonths] = useState(3);

  const loadNoShows = async () => {
    setLoading(true);
    try {
      const res = await api.post('/ai/predictions/no-show', { date });
      setNoShows(res.data.data || []);
    } catch { toast.error('Failed to load predictions'); }
    finally { setLoading(false); }
  };

  const loadForecast = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/predictions/revenue', { params: { months } });
      setForecast(res.data.data);
    } catch { toast.error('Failed to load forecast'); }
    finally { setLoading(false); }
  };

  const loadPatientRisk = async () => {
    if (!patientId) return toast.error('Enter a patient ID');
    setLoading(true);
    try {
      const res = await api.get(`/ai/predictions/patient-risk/${patientId}`);
      setRisks(res.data.data || []);
    } catch { toast.error('Failed to load risk assessment'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (tab === 'no-show') loadNoShows(); }, [tab, date]);
  useEffect(() => { if (tab === 'revenue') loadForecast(); }, [tab, months]);
  useEffect(() => { if (tab === 'patient-risk' && patientId) loadPatientRisk(); }, [tab]);

  const riskColor = (level: string) => {
    const c: Record<string, string> = { low: 'text-green-600', moderate: 'text-yellow-600', high: 'text-red-600', critical: 'text-red-800' };
    return c[level] || 'text-gray-600';
  };

  const riskBg = (level: string) => {
    const c: Record<string, string> = { low: 'bg-green-50', moderate: 'bg-yellow-50', high: 'bg-red-50', critical: 'bg-red-100' };
    return c[level] || 'bg-gray-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg"><BarChart3 className="w-6 h-6 text-purple-600" /></div>
        <div><h1 className="text-2xl font-bold">Predictive Analytics</h1><p className="text-sm text-gray-500">AI-powered predictions for no-shows, revenue, and patient risk</p></div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {(['overview', 'no-show', 'revenue', 'patient-risk'] as const).map(k => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${tab === k ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {k === 'overview' ? 'Overview' : k === 'no-show' ? 'No-Show Risk' : k === 'revenue' ? 'Revenue Forecast' : 'Patient Risk'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab('no-show')}>
              <CardBody><AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
                <h3 className="font-semibold">No-Show Predictions</h3>
                <p className="text-sm text-gray-500">Predict which patients are likely to miss appointments</p>
              </CardBody></Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab('revenue')}>
              <CardBody><DollarSign className="w-8 h-8 text-green-500 mb-2" />
                <h3 className="font-semibold">Revenue Forecast</h3>
                <p className="text-sm text-gray-500">Project future revenue based on historical trends</p>
              </CardBody></Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab('patient-risk')}>
              <CardBody><Users className="w-8 h-8 text-blue-500 mb-2" />
                <h3 className="font-semibold">Patient Risk Assessment</h3>
                <p className="text-sm text-gray-500">Identify high-risk patients for proactive care</p>
              </CardBody></Card>
          </div>
        </div>
      )}

      {tab === 'no-show' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Button onClick={loadNoShows} icon={<Brain className="w-4 h-4" />}>Predict</Button>
          </div>
          {loading ? <Spinner size="lg" /> : noShows.length === 0 ? (
            <EmptyState icon={<Calendar className="w-12 h-12" />} title="No predictions" message="Select a date and run predictions" />
          ) : (
            <div className="space-y-3">
              <Card><CardBody>
                <h3 className="font-semibold mb-3">No-Show Risk for {date}</h3>
                <div className="space-y-2">
                  {noShows.sort((a, b) => b.riskScore - a.riskScore).map(p => (
                    <div key={p.appointmentId} className={`p-3 rounded-lg ${riskBg(p.riskLevel)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{p.patient}</span>
                        <span className={`font-semibold text-sm ${riskColor(p.riskLevel)}`}>{p.riskLevel.toUpperCase()} ({(p.riskScore * 100).toFixed(0)}%)</span>
                      </div>
                      <p className="text-xs text-gray-500">{new Date(p.time).toLocaleTimeString()} — {p.factors.slice(0, 2).join(', ')}</p>
                    </div>
                  ))}
                </div>
              </CardBody></Card>
              <div className="grid grid-cols-3 gap-3">
                {['low', 'moderate', 'high'].map(level => {
                  const count = noShows.filter(p => p.riskLevel === level).length;
                  return <Card key={level}><CardBody className="text-center">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-gray-500 capitalize">{level} risk</p>
                  </CardBody></Card>;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'revenue' && forecast && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input label="Forecast Months" type="number" value={months} onChange={e => setMonths(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardBody>
              <h3 className="font-semibold mb-3">Historical Revenue</h3>
              <div className="space-y-2">
                {forecast.historical.slice(0, 6).map(h => (
                  <div key={h.month} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{h.month}</span>
                    <span className="text-sm font-semibold">{h.revenue.toLocaleString()} EGP</span>
                  </div>
                ))}
              </div>
            </CardBody></Card>
            <Card><CardBody>
              <h3 className="font-semibold mb-3">Revenue Forecast</h3>
              <div className="space-y-2">
                {forecast.forecast.map(f => (
                  <div key={f.month} className="p-2 bg-purple-50 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{f.month}</span>
                      <span className="text-sm font-semibold text-purple-700">{f.predicted.toLocaleString()} EGP</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Range: {f.low.toLocaleString()} – {f.high.toLocaleString()}</span>
                      <span>Conf: {f.confidence ? (f.confidence * 100).toFixed(0) : 'N/A'}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody></Card>
          </div>
        </div>
      )}

      {tab === 'patient-risk' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <Input label="Patient ID" placeholder="Paste patient UUID" value={patientId} onChange={e => setPatientId(e.target.value)} />
            <Button onClick={loadPatientRisk} icon={<Users className="w-4 h-4" />}>Assess Risk</Button>
          </div>
          {loading ? <Spinner size="lg" /> : risks.length > 0 ? (
            <div className="space-y-3">
              {risks.map(r => (
                <Card key={r.type}>
                  <CardBody>
                    <div className={`p-3 rounded-lg ${riskBg(r.level)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold capitalize">{r.type.replace(/_/g, ' ')}</h3>
                        <span className={`font-bold ${riskColor(r.level)}`}>{r.level.toUpperCase()} ({(r.score * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Factors:</strong> {r.factors?.join(', ') || 'N/A'}
                      </div>
                      <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                        <strong>Recommendation:</strong> {r.recommendation}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Users className="w-12 h-12" />} title="No risk data" message="Enter a patient ID to assess risk" />
          )}
        </div>
      )}
    </div>
  );
}
