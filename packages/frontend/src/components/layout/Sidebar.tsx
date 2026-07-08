import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../stores/authStore';
import {
  LayoutDashboard, Users, CalendarCheck, FileText,
  Receipt, PillBottle, FlaskConical, ScanLine,
  Package, UsersRound, BarChart3, Settings,
  Shield, X, ChevronLeft, Stethoscope,
  ListOrdered, ArrowLeftRight, Home, Video,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/patients', icon: Users, labelKey: 'nav.patients' },
  { path: '/appointments', icon: CalendarCheck, labelKey: 'nav.appointments' },
  { path: '/emr', icon: FileText, labelKey: 'nav.emr' },
  { path: '/laboratory', icon: FlaskConical, labelKey: 'nav.laboratory' },
  { path: '/radiology', icon: ScanLine, labelKey: 'nav.radiology' },
  { path: '/pharmacy', icon: PillBottle, labelKey: 'nav.pharmacy' },
  { path: '/queue', icon: ListOrdered, labelKey: 'Queue' },
  { path: '/referrals', icon: ArrowLeftRight, labelKey: 'Referrals' },
  { path: '/nursing', icon: Stethoscope, labelKey: 'Nursing' },
  { path: '/home-visits', icon: Home, labelKey: 'Home Visits' },
  { path: '/telemedicine', icon: Video, labelKey: 'Telemedicine' },
  { path: '/billing', icon: Receipt, labelKey: 'nav.billing' },
];

const secondaryNavItems = [
  { path: '/pharmacy', icon: PillBottle, labelKey: 'nav.pharmacy' },
  { path: '/laboratory', icon: FlaskConical, labelKey: 'nav.laboratory' },
  { path: '/radiology', icon: ScanLine, labelKey: 'nav.radiology' },
  { path: '/inventory', icon: Package, labelKey: 'nav.inventory' },
  { path: '/hr', icon: UsersRound, labelKey: 'nav.hr' },
  { path: '/reports', icon: BarChart3, labelKey: 'nav.reports' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
  { path: '/admin', icon: Shield, labelKey: 'nav.admin' },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { tenant } = useAuth();
  const isRtl = i18n.language === 'ar';

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-0 bottom-0 z-50 w-64 bg-white border-l border-gray-200
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isRtl ? 'right-0 translate-x-full' : 'left-0 -translate-x-full'}
          ${open ? 'translate-x-0' : ''}
        `}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">
              {tenant?.settings?.theme?.brandName || t('app.name')}
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <div className="mb-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('nav.dashboard')}
            </p>
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-200">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t('nav.settings')}
            </p>
            {secondaryNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
