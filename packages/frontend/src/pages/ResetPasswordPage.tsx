import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { securityApi } from '../lib/api';
import { Stethoscope, Lock, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { toast.error('Invalid reset link'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await securityApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string }; toast.error(axiosErr?.response?.data?.error || 'Reset failed. Link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md card p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h1>
          <p className="text-sm text-gray-500 mb-6">You can now log in with your new password.</p>
          <Link to="/login" className="btn-primary inline-flex">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Stethoscope className="w-8 h-8 text-primary-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Reset Your Password</h1>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type={showPwd ? 'text' : 'password'} className="input pl-10 pr-10"
                placeholder="Min 8 characters" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input type="password" className="input" placeholder="Repeat password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              required minLength={8} />
          </div>
          <button type="submit" disabled={loading || !token} className="btn-primary w-full">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
