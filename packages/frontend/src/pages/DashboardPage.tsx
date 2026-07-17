import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { dashboardApi, appointmentsApi } from '../lib/api';
import {
  CalendarCheck, Receipt, Users, DollarSign,
  Stethoscope, TrendingUp, ArrowUp, ArrowDown,
  Clock, CheckCircle, XCircle, UserCheck,
} from 'lucide-react';

interface DashboardStats {
  totalPatients: number;
  totalAppointments: number;
  todayAppointments: number;
  pendingBills: number;
  revenueToday: number;
  activeDoctors: number;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0, totalAppointments: 0, todayAppointments: 0,
    pendingBills: 0, revenueToday: 0, activeDoctors: 0,
  });
  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.stats(),
      appointmentsApi.today().catch(() => null),
    ]).then(([stats, today]) => {
      if (stats) setStats(stats);
      if (today) setTodayData(today);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: t('dashboard.todayAppointments'), value: stats.todayAppointments, icon: CalendarCheck, color: 'bg-blue-500', change: '+12%' },
    { label: t('dashboard.totalPatients'), value: stats.totalPatients, icon: Users, color: 'bg-green-500', change: '+5%' },
    { label: t('dashboard.pendingBills'), value: stats.pendingBills, icon: Receipt, color: 'bg-yellow-500', change: '-3%' },
    { label: t('dashboard.revenueToday'), value: `${(stats.revenueToday || 0).toLocaleString()} EGP`, icon: DollarSign, color: 'bg-purple-500', change: '+8%' },
    { label: t('dashboard.activeDoctors'), value: stats.activeDoctors, icon: Stethoscope, color: 'bg-teal-500', change: '0%' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn-primary">
          <TrendingUp className="w-4 h-4" />
          View Reports
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        {statCards.map((card, idx) => (
          <div key={idx} className="stat-card">
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                {card.change}
              </span>
            </div>
            <p className="stat-label mt-3">{card.label}</p>
            <p className="stat-value">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Today's Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary-600" />
              {t('appointment.today')}
            </h2>
          </div>
          <div className="card-body">
            {todayData && todayData.counts ? (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{todayData.counts.scheduled}</p>
                  <p className="text-xs text-gray-500">Scheduled</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{todayData.counts.checkedIn}</p>
                  <p className="text-xs text-blue-500">Checked In</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{todayData.counts.completed}</p>
                  <p className="text-xs text-green-500">Completed</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{todayData.counts.inProgress}</p>
                  <p className="text-xs text-yellow-500">In Progress</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{todayData.counts.cancelled}</p>
                  <p className="text-xs text-red-500">Cancelled</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{todayData.counts.noShow || 0}</p>
                  <p className="text-xs text-gray-500">No Show</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t('common.noData')}</p>
            )}

            {todayData?.appointments?.length > 0 && (
              <div className="space-y-3 mt-4">
                {todayData.appointments.slice(0, 5).map((apt: any) => (
                  <div key={apt.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${
                      apt.status === 'completed' ? 'bg-green-500' :
                      apt.status === 'checked_in' ? 'bg-blue-500' :
                      apt.status === 'cancelled' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{apt.patientName}</p>
                      <p className="text-xs text-gray-500">{apt.startTime} - {apt.endTime}</p>
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
          </div>
        </div>

        {/* Quick Actions & Activity */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.recentActivity')}</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <UserCheck className="w-8 h-8 text-green-500 bg-green-50 p-1.5 rounded-lg" />
                <div>
                  <p className="text-sm font-medium text-gray-900">New patient registered</p>
                  <p className="text-xs text-gray-500">Mohammed Al-Otaibi</p>
                </div>
                <span className="text-xs text-gray-400 mr-auto">2m ago</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-8 h-8 text-blue-500 bg-blue-50 p-1.5 rounded-lg" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Appointment checked in</p>
                  <p className="text-xs text-gray-500">Fatima Al-Zahrani - Check-up</p>
                </div>
                <span className="text-xs text-gray-400 mr-auto">15m ago</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-purple-500 bg-purple-50 p-1.5 rounded-lg" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Invoice paid</p>
                  <p className="text-xs text-gray-500">INV-DEMO-2026-0001 - 517.50 EGP</p>
                </div>
                <span className="text-xs text-gray-400 mr-auto">1h ago</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <XCircle className="w-8 h-8 text-red-500 bg-red-50 p-1.5 rounded-lg" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Appointment cancelled</p>
                  <p className="text-xs text-gray-500">Khalid Al-Ghamdi - Follow-up</p>
                </div>
                <span className="text-xs text-gray-400 mr-auto">2h ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
