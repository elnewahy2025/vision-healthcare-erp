import { useState, useEffect, useRef } from 'react';
import { Spinner } from '../components/ui';
import { ListOrdered, Bell, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface QueueEntry { id: string; queue_number: number; first_name: string; last_name: string; status: string; }
interface NowServing { queue_number: number; first_name: string; last_name: string; }
interface DisplayData { queue: QueueEntry[]; nowServing: NowServing | null; totalWaiting: number; }

export default function QueueDisplayPage() {
  const [data, setData] = useState<DisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [time, setTime] = useState(new Date());
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('tenant') || 'demo';
    const branchId = params.get('branch') || '';
    const token = params.get('token') || '';

    // Connect via polling initially, then try WebSocket
    if (token) {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${window.location.host}/api/v1/queue/ws?token=${token}&tenantSlug=${slug}&branchId=${branchId}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          console.log('[Queue WS] Connected');
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'queue_state') {
              setData(msg.data);
              setLastUpdate(new Date());
              setLoading(false);
            }

            if (msg.type === 'patient_called') {
              setData(prev => prev ? {
                ...prev,
                nowServing: { queue_number: msg.data.queue_number, first_name: msg.data.first_name, last_name: msg.data.last_name },
                queue: prev.queue.filter(e => e.id !== msg.data.id),
                totalWaiting: prev.totalWaiting - 1,
              } : prev);
              setLastUpdate(new Date());
            }

            if (msg.type === 'status_updated') {
              setData(prev => prev ? {
                ...prev,
                queue: prev.queue.filter(e => e.id !== msg.data.id),
                totalWaiting: prev.queue.filter(e => e.id !== msg.data.id).length,
              } : prev);
              setLastUpdate(new Date());
            }
          } catch { /* ignore parse errors */ }
        };

        ws.onclose = () => { setConnected(false); console.log('[Queue WS] Disconnected, falling back to polling'); };
        ws.onerror = () => { setConnected(false); };
      } catch { setConnected(false); }
    }

    return () => { wsRef.current?.close(); };
  }, []);

  // Fallback polling every 10s if WebSocket is not connected
  useEffect(() => {
    if (connected) return;

    const load = async () => {
      try {
        const slug = new URLSearchParams(window.location.search).get('tenant') || 'demo';
        const branchId = new URLSearchParams(window.location.search).get('branch') || '';
        const url = `/queue/display${branchId ? '/' + branchId : ''}?tenantSlug=${slug}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) { setData(json.data); setLastUpdate(new Date()); }
        setError('');
      } catch { setError('Could not load queue data'); }
      finally { setLoading(false); }
    };

    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [connected]);

  const isDark = true;
  const bgColor = isDark ? 'bg-gray-900' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subColor = isDark ? 'text-gray-300' : 'text-gray-500';

  if (loading) return <div className={`min-h-screen ${bgColor} flex items-center justify-center`}><Spinner size="lg" /></div>;

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} p-8 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <ListOrdered className="w-10 h-10 text-blue-500" />
          <div>
            <h1 className="text-4xl font-bold">Patient Queue</h1>
            <p className={`text-lg ${subColor}`}>Vision Healthcare Clinic</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 mb-2 justify-end">
            {connected ? (
              <span className="flex items-center gap-1 text-green-400 text-sm"><Wifi className="w-4 h-4" /> Live</span>
            ) : (
              <span className="flex items-center gap-1 text-yellow-400 text-sm"><WifiOff className="w-4 h-4" /> Polling</span>
            )}
          </div>
          <p className="text-3xl font-bold tabular-nums">{time.toLocaleTimeString()}</p>
          <p className={`text-lg ${subColor}`}>{time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          {lastUpdate && <p className={`text-xs ${subColor} mt-1`}>Updated {lastUpdate.toLocaleTimeString()}</p>}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3">
          <AlertCircle className="w-6 h-6" />{error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* NOW SERVING */}
        <div className="flex flex-col">
          <div className="bg-green-600 text-white rounded-2xl p-6 flex-1 flex flex-col items-center justify-center animate-pulse-subtle">
            <Bell className="w-12 h-12 mb-4" />
            <p className="text-xl font-medium mb-2">NOW SERVING</p>
            {data?.nowServing ? (
              <>
                <p className="text-8xl font-black">{data.nowServing.queue_number}</p>
                <p className="text-2xl mt-4">{data.nowServing.first_name} {data.nowServing.last_name}</p>
              </>
            ) : (
              <p className="text-6xl font-black text-green-100">—</p>
            )}
          </div>
        </div>

        {/* QUEUE */}
        <div className="flex flex-col">
          <div className={`rounded-2xl p-6 flex-1 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Waiting Queue</h2>
              <span className={`text-lg font-medium ${subColor}`}>{data?.totalWaiting || 0} waiting</span>
            </div>
            {!data?.queue?.length ? (
              <div className="flex-1 flex items-center justify-center">
                <p className={`text-2xl ${subColor}`}>No patients waiting</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {data.queue.map((entry, i) => (
                  <div key={entry.id} className={`flex items-center gap-4 p-4 rounded-xl ${i === 0 ? 'bg-blue-100 border-2 border-blue-400' : isDark ? 'bg-gray-700' : 'bg-white shadow-sm'}`}>
                    <span className={`text-3xl font-black ${i === 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      #{entry.queue_number}
                    </span>
                    <div className="flex-1">
                      <p className="text-lg font-semibold">{entry.first_name} {entry.last_name}</p>
                    </div>
                    {i === 0 && <span className="text-sm font-medium text-blue-600">Next in line</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`text-center mt-6 ${subColor} text-sm`}>
        {connected ? 'Real-time WebSocket' : 'Auto-refreshing every 10 seconds'} • Vision Healthcare ERP
      </div>
    </div>
  );
}
