import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { securityApi } from '../lib/api';
import { Stethoscope, Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !tenantSlug) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await securityApi.forgotPassword(email, tenantSlug);
      setSent(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-sm text-gray-500 mb-6">
              If an account with <strong>{email}</strong> exists, we've sent a password reset link.
            </p>
            <button onClick={() => setSent(false)} className="btn-secondary w-full">
              Try a different email
            </button>
            <Link to="/login" className="btn-primary w-full mt-3 inline-flex justify-center">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password?</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your email and organization code to receive a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Organization Code</label>
            <input className="input" placeholder="your-org" value={tenantSlug}
              onChange={e => setTenantSlug(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" className="input" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Send Reset Link
          </button>
          <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
}
