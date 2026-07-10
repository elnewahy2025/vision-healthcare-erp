import { Card, CardBody } from '../components/ui';
import { Shield, Users, Database, Settings, Key, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  { title: 'User Management', desc: 'Manage staff accounts and roles', path: '/hr', icon: Users },
  { title: 'Security Settings', desc: 'Authentication, 2FA, and access control', path: '/security', icon: Key },
  { title: 'System Monitor', desc: 'Server health and performance', path: '/system-monitor', icon: Activity },
  { title: 'Audit Logs', desc: 'Activity tracking and compliance', path: '/audit-logs', icon: Shield },
  { title: 'Data Management', desc: 'Import, export, and backup settings', path: '/data-export', icon: Database },
  { title: 'Integrations', desc: 'Third-party service connections', path: '/integrations', icon: Settings },
];

export default function AdminPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Card key={s.path} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(s.path)}>
            <CardBody className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary-100 rounded-lg"><s.icon className="w-5 h-5 text-primary-600" /></div>
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
              </div>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
