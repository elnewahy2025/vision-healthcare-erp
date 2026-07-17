import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../stores/authStore';
import {
  LayoutDashboard, Users, CalendarCheck, FileText,
  Receipt, PillBottle, FlaskConical, ScanLine,
  Package, UsersRound, BarChart3, Settings,
  Shield, X, ChevronLeft, Stethoscope,
  ListOrdered, ArrowLeftRight, Home, Video,
  ScrollText, ShieldCheck, ClipboardList, GitBranch,
  Building2, Activity, FormInput, Scale,
  Bot, LayoutDashboard as BiIcon, FileSpreadsheet, Puzzle,
  CreditCard, Palette, HardDrive, Globe,
  UserRound, CalendarPlus, MessageSquare,
  KeyRound, Download, Monitor,
  Upload, UserCog,
  Printer, Send, Shield as ShieldIcon,
  Zap, Barcode, Database,
  PhoneCall, Phone, MessageCircle,
  Wallet, Calendar, TrendingUp, UserCheck, Heart, Smartphone, Code, User, Bell,
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
  { path: '/notifications', icon: Bell, labelKey: 'nav.notifications' },
  { path: '/billing', icon: Receipt, labelKey: 'nav.billing' },
  // Operations
  { path: '/insurance', icon: ShieldCheck, labelKey: 'nav.insurance' },
  { path: '/inventory', icon: Package, labelKey: 'nav.inventory' },
  { path: '/hr', icon: UsersRound, labelKey: 'nav.hr' },
  { path: '/crm', icon: BarChart3, labelKey: 'nav.crm' },
  { path: '/dms', icon: FileText, labelKey: 'nav.dms' },
  { path: '/workflow', icon: GitBranch, labelKey: 'nav.workflow' },
  { path: '/forms', icon: ClipboardList, labelKey: 'nav.forms' },
  { path: '/compliance', icon: ScrollText, labelKey: 'nav.compliance' },
  { path: '/ai-hub', icon: Bot, labelKey: 'nav.aiHub' },
  { path: '/bi', icon: BiIcon, labelKey: 'nav.bi' },
  { path: '/reports', icon: FileSpreadsheet, labelKey: 'nav.reports' },
  { path: '/financial-reports', icon: BarChart3, labelKey: 'nav.financialReports' },
  { path: '/insurance-claims', icon: ShieldCheck, labelKey: 'nav.insuranceClaims' },
  { path: '/integrations', icon: Puzzle, labelKey: 'nav.integrations' },
  { path: '/saas-billing', icon: CreditCard, labelKey: 'nav.saasBilling' },
  { path: '/white-label', icon: Palette, labelKey: 'nav.whiteLabel' },
  { path: '/compliance-reports', icon: Shield, labelKey: 'nav.complianceReports' },
  { path: '/dr-backup', icon: HardDrive, labelKey: 'nav.drBackup' },
  { path: '/regions', icon: Globe, labelKey: 'nav.regions' },
  { path: '/patient-portal', icon: UserRound, labelKey: 'nav.patientPortal' },
  { path: '/online-booking', icon: CalendarPlus, labelKey: 'nav.onlineBooking' },
  { path: '/patient-messages', icon: MessageSquare, labelKey: 'nav.patientMessages' },
  { path: '/api-keys', icon: KeyRound, labelKey: 'nav.apiKeys' },
  { path: '/data-export', icon: Download, labelKey: 'nav.dataExport' },
  { path: '/system-monitor', icon: Monitor, labelKey: 'nav.systemMonitor' },
  { path: '/bulk-import', icon: Upload, labelKey: 'nav.bulkImport' },
  { path: '/data-import-advanced', icon: Upload, labelKey: 'nav.dataImport' },
  { path: '/user-preferences', icon: UserCog, labelKey: 'nav.userPreferences' },
  { path: '/print-templates', icon: Printer, labelKey: 'nav.printTemplates' },
  { path: '/communications', icon: Send, labelKey: 'nav.communications' },
  { path: '/whatsapp', icon: MessageCircle, labelKey: 'nav.whatsapp' },
  { path: '/whatsapp-templates', icon: MessageCircle, labelKey: 'nav.whatsappTemplates' },
  { path: '/voice-calls', icon: PhoneCall, labelKey: 'nav.voiceCalls' },
  { path: '/chat', icon: MessageSquare, labelKey: 'nav.chat' },
  { path: '/expenses', icon: Wallet, labelKey: 'nav.expenseTracking' },
  { path: '/eta-invoicing', icon: FileText, labelKey: 'nav.etaInvoicing' },
  { path: '/clinical-ai', icon: Bot, labelKey: 'nav.clinicalAI' },
  { path: '/predictive-analytics', icon: TrendingUp, labelKey: 'nav.predictiveAnalytics' },
  { path: '/smart-scheduling', icon: Calendar, labelKey: 'nav.smartScheduling' },
  { path: '/kiosk', icon: UserCheck, labelKey: 'nav.kiosk' },
  { path: '/queue-display', icon: ListOrdered, labelKey: 'nav.queueDisplay' },
  { path: '/post-visit-survey', icon: Heart, labelKey: 'nav.postVisitSurvey' },
  { path: '/patient-app', icon: Smartphone, labelKey: 'nav.patientApp' },
  { path: '/automation', icon: Zap, labelKey: 'nav.automation' },
  { path: '/barcodes', icon: Barcode, labelKey: 'nav.barcodes' },
  { path: '/data-warehouse', icon: Database, labelKey: 'nav.dataWarehouse' },
  { path: '/sessions', icon: ShieldIcon, labelKey: 'nav.sessions' },
  { path: '/branches', icon: Building2, labelKey: 'nav.multiBranch' },
  { path: '/analytics-dashboard' , icon: BarChart3, labelKey: 'nav.analyticsDashboard' },
  { path: '/patient-self-service' , icon: User, labelKey: 'nav.patientSelfService' },
  { path: '/pharmacy-advanced' , icon: PillBottle, labelKey: 'nav.pharmacyAdvanced' },
  { path: '/insurance-claims-lifecycle' , icon: ShieldCheck, labelKey: 'nav.claimsLifecycle' },
  { path: '/advanced-reporting' , icon: FileText, labelKey: 'nav.advancedReporting' },
  { path: '/developer-portal' , icon: Code, labelKey: 'nav.developerPortal' },
];

const secondaryNavItems = [
  { path: '/reports', icon: BarChart3, labelKey: 'nav.reports' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
  { path: '/admin', icon: Shield, labelKey: 'nav.admin' },
  { path: '/security', icon: Shield, labelKey: 'nav.security' },
  { path: '/audit-logs', icon: ClipboardList, labelKey: 'nav.auditLogs' },
  { path: '/audit-logs-advanced', icon: ClipboardList, labelKey: 'nav.auditLogsAdvanced' },
  { path: '/notification-templates', icon: MessageSquare, labelKey: 'nav.notificationTemplates' },
  { path: '/notification-logs', icon: Send, labelKey: 'nav.notificationLogs' },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { tenant } = useAuth();
  const isRtl = i18n.language === 'ar';

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
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:z-auto
          ${isRtl ? 'right-0 translate-x-full border-l' : 'left-0 -translate-x-full border-r'}
          ${open ? 'translate-x-0' : ''}
        `}
        aria-label="Sidebar navigation"
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 truncate">
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

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)] overscroll-contain">
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
                `min-h-[44px] ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{t(item.labelKey)}</span>
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
                  `min-h-[44px] ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
