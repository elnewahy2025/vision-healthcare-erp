import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { UserCog, Palette, Bell, Globe, Printer, Shield } from 'lucide-react';
import { Card, CardBody } from '../components/ui';

interface SettingsSection {
  titleKey: string;
  descKey: string;
  path: string;
  icon: typeof Shield;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sections: SettingsSection[] = [
    { titleKey: 'settings.profileSettings', descKey: 'settings.profileSettingsDesc', path: '/user-preferences', icon: UserCog },
    { titleKey: 'settings.appearance', descKey: 'settings.appearanceDesc', path: '/user-preferences', icon: Palette },
    { titleKey: 'settings.notifications', descKey: 'settings.notificationsDesc', path: '/notification-templates', icon: Bell },
    { titleKey: 'settings.regionalSettings', descKey: 'settings.regionalSettingsDesc', path: '/regions', icon: Globe },
    { titleKey: 'settings.printTemplates', descKey: 'settings.printTemplatesDesc', path: '/print-templates', icon: Printer },
    { titleKey: 'settings.security', descKey: 'settings.securityDesc', path: '/security', icon: Shield },
  ];

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Card
            key={s.path + s.titleKey}
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
