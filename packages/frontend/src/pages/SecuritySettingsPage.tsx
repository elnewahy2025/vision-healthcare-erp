import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../stores/authStore';
import { securityApi } from '../lib/api';
import { Shield, ShieldCheck, Key, Smartphone, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SecuritySettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwdFields, setShowPwdFields] = useState(false);
  const [saving, setSaving] = useState(false);

  // 2FA state
  const [mfaEnabled, setMfaEnabled] = useState(user?.mfaEnabled || false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaStep, setMfaStep] = useState<'idle' | 'setup' | 'verify-disable'>('idle');
  const [disableCode, setDisableCode] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) return toast.error('Min 8 characters');
    if (newPwd !== confirmPwd) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      await securityApi.changePassword(currentPwd, newPwd);
      toast.success('Password changed');
      setShowChangePwd(false);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to change password');
    } finally { setSaving(false); }
  };

  const startSetup = async () => {
    try {
      const data = await securityApi.mfaSetup();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setMfaStep('setup');
    } catch { toast.error('Failed to start MFA setup'); }
  };

  const confirmEnable = async () => {
    if (mfaCode.length !== 6) return toast.error('Enter 6-digit code');
    setSaving(true);
    try {
      await securityApi.mfaEnable(mfaCode);
      setMfaEnabled(true);
      setMfaStep('idle');
      setMfaCode('');
      toast.success('Two-factor authentication enabled!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Invalid code');
    } finally { setSaving(false); }
  };

  const disable2fa = async () => {
    if (disableCode.length !== 6) return toast.error('Enter 6-digit code from your authenticator app');
    setSaving(true);
    try {
      await securityApi.mfaDisable(disableCode);
      setMfaEnabled(false);
      setMfaStep('idle');
      setDisableCode('');
      toast.success('Two-factor authentication disabled');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Invalid code');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="page-title">Security Settings</h1>

      {/* Change Password */}
      <div className="card">
        <div className="card-header flex items-center gap-3">
          <Key className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold">Change Password</h2>
        </div>
        <div className="card-body">
          {!showChangePwd ? (
            <button onClick={() => setShowChangePwd(true)} className="btn-secondary">Change Password</button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input type="password" className="input" value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)} required />
              </div>
              <div>
                <label className="label">New Password (min 8 chars)</label>
                <input type="password" className="input" value={newPwd}
                  onChange={e => setNewPwd(e.target.value)} required minLength={8} />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input type="password" className="input" value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)} required minLength={8} />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
                </button>
                <button type="button" onClick={() => setShowChangePwd(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="card">
        <div className="card-header flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold">Two-Factor Authentication (2FA)</h2>
        </div>
        <div className="card-body">
          <div className="flex items-center gap-4 mb-4">
            {mfaEnabled ? (
              <div className="flex items-center gap-2 text-green-600">
                <ShieldCheck className="w-5 h-5" /> <span className="font-medium">Enabled</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <Shield className="w-5 h-5" /> <span className="font-medium">Not enabled</span>
              </div>
            )}
          </div>

          {mfaStep === 'setup' && qrCode && (
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <p className="text-sm text-gray-600 mb-3">
                1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              <img src={qrCode} alt="QR Code" className="w-48 h-48 mx-auto border rounded-lg mb-3" />
              <p className="text-xs text-gray-500 text-center mb-3">Or enter this secret: <code className="bg-white px-2 py-0.5 rounded">{secret}</code></p>
              <p className="text-sm text-gray-600 mb-2">2. Enter the 6-digit code from your app:</p>
              <div className="flex gap-2">
                <input className="input max-w-[120px]" placeholder="000000" maxLength={6}
                  value={mfaCode} onChange={e => setMfaCode(e.target.value)} />
                <button onClick={confirmEnable} disabled={saving} className="btn-primary">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Enable
                </button>
                <button onClick={() => { setMfaStep('idle'); setMfaCode(''); }} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {mfaStep === 'verify-disable' && (
            <div className="p-4 bg-red-50 rounded-lg mb-4">
              <p className="text-sm text-red-600 mb-2">Enter your 6-digit authenticator code to disable 2FA:</p>
              <div className="flex gap-2">
                <input className="input max-w-[120px]" placeholder="000000" maxLength={6}
                  value={disableCode} onChange={e => setDisableCode(e.target.value)} />
                <button onClick={disable2fa} disabled={saving} className="btn-danger">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Disable
                </button>
                <button onClick={() => { setMfaStep('idle'); setDisableCode(''); }} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {mfaStep === 'idle' && (
            <div className="flex gap-2">
              {!mfaEnabled ? (
                <button onClick={startSetup} className="btn-primary">Enable 2FA</button>
              ) : (
                <button onClick={() => setMfaStep('verify-disable')} className="btn-danger">Disable 2FA</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
