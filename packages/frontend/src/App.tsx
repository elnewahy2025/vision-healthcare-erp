import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './stores/authStore';
import { useTranslation } from 'react-i18next';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import AppointmentsPage from './pages/AppointmentsPage';
import EmrPage from './pages/EmrPage';
import BillingPage from './pages/BillingPage';
import LaboratoryPage from './pages/LaboratoryPage';
import RadiologyPage from './pages/RadiologyPage';
import PharmacyPage from './pages/PharmacyPage';
import QueuePage from './pages/QueuePage';
import ReferralsPage from './pages/ReferralsPage';
import NotificationsPage from './pages/NotificationsPage';
import NursingPage from './pages/NursingPage';
import HomeVisitsPage from './pages/HomeVisitsPage';
import TelemedicinePage from './pages/TelemedicinePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppContent() {
  const { user, tenant } = useAuth();
  const { i18n } = useTranslation();

  useEffect(() => {
    const locale = user?.locale || localStorage.getItem('locale') || 'en';
    i18n.changeLanguage(locale);

    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;

    if (tenant) {
      const theme = tenant.settings.theme;
      if (theme?.primaryColor) {
        document.documentElement.style.setProperty('--color-primary', theme.primaryColor);
      }
    }
  }, [user, tenant, i18n]);

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" replace />} />
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="emr" element={<EmrPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="laboratory" element={<LaboratoryPage />} />
        <Route path="radiology" element={<RadiologyPage />} />
        <Route path="pharmacy" element={<PharmacyPage />} />
        <Route path="queue" element={<QueuePage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="nursing" element={<NursingPage />} />
        <Route path="home-visits" element={<HomeVisitsPage />} />
        <Route path="telemedicine" element={<TelemedicinePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
