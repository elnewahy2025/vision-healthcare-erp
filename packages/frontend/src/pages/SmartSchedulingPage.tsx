import { useState } from 'react';
import { Card, CardBody, Button, Input, Spinner, EmptyState } from '../components/ui';
import { Calendar, Clock, CheckCircle, Zap, TrendingUp, Activity } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Slot {
  start: string; end: string; doctor_id: string; doctor_name: string;
  priority: string; estimated_duration: number;
}

interface ScheduleResult {
  schedule: any; slots: Slot[];
  utilization: number; expectedRevenue: number;
}

export default function SmartSchedulingPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<ScheduleResult | null>(null);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const res = await api.post('/ai/schedule/optimize', { date });
      setResult(res.data.data);
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to optimize schedule'); }
    finally { setLoading(false); }
  };

  const handleApply = async () => {
    if (!result?.schedule?.id) return;
    setApplying(true);
    try {
      await api.post(`/ai/schedule/${result.schedule.id}/apply`);
      toast.success('Schedule applied successfully');
    } catch { toast.error('Failed to apply schedule'); }
    finally { setApplying(false); }
  };

  const bookedSlots = result?.slots?.filter(s => s.priority === 'booked') || [];
  const availableSlots = result?.slots?.filter(s => s.priority === 'available') || [];
  const doctors = [...new Set(result?.slots?.map(s => s.doctor_name) || [])];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-100 rounded-lg"><Calendar className="w-6 h-6 text-cyan-600" /></div>
        <div><h1 className="text-2xl font-bold">Smart Scheduling</h1><p className="text-sm text-gray-500">AI-optimized appointment scheduling and utilization</p></div>
      </div>

      <Card><CardBody>
        <div className="flex items-end gap-3">
          <Input label="Schedule Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Button onClick={handleOptimize} disabled={loading} icon={<Zap className="w-4 h-4" />}>
            {loading ? 'Optimizing...' : 'Optimize Schedule'}
          </Button>
        </div>
      </CardBody></Card>

      {result && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardBody>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-cyan-600" /></div>
                <div><p className="text-sm text-gray-500">Utilization</p><p className="text-xl font-bold">{result.utilization}%</p></div>
              </div>
            </CardBody></Card>
            <Card><CardBody>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><Activity className="w-5 h-5 text-green-600" /></div>
                <div><p className="text-sm text-gray-500">Expected Revenue</p><p className="text-xl font-bold">{result.expectedRevenue.toLocaleString()} EGP</p></div>
              </div>
            </CardBody></Card>
            <Card><CardBody>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Calendar className="w-5 h-5 text-blue-600" /></div>
                <div><p className="text-sm text-gray-500">Total Slots</p><p className="text-xl font-bold">{result.slots?.length || 0}</p></div>
              </div>
            </CardBody></Card>
          </div>

          {/* Doctor Schedule */}
          <Card><CardBody>
            <h3 className="font-semibold mb-3">Optimized Schedule — {date}</h3>
            <div className="space-y-4">
              {doctors.map(doctor => {
                const docSlots = result.slots.filter(s => s.doctor_name === doctor);
                const booked = docSlots.filter(s => s.priority === 'booked').length;
                const avail = docSlots.filter(s => s.priority === 'available').length;
                return (
                  <div key={doctor} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{doctor}</h4>
                      <div className="flex gap-3 text-xs">
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{booked} booked</span>
                        <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">{avail} available</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {docSlots.slice(0, 8).map((slot, i) => (
                        <div key={i} className={`text-xs p-2 rounded-lg ${slot.priority === 'booked' ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <span className={`font-medium ${slot.priority === 'booked' ? 'text-green-700' : 'text-gray-500'}`}>{slot.priority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody></Card>

          {/* Utilization Bar */}
          <Card><CardBody>
            <h3 className="font-semibold mb-3">Utilization Overview</h3>
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div className="bg-cyan-500 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ width: `${result.utilization}%` }}>
                {result.utilization}%
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Booked: {bookedSlots.length} slots</span>
              <span>Available: {availableSlots.length} slots</span>
            </div>
          </CardBody></Card>

          {/* Apply Button */}
          <div className="flex justify-end">
            <Button onClick={handleApply} disabled={applying || !!result.schedule?.is_applied}
              icon={result.schedule?.is_applied ? <CheckCircle className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}>
              {result.schedule?.is_applied ? 'Schedule Applied' : applying ? 'Applying...' : 'Apply This Schedule'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
