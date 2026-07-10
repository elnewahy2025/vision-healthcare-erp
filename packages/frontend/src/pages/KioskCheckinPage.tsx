import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Spinner } from '../components/ui';
import { UserCheck, Hash, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function KioskCheckinPage() {
  const [step, setStep] = useState<'enter' | 'confirm' | 'success' | 'status'>('enter');
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [checkinId, setCheckinId] = useState('');

  useEffect(() => {
    // Detect kiosk mode from URL
    if (window.location.pathname.includes('kiosk')) {
      document.documentElement.style.fontSize = '20px';
    }
  }, []);

  const handleCheckin = async () => {
    if (!nationalId.trim()) return toast.error('Enter your National ID');
    setLoading(true);
    try {
      const slug = localStorage.getItem('tenantSlug') || 'demo';
      const res = await api.post('/kiosk/checkin', {
        tenantSlug: slug, nationalId: nationalId.trim(),
      });
      setResult(res.data.data);
      setCheckinId(res.data.data.checkinId);
      setStep('success');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Check-in failed');
    } finally { setLoading(false); }
  };

  const checkStatus = async () => {
    if (!checkinId) return;
    setLoading(true);
    try {
      const res = await api.get(`/kiosk/status/${checkinId}`);
      setStatus(res.data.data);
      setStep('status');
    } catch { toast.error('Could not check status'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Self Check-In</h1>
          <p className="text-gray-500 mt-2">Enter your National ID or MRN to check in</p>
        </div>

        {/* Step: Enter ID */}
        {step === 'enter' && (
          <Card>
            <CardBody className="p-8">
              <div className="space-y-6">
                <Input
                  label="National ID / MRN"
                  placeholder="Enter your 14-digit National ID"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                />
                <Button onClick={handleCheckin} disabled={loading || !nationalId.trim()}
                  className="w-full min-h-[56px] text-lg font-semibold" icon={<UserCheck className="w-5 h-5" />}>
                  {loading ? 'Checking In...' : 'Check In'}
                </Button>
                <p className="text-center text-sm text-gray-400">
                  Need help? Ask reception for assistance.
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step: Success */}
        {step === 'success' && result && (
          <Card>
            <CardBody className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Checked In!</h2>
              <p className="text-gray-600 mb-6">Welcome, {result.patientName}</p>
              <div className="bg-blue-50 rounded-xl p-6 mb-6">
                <p className="text-sm text-gray-500 mb-1">Your Queue Number</p>
                <p className="text-5xl font-bold text-blue-600">#{result.queueNumber}</p>
                <p className="text-sm text-gray-500 mt-2">Estimated wait: ~{result.estimatedWaitMinutes} min</p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => { setStep('enter'); setNationalId(''); setResult(null); }}>
                  New Check-In
                </Button>
                <Button className="flex-1" onClick={checkStatus}>
                  Track Status
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step: Status */}
        {step === 'status' && status && (
          <Card>
            <CardBody className="p-8">
              <div className="text-center mb-6">
                <Clock className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                <h2 className="text-xl font-bold">Queue Status</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Your Number</span>
                  <span className="font-bold text-lg">#{status.queue_number}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Status</span>
                  <span className={`font-bold capitalize ${status.status === 'in_progress' ? 'text-green-600' : 'text-blue-600'}`}>
                    {status.status === 'in_progress' ? 'YOUR TURN!' : status.status.replace('_', ' ')}
                  </span>
                </div>
                {status.patientsAhead > 0 && (
                  <div className="flex justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-yellow-700">Patients Ahead</span>
                    <span className="font-bold text-yellow-700">{status.patientsAhead}</span>
                  </div>
                )}
                {status.status === 'in_progress' && (
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="font-bold text-green-700 text-lg">🔔 Please proceed to the doctor!</p>
                  </div>
                )}
              </div>
              <Button className="w-full mt-6" onClick={() => { setStep('enter'); setNationalId(''); setStatus(null); }}>
                Check Status Again
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
