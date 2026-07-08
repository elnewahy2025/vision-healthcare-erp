import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../stores/authStore';
import { useTranslation } from 'react-i18next';
import { Stethoscope, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', tenantSlug: 'demo' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password, form.tenantSlug);
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const isRtl = i18n.language === 'ar';

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-900 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Stethoscope className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">{t('app.name')}</h1>
          <p className="text-primary-100 text-lg leading-relaxed">
            Enterprise Healthcare ERP Platform
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">30+</p>
              <p className="text-primary-200 text-sm">Modules</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">20</p>
              <p className="text-primary-200 text-sm">Roles</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">99.9%</p>
              <p className="text-primary-200 text-sm">Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:hidden">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t('auth.loginTitle')}</h2>
          </div>

          <h2 className="hidden lg:block text-2xl font-bold text-gray-900 mb-2">{t('auth.loginTitle')}</h2>
          <p className="text-gray-500 mb-8">{t('auth.loginSubtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">{t('auth.tenantSlug')}</label>
              <input
                type="text"
                value={form.tenantSlug}
                onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })}
                className="input"
                placeholder="Enter organization code"
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {t('auth.login')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">
                {t('auth.signUp')}
              </Link>
            </p>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs font-medium text-blue-800 mb-1">Demo Credentials</p>
            <p className="text-xs text-blue-600">Organization: <strong>demo</strong></p>
            <p className="text-xs text-blue-600">Email: <strong>admin@demo.com</strong></p>
            <p className="text-xs text-blue-600">Password: <strong>Admin@123</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
