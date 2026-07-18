import { useState, useMemo, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../stores/authStore';
import {
  LayoutDashboard, Users, CalendarCheck, FileText,
  Receipt, PillBottle, FlaskConical, ScanLine,
  Package, UsersRound, BarChart3, Settings,
  Shield, X, ChevronDown, Stethoscope,
  ListOrdered, ArrowLeftRight, Home, Video,
  ScrollText, ShieldCheck, ClipboardList, GitBranch,
  Building2,
  Bot, LayoutDashboard as BiIcon, FileSpreadsheet, Puzzle,
  CreditCard, Palette, HardDrive, Globe,
  UserRound, CalendarPlus, MessageSquare,
  KeyRound, Download, Monitor,
  Upload, UserCog,
  Printer, Send, Shield as ShieldIcon,
  Zap, Barcode, Database,
  PhoneCall, MessageCircle,
  Wallet, Calendar, TrendingUp, UserCheck, Heart, Smartphone, Code, User, Bell,
  Search,
} from 'lucide-react';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
}

interface NavGroup {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'patient-care',
    labelKey: 'navGroup.patientCare',
    icon: Stethoscope,
    items: [
      { path: '/patients', icon: Users, labelKey: 'nav.patients' },
      { path: '/appointments', icon: CalendarCheck, labelKey: 'nav.appointments' },
      { path: '/emr', icon: FileText, labelKey: 'nav.emr' },
      { path: '/queue', icon: ListOrdered, labelKey: 'nav.queue' },
      { path: '/referrals', icon: ArrowLeftRight, labelKey: 'nav.referrals' },
      { path: '/nursing', icon: Stethoscope, labelKey: 'nav.nursing' },
      { path: '/home-visits', icon: Home, labelKey: 'nav.homeVisits' },
      { path: '/telemedicine', icon: Video, labelKey: 'nav.telemedicine' },
    ],
  },
  {
    id: 'clinical',
    labelKey: 'navGroup.clinical',
    icon: FlaskConical,
    items: [
      { path: '/laboratory', icon: FlaskConical, labelKey: 'nav.laboratory' },
      { path: '/radiology', icon: ScanLine, labelKey: 'nav.radiology' },
      { path: '/pharmacy', icon: PillBottle, labelKey: 'nav.pharmacy' },
    ],
  },
  {
    id: 'financial',
    labelKey: 'navGroup.financial',
    icon: Receipt,
    items: [
      { path: '/billing', icon: Receipt, labelKey: 'nav.billing' },
      { path: '/insurance', icon: ShieldCheck, labelKey: 'nav.insurance' },
      { path: '/insurance-claims', icon: ShieldCheck, labelKey: 'nav.insuranceClaims' },
      { path: '/expenses', icon: Wallet, labelKey: 'nav.expenseTracking' },
      { path: '/eta-invoicing', icon: FileText, labelKey: 'nav.etaInvoicing' },
    ],
  },
  {
    id: 'operations',
    labelKey: 'navGroup.operations',
    icon: Package,
    items: [
      { path: '/inventory', icon: Package, labelKey: 'nav.inventory' },
      { path: '/hr', icon: UsersRound, labelKey: 'nav.hr' },
      { path: '/crm', icon: BarChart3, labelKey: 'nav.crm' },
      { path: '/dms', icon: FileText, labelKey: 'nav.dms' },
      { path: '/workflow', icon: GitBranch, labelKey: 'nav.workflow' },
      { path: '/forms', icon: ClipboardList, labelKey: 'nav.forms' },
      { path: '/compliance', icon: ScrollText, labelKey: 'nav.compliance' },
      { path: '/automation', icon: Zap, labelKey: 'nav.automation' },
    ],
  },
  {
    id: 'analytics',
    labelKey: 'navGroup.analytics',
    icon: BarChart3,
    items: [
      { path: '/bi', icon: BiIcon, labelKey: 'nav.bi' },
      { path: '/reports', icon: FileSpreadsheet, labelKey: 'nav.reports' },
      { path: '/financial-reports', icon: BarChart3, labelKey: 'nav.financialReports' },
      { path: '/compliance-reports', icon: Shield, labelKey: 'nav.complianceReports' },
      { path: '/advanced-reporting', icon: FileText, labelKey: 'nav.advancedReporting' },
      { path: '/analytics-dashboard', icon: BarChart3, labelKey: 'nav.analyticsDashboard' },
    ],
  },
  {
    id: 'ai',
    labelKey: 'navGroup.ai',
    icon: Bot,
    items: [
      { path: '/ai-hub', icon: Bot, labelKey: 'nav.aiHub' },
      { path: '/clinical-ai', icon: Bot, labelKey: 'nav.clinicalAI' },
      { path: '/predictive-analytics', icon: TrendingUp, labelKey: 'nav.predictiveAnalytics' },
      { path: '/smart-scheduling', icon: Calendar, labelKey: 'nav.smartScheduling' },
    ],
  },
  {
    id: 'communication',
    labelKey: 'navGroup.communication',
    icon: MessageSquare,
    items: [
      { path: '/notifications', icon: Bell, labelKey: 'nav.notifications' },
      { path: '/communications', icon: Send, labelKey: 'nav.communications' },
      { path: '/whatsapp', icon: MessageCircle, labelKey: 'nav.whatsapp' },
      { path: '/whatsapp-templates', icon: MessageCircle, labelKey: 'nav.whatsappTemplates' },
      { path: '/voice-calls', icon: PhoneCall, labelKey: 'nav.voiceCalls' },
      { path: '/chat', icon: MessageSquare, labelKey: 'nav.chat' },
      { path: '/patient-messages', icon: MessageSquare, labelKey: 'nav.patientMessages' },
    ],
  },
  {
    id: 'patient-experience',
    labelKey: 'navGroup.patientExperience',
    icon: Heart,
    items: [
      { path: '/patient-portal', icon: UserRound, labelKey: 'nav.patientPortal' },
      { path: '/online-booking', icon: CalendarPlus, labelKey: 'nav.onlineBooking' },
      { path: '/patient-app', icon: Smartphone, labelKey: 'nav.patientApp' },
      { path: '/patient-self-service', icon: User, labelKey: 'nav.patientSelfService' },
      { path: '/post-visit-survey', icon: Heart, labelKey: 'nav.postVisitSurvey' },
      { path: '/kiosk', icon: UserCheck, labelKey: 'nav.kiosk' },
      { path: '/queue-display', icon: ListOrdered, labelKey: 'nav.queueDisplay' },
    ],
  },
  {
    id: 'platform',
    labelKey: 'navGroup.platform',
    icon: Puzzle,
    items: [
      { path: '/saas-billing', icon: CreditCard, labelKey: 'nav.saasBilling' },
      { path: '/white-label', icon: Palette, labelKey: 'nav.whiteLabel' },
      { path: '/integrations', icon: Puzzle, labelKey: 'nav.integrations' },
      { path: '/dr-backup', icon: HardDrive, labelKey: 'nav.drBackup' },
      { path: '/regions', icon: Globe, labelKey: 'nav.regions' },
      { path: '/branches', icon: Building2, labelKey: 'nav.multiBranch' },
      { path: '/barcodes', icon: Barcode, labelKey: 'nav.barcodes' },
      { path: '/data-warehouse', icon: Database, labelKey: 'nav.dataWarehouse' },
    ],
  },
  {
    id: 'developer',
    labelKey: 'navGroup.developer',
    icon: Code,
    items: [
      { path: '/api-keys', icon: KeyRound, labelKey: 'nav.apiKeys' },
      { path: '/developer-portal', icon: Code, labelKey: 'nav.developerPortal' },
      { path: '/data-export', icon: Download, labelKey: 'nav.dataExport' },
      { path: '/bulk-import', icon: Upload, labelKey: 'nav.bulkImport' },
      { path: '/data-import-advanced', icon: Upload, labelKey: 'nav.dataImport' },
    ],
  },
];

const secondaryItems: NavItem[] = [
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
  { path: '/admin', icon: Shield, labelKey: 'nav.admin' },
  { path: '/security', icon: Shield, labelKey: 'nav.security' },
  { path: '/audit-logs', icon: ClipboardList, labelKey: 'nav.auditLogs' },
  { path: '/audit-logs-advanced', icon: ClipboardList, labelKey: 'nav.auditLogsAdvanced' },
  { path: '/notification-templates', icon: MessageSquare, labelKey: 'nav.notificationTemplates' },
  { path: '/notification-logs', icon: Send, labelKey: 'nav.notificationLogs' },
  { path: '/sessions', icon: ShieldIcon, labelKey: 'nav.sessions' },
  { path: '/system-monitor', icon: Monitor, labelKey: 'nav.systemMonitor' },
  { path: '/print-templates', icon: Printer, labelKey: 'nav.printTemplates' },
  { path: '/user-preferences', icon: UserCog, labelKey: 'nav.userPreferences' },
];

function SidebarGroup({
  group,
  isExpanded,
  onToggle,
  t,
  location,
  onNavigate,
}: {
  group: NavGroup;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
  location: ReturnType<typeof useLocation>;
  onNavigate: () => void;
}) {
  const hasActiveChild = group.items.some((item) =>
    location.pathname === item.path || location.pathname.startsWith(item.path + '/')
  );

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
          hasActiveChild && !isExpanded
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <group.icon className="w-5 h-5 shrink-0" />
        <span className="flex-1 text-left truncate">{t(group.labelKey)}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isExpanded && (
        <div className="ml-4 pl-3 border-l border-gray-200 mt-1 space-y-0.5">
          {group.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors min-h-[40px] ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { tenant } = useAuth();
  const location = useLocation();
  const isRtl = i18n.language === 'ar';

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const group of navGroups) {
      if (group.items.some((item) => location.pathname.startsWith(item.path))) {
        initial.add(group.id);
      }
    }
    return initial;
  });

  const [search, setSearch] = useState('');
  const [showSecondary, setShowSecondary] = useState(false);

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedGroups(new Set(navGroups.map((g) => g.id)));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return navGroups;
    const q = search.toLowerCase();
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            t(item.labelKey).toLowerCase().includes(q) ||
            item.path.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [search, t]);

  const filteredSecondary = useMemo(() => {
    if (!search.trim()) return secondaryItems;
    const q = search.toLowerCase();
    return secondaryItems.filter(
      (item) =>
        t(item.labelKey).toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q)
    );
  }, [search, t]);

  const totalItems = navGroups.reduce((sum, g) => sum + g.items.length, 0);

  const handleNavigate = useCallback(() => {
    onClose();
    setSearch('');
  }, [onClose]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed top-0 bottom-0 z-50 w-64 bg-white border-gray-200
          flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:z-40
          ${isRtl ? 'right-0 translate-x-full border-l' : 'left-0 -translate-x-full border-r'}
          ${open ? 'translate-x-0' : ''}
        `}
        aria-label="Sidebar navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 truncate text-sm">
              {tenant?.settings?.theme?.brandName || t('app.name')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('sidebar.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400"
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <span className="text-xs text-gray-400">
              {search
                ? `${filteredGroups.reduce((s, g) => s + g.items.length, 0) + filteredSecondary.length} ${t('sidebar.results')}`
                : `${totalItems + secondaryItems.length} ${t('sidebar.modules')}`}
            </span>
            <div className="flex gap-1">
              <button onClick={expandAll} className="text-xs text-primary-600 hover:text-primary-700">
                {t('sidebar.expandAll')}
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={collapseAll} className="text-xs text-primary-600 hover:text-primary-700">
                {t('sidebar.collapseAll')}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-0.5">
          {/* Dashboard (standalone) */}
          {!search.trim() && (
            <NavLink
              to="/"
              end
              onClick={handleNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span>{t('nav.dashboard')}</span>
            </NavLink>
          )}

          {/* Grouped nav items */}
          {filteredGroups.map((group) => (
            <SidebarGroup
              key={group.id}
              group={group}
              isExpanded={search.trim() ? true : expandedGroups.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
              t={t}
              location={location}
              onNavigate={handleNavigate}
            />
          ))}

          {/* Secondary items (Settings/Admin) */}
          {filteredSecondary.length > 0 && (
            <div className="pt-3 mt-3 border-t border-gray-200">
              <button
                onClick={() => setShowSecondary((v) => !v)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors min-h-[44px] text-gray-700 hover:bg-gray-100"
              >
                <Settings className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left truncate">{t('nav.settings')}</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    showSecondary ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {(showSecondary || !!search.trim()) && (
                <div className="ml-4 pl-3 border-l border-gray-200 mt-1 space-y-0.5">
                  {filteredSecondary.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={handleNavigate}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors min-h-[40px] ${
                          isActive
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
