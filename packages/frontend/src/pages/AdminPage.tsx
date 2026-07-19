import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Database, Settings, Key, Activity } from 'lucide-react';
import { Card, CardBody } from '../components/ui';

interface AdminSection {
  titleKey: string;
  descKey: string;
  path: string;
  icon: typeof Shield;
}

export default function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sections: AdminSection[] = [
    { titleKey: 'admin.userManagement', descKey: 'admin.userManagementDesc', path: '/hr', icon: Users },
    { titleKey: 'admin.securitySettings', descKey: 'admin.securitySettingsDesc', path: '/security', icon: Key },
    { titleKey: 'admin.systemMonitor', descKey: 'admin.systemMonitorDesc', path: '/system-monitor', icon: Activity },
    { titleKey: 'admin.auditLogs', descKey: 'admin.auditLogsDesc', path: '/audit-logs', icon: Shield },
    { titleKey: 'admin.dataManagement', descKey: 'admin.dataManagementDesc', path: '/data-export', icon: Database },
    { titleKey: 'admin.integrations', descKey: 'admin.integrationsDesc', path: '/integrations', icon: Settings },
  ];

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('admin.title')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Card
            key={s.path}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleNavigate(s.path)}
          >
            <CardBody className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <s.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{t(s.titleKey)}</h3>
              </div>
              <p className="text-sm text-gray-500">{t(s.descKey)}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
