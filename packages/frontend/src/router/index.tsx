/**
 * Route configuration for Vision Healthcare ERP.
 *
 * All routes are defined in App.tsx using React Router v6.
 * This file provides the route definitions as a single source of truth
 * for navigation menus, breadcrumbs, and permission gating.
 */

export interface AppRoute {
  path: string;
  label: string;
  labelKey: string;
  icon?: string;
  children?: AppRoute[];
  requiredPermission?: string;
}

export const appRoutes: AppRoute[] = [
  { path: '/', label: 'Dashboard', labelKey: 'nav.dashboard', icon: 'LayoutDashboard' },
  { path: '/patients', label: 'Patients', labelKey: 'nav.patients', icon: 'Users' },
  { path: '/appointments', label: 'Appointments', labelKey: 'nav.appointments', icon: 'CalendarCheck' },
  { path: '/emr', label: 'Medical Records', labelKey: 'nav.emr', icon: 'FileText' },
  { path: '/billing', label: 'Billing', labelKey: 'nav.billing', icon: 'Receipt' },
  { path: '/pharmacy', label: 'Pharmacy', labelKey: 'nav.pharmacy', icon: 'PillBottle' },
  { path: '/laboratory', label: 'Laboratory', labelKey: 'nav.laboratory', icon: 'FlaskConical' },
  { path: '/radiology', label: 'Radiology', labelKey: 'nav.radiology', icon: 'ScanLine' },
  { path: '/inventory', label: 'Inventory', labelKey: 'nav.inventory', icon: 'Package' },
  { path: '/hr', label: 'HR & Payroll', labelKey: 'nav.hr', icon: 'UsersRound' },
  { path: '/reports', label: 'Reports', labelKey: 'nav.reports', icon: 'BarChart3' },
  { path: '/settings', label: 'Settings', labelKey: 'nav.settings', icon: 'Settings' },
  { path: '/admin', label: 'Administration', labelKey: 'nav.admin', icon: 'Shield' },
];
