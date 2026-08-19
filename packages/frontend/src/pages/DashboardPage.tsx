import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, appointmentsApi } from '../lib/api';
import { Spinner } from '../components/ui';
import {
  CalendarCheck, Receipt, Users, DollarSign,
  Stethoscope, TrendingUp, ArrowUp, ArrowDown,
  Clock, CheckCircle, XCircle, UserCheck,
  Activity, Plus,
} from 'lucide-react';
import { apiClient } from '../lib/api/client';

interface DashboardStats {
  totalPatients: number;
  totalAppointments: number;
  todayAppointments: number;
  pendingBills: number;
  revenueToday: number;
  activeDoctors: number;
}

interface TodayData {
  counts: {
    scheduled: number;
    checkedIn: number;
    completed: number;
    inProgress: number;
    cancelled: number;
    noShow: number;
  };
  appointments: TodayAppointment[];
}

interface TodayAppointment {
  id: string;
  patientName: string;
  doctorName: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface ActivityItem {
  action: string;
  entity_type: string;
  created_at: string;
  user_name?: string;
  details?: string;
}

function formatActivityAction(action: string): { text: string; icon: typeof UserCheck; color: string } {
  const actionMap: Record<string, { text: string; icon: typeof UserCheck; color: string }> = {
    'user.login': { text: 'User logged in', icon: UserCheck, color: 'bg-[var(--success-soft)] text-[var(--success)]' },
    'patient.created': { text: 'New patient registered', icon: Plus, color: 'bg-[var(--success-soft)] text-[var(--success)]' },
    'patient.list': { text: 'Patient records viewed', icon: Users, color: 'bg-[var(--info-soft)] text-[var(--info)]' },
    'appointment.created': { text: 'Appointment scheduled', icon: CalendarCheck, color: 'bg-[var(--info-soft)] text-[var(--info)]' },
    'appointment.checked_in': { text: 'Patient checked in', icon: CheckCircle, color: 'bg-[var(--info-soft)] text-[var(--info)]' },
    'appointment.completed': { text: 'Appointment completed', icon: CheckCircle, color: 'bg-[var(--success-soft)] text-[var(--success)]' },
    'appointment.cancelled': { text: 'Appointment cancelled', icon: XCircle, color: 'bg-[var(--error-soft)] text-[var(--error)]' },
    'invoice.created': { text: 'Invoice created', icon: Receipt, color: 'bg-[var(--info-soft)] text-[var(--info)]' },
    'invoice.paid': { text: 'Payment received', icon: DollarSign, color: 'bg-[var(--success-soft)] text-[var(--success)]' },
    'emr.record_created': { text: 'Medical record added', icon: Activity, color: 'bg-[var(--info-soft)] text-[var(--info)]' },
    'lab.order_created': { text: 'Lab order placed', icon: Activity, color: 'bg-[var(--info-soft)] text-[var(--info)]' },
    'lab.results_saved': { text: 'Lab results saved', icon: CheckCircle, color: 'bg-[var(--success-soft)] text-[var(--success)]' },
    'pharmacy.prescription_created': { text: 'Prescription created', icon: Activity, color: 'bg-[var(--info-soft)] text-[var(--info)]' },
    'pharmacy.prescription_dispensed': { text: 'Prescription dispensed', icon: CheckCircle, color: 'bg-[var(--success-soft)] text-[var(--success)]' },
    'queue.entry_added': { text: 'Patient added to queue', icon: Clock, color: 'bg-[var(--info-soft)] text-[var(--info)]' },
    'queue.patient_called': { text: 'Patient called from queue', icon: Stethoscope, color: 'bg-[var(--info-soft)] text-[var(--info)]' },
  };

  if (actionMap[action]) return actionMap[action];

  // Generic mapping for unknown actions
  if (action.includes('created') || action.includes('added')) {
    return { text: action.replace(/[._]/g, ' '), icon: Plus, color: 'bg-[var(--success-soft)] text-[var(--success)]' };
  }
  if (action.includes('deleted') || action.includes('cancelled')) {
    return { text: action.replace(/[._]/g, ' '), icon: XCircle, color: 'bg-[var(--error-soft)] text-[var(--error)]' };
  }
  if (action.includes('updated') || action.includes('edited')) {
    return { text: action.replace(/[._]/g, ' '), icon: Activity, color: 'bg-[var(--info-soft)] text-[var(--info)]' };
  }
  return { text: action.replace(/[._]/g, ' '), icon: Activity, color: 'bg-[var(--surface-secondary)] text-[var(--text-muted)]' };
}

function timeAgo(dateStr: string, locale: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return locale === 'ar' ? 'الآن' : 'just now';
  if (diffMin < 60) return locale === 'ar' ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`;
  if (diffHr < 24) return locale === 'ar' ? `منذ ${diffHr} ساعة` : `${diffHr}h ago`;
  return locale === 'ar' ? `منذ ${diffDay} يوم` : `${diffDay}d ago`;
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0, totalAppointments: 0, todayAppointments: 0,
    pendingBills: 0, revenueToday: 0, activeDoctors: 0,
  });
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsResult, todayResult] = await Promise.all([
        dashboardApi.stats(),
        appointmentsApi.today().catch(() => null),
      ]);
      if (statsResult) setStats(statsResult);
      if (todayResult) setTodayData(todayResult);

      // Fetch recent activity from the real audit_logs via widget API
      try {
        const actRes = await apiClient.get('/dashboard/widgets/recent_activity/data');
        const items = actRes.data?.data?.data?.items || [];
        setRecentActivity(items.slice(0, 8));
      } catch {
        // Widget API may not be available — graceful fallback
        setRecentActivity([]);
      }
    } catch {
      // Stats API failed — show zeros
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const statCards = [
    {
      label: t('dashboard.todayAppointments'),
      value: stats.todayAppointments,
      icon: CalendarCheck,
      color: 'bg-blue-500',
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: t('dashboard.totalPatients'),
      value: stats.totalPatients,
      icon: Users,
      color: 'bg-green-500',
      iconBg: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: t('dashboard.pendingBills'),
      value: stats.pendingBills,
      icon: Receipt,
      color: 'bg-yellow-500',
      iconBg: 'bg-yellow-50 dark:bg-yellow-900/30',
    },
    {
      label: t('dashboard.revenueToday'),
      value: stats.revenueToday,
      icon: DollarSign,
      color: 'bg-purple-500',
      iconBg: 'bg-purple-50 dark:bg-purple-900/30',
      isCurrency: true,
    },
    {
      label: t('dashboard.activeDoctors'),
      value: stats.activeDoctors,
      icon: Stethoscope,
      color: 'bg-teal-500',
      iconBg: 'bg-teal-50 dark:bg-teal-900/30',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="text-muted-txt mt-1">
            {new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/analytics-dashboard')}>
          <TrendingUp className="w-4 h-4" />
          {t('common.viewReports') || 'View Reports'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {statCards.map((card, idx) => (
          <div key={idx} className="stat-card">
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
            <p className="stat-label mt-3">{card.label}</p>
            <p className="stat-value">
              {card.isCurrency
                ? `${Number(stats.revenueToday || 0).toLocaleString()} ${(i18n.language === 'ar' ? 'ريال' : 'SAR')}`
                : Number(card.value || 0).toLocaleString()
              }
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary-600" />
              {t('appointment.today') || 'Today\'s Appointments'}
            </h2>
          </div>
          <div className="card-body">
            {todayData && todayData.counts ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-[var(--surface-secondary)] rounded-lg">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{todayData.counts.scheduled}</p>
                    <p className="text-xs text-[var(--text-muted)]">{t('status.scheduled') || 'Scheduled'}</p>
                  </div>
                  <div className="text-center p-3 bg-[var(--info-soft)] rounded-lg">
                    <p className="text-2xl font-bold text-[var(--info)]">{todayData.counts.checkedIn}</p>
                    <p className="text-xs text-[var(--info)]">{t('status.checkedIn') || 'Checked In'}</p>
                  </div>
                  <div className="text-center p-3 bg-[var(--success-soft)] rounded-lg">
                    <p className="text-2xl font-bold text-[var(--success)]">{todayData.counts.completed}</p>
                    <p className="text-xs text-[var(--success)]">{t('status.completed') || 'Completed'}</p>
                  </div>
                  <div className="text-center p-3 bg-[var(--warning-soft)] rounded-lg">
                    <p className="text-2xl font-bold text-[var(--warning)]">{todayData.counts.inProgress}</p>
                    <p className="text-xs text-[var(--warning)]">{t('status.inProgress') || 'In Progress'}</p>
                  </div>
                  <div className="text-center p-3 bg-[var(--error-soft)] rounded-lg">
                    <p className="text-2xl font-bold text-[var(--error)]">{todayData.counts.cancelled}</p>
                    <p className="text-xs text-[var(--error)]">{t('status.cancelled') || 'Cancelled'}</p>
                  </div>
                  <div className="text-center p-3 bg-[var(--surface-secondary)] rounded-lg">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{todayData.counts.noShow || 0}</p>
                    <p className="text-xs text-[var(--text-muted)]">{t('status.noShow') || 'No Show'}</p>
                  </div>
                </div>

                {todayData.appointments && todayData.appointments.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {todayData.appointments.slice(0, 5).map((apt: TodayAppointment) => (
                      <div key={apt.id} className="flex items-center gap-3 p-3 bg-[var(--surface-secondary)] rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${
                          apt.status === 'completed' ? 'bg-green-500' :
                          apt.status === 'checked_in' ? 'bg-blue-500' :
                          apt.status === 'cancelled' ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{apt.patientName}</p>
                          <p className="text-xs text-[var(--text-muted)]">{apt.startTime} - {apt.endTime}</p>
                        </div>
                        <span className={`badge ${
                          apt.status === 'completed' ? 'badge-success' :
                          apt.status === 'checked_in' ? 'badge-info' :
                          apt.status === 'cancelled' ? 'badge-danger' : 'badge-warning'
                        }`}>{apt.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-txt text-sm text-center py-8">{t('common.noData') || 'No appointments today'}</p>
            )}
          </div>
        </div>

        {/* Recent Activity — REAL DATA from audit_logs */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-600" />
              {t('dashboard.recentActivity') || 'Recent Activity'}
            </h2>
          </div>
          <div className="card-body">
            {recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((item, i) => {
                  const mapped = formatActivityAction(item.action);
                  const Icon = mapped.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 bg-[var(--surface-secondary)] rounded-lg">
                      <div className={`w-8 h-8 ${mapped.color} p-1.5 rounded-lg flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{mapped.text}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {item.entity_type || ''} {item.user_name ? `· ${item.user_name}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {timeAgo(item.created_at, i18n.language)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-muted)]">
                  {t('dashboard.noActivity') || 'No recent activity'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
