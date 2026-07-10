import { Card, CardBody } from '../components/ui';
import { UserCog, Palette, Bell, Globe, Printer, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  { title: 'Profile Settings', desc: 'Update your personal information', path: '/user-preferences', icon: UserCog },
  { title: 'Appearance', desc: 'Theme, language, and display preferences', path: '/user-preferences', icon: Palette },
  { title: 'Notifications', desc: 'Configure notification preferences', path: '/notification-templates', icon: Bell },
  { title: 'Regional Settings', desc: 'Currency, timezone, and locale', path: '/regions', icon: Globe },
  { title: 'Print Templates', desc: 'Customize printed documents', path: '/print-templates', icon: Printer },
  { title: 'Security', desc: 'Password, 2FA, and session management', path: '/security', icon: Shield },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(s.path)}>
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
