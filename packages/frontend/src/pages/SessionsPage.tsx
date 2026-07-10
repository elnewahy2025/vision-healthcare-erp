import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button } from '../components/ui';
import { Monitor, Smartphone, Globe, Clock, Shield, LogOut, AlertTriangle } from 'lucide-react';
import api from '../lib/api';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [securityInfo, setSecurityInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sR, secR] = await Promise.all([
        api.get('/sessions'),
        api.get('/sessions/security-info'),
      ]);
      setSessions(sR.data.data);
      setSecurityInfo(secR.data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Active Sessions</h1><p className="text-gray-500 mt-1">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardBody><p className="text-sm text-gray-500">Active Sessions</p><p className="text-2xl font-bold">{securityInfo?.activeSessions || 0}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-gray-500">Last Login</p><p className="text-sm font-medium">{securityInfo?.lastLogin?.split('T')[0] || 'N/A'}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-gray-500">Last IP</p><p className="text-sm font-mono">{securityInfo?.lastIp || 'N/A'}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-gray-500">Device</p><p className="text-sm font-medium capitalize">{securityInfo?.lastDevice || 'N/A'}</p></CardBody></Card>
      </div>

      {sessions.length > 1 && (
        <Card className="mb-4 bg-yellow-50 border-yellow-200">
          <CardBody className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-yellow-800">You have {sessions.length - 1} other active session{sessions.length - 1 !== 1 ? 's' : ''}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={async () => { await api.post('/sessions/logout-others'); load(); }}>
              <LogOut className="w-3 h-3" /> Logout Others
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <Card><CardBody className="text-center py-8 text-gray-500">No sessions found</CardBody></Card>
        ) : sessions.map((s: any) => (
          <Card key={s.id}>
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {s.device === 'mobile' ? <Smartphone className="w-5 h-5 text-gray-500" /> : <Monitor className="w-5 h-5 text-gray-500" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{s.device || 'Unknown device'}</span>
                      {s.isCurrent && <Badge variant="success">Current</Badge>}
                      {!s.isActive && <Badge variant="gray">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <Globe className="w-3 h-3 inline mr-1" />
                      {s.ipAddress} · {s.userAgent?.substring(0, 60) || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span><Clock className="w-3 h-3 inline mr-1" />Active: {s.lastActivityAt?.split('T')[0]}</span>
                      <span>Created: {s.createdAt?.split('T')[0]}</span>
                      <span>Expires: {s.expiresAt?.split('T')[0]}</span>
                    </div>
                  </div>
                </div>
                {!s.isCurrent && (
                  <Button variant="ghost" size="sm" onClick={async () => { await api.post(`/sessions/${s.id}/logout`); load(); }}>
                    <LogOut className="w-3 h-3" /> Terminate
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
