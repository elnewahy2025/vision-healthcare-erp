import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Shield, ShieldCheck, Key, Smartphone } from 'lucide-react';
import { Button, Input, Card, CardBody } from '../components/ui';
import { securityApi } from '../lib/api';
import { useAuth } from '../stores/authStore';

export default function SecuritySettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const [mfaEnabled, setMfaEnabled] = useState(user?.mfaEnabled || false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaStep, setMfaStep] = useState<'idle' | 'setup' | 'verify-disable'>('idle');
  const [disableCode, setDisableCode] = useState('');

  const handleChangePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPwd.length < 8) {
        toast.error(t('sec.passwordMin8'));
        return;
      }
      if (newPwd !== confirmPwd) {
        toast.error(t('sec.passwordsNoMatch'));
        return;
      }
      setSaving(true);
      try {
        await securityApi.changePassword(currentPwd, newPwd);
        toast.success(t('sec.passwordChanged'));
        setShowChangePwd(false);
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
      } catch {
        toast.error(t('sec.failedChangePassword'));
      } finally {
        setSaving(false);
      }
    },
    [currentPwd, newPwd, confirmPwd, t],
  );

  const startSetup = useCallback(async () => {
    try {
      const data = await securityApi.mfaSetup();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setMfaStep('setup');
    } catch {
      toast.error(t('sec.failedMfaSetup'));
    }
  }, [t]);

  const confirmEnable = useCallback(async () => {
    if (mfaCode.length !== 6) {
      toast.error(t('sec.enter6Digit'));
      return;
    }
    setSaving(true);
    try {
      await securityApi.mfaEnable(mfaCode);
      setMfaEnabled(true);
      setMfaStep('idle');
      setMfaCode('');
      toast.success(t('sec.mfaEnabled'));
    } catch {
      toast.error(t('sec.invalidCode'));
    } finally {
      setSaving(false);
    }
  }, [mfaCode, t]);

  const disable2fa = useCallback(async () => {
    if (disableCode.length !== 6) {
      toast.error(t('sec.enter6Digit'));
      return;
    }
    setSaving(true);
    try {
      await securityApi.mfaDisable(disableCode);
      setMfaEnabled(false);
      setMfaStep('idle');
      setDisableCode('');
      toast.success(t('sec.mfaDisabled'));
    } catch {
      toast.error(t('sec.invalidCode'));
    } finally {
      setSaving(false);
    }
  }, [disableCode, t]);

  const cancelMfaSetup = useCallback(() => {
    setMfaStep('idle');
    setMfaCode('');
  }, []);

  const cancelDisable = useCallback(() => {
    setMfaStep('idle');
    setDisableCode('');
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('sec.title')}</h1>

      <Card>
        <CardBody>
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold">{t('sec.changePassword')}</h2>
          </div>
          {!showChangePwd ? (
            <Button onClick={() => setShowChangePwd(true)} variant="secondary">
              {t('sec.changePassword')}
            </Button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                label={t('sec.currentPassword')}
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                required
              />
              <Input
                label={t('sec.newPassword')}
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                minLength={8}
              />
              <Input
                label={t('sec.confirmPassword')}
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
                minLength={8}
              />
              <div className="flex gap-2">
                <Button type="submit" loading={saving}>
                  {t('sec.save')}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowChangePwd(false)}
                  variant="secondary"
                >
                  {t('sec.cancel')}
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center gap-3 mb-4">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold">{t('sec.twoFactor')}</h2>
          </div>

          <div className="flex items-center gap-4 mb-4">
            {mfaEnabled ? (
              <div className="flex items-center gap-2 text-green-600">
                <ShieldCheck className="w-5 h-5" />{' '}
                <span className="font-medium">{t('sec.enabled')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <Shield className="w-5 h-5" />{' '}
                <span className="font-medium">{t('sec.notEnabled')}</span>
              </div>
            )}
          </div>

          {mfaStep === 'setup' && qrCode && (
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <p className="text-sm text-gray-600 mb-3">{t('sec.scanQr')}</p>
              <img
                src={qrCode}
                alt="QR Code"
                className="w-48 h-48 mx-auto border rounded-lg mb-3"
              />
              <p className="text-xs text-gray-500 text-center mb-3">
                {t('sec.orEnterSecret')}{' '}
                <code className="bg-white px-2 py-0.5 rounded">{secret}</code>
              </p>
              <p className="text-sm text-gray-600 mb-2">{t('sec.enterCode')}</p>
              <div className="flex gap-2">
                <Input
                  placeholder="000000"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="max-w-[120px]"
                />
                <Button onClick={confirmEnable} loading={saving}>
                  {t('sec.enable')}
                </Button>
                <Button onClick={cancelMfaSetup} variant="secondary">
                  {t('sec.cancel')}
                </Button>
              </div>
            </div>
          )}

          {mfaStep === 'verify-disable' && (
            <div className="p-4 bg-red-50 rounded-lg mb-4">
              <p className="text-sm text-red-600 mb-2">{t('sec.disableInstruction')}</p>
              <div className="flex gap-2">
                <Input
                  placeholder="000000"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  className="max-w-[120px]"
                />
                <Button onClick={disable2fa} loading={saving} variant="danger">
                  {t('sec.disable')}
                </Button>
                <Button onClick={cancelDisable} variant="secondary">
                  {t('sec.cancel')}
                </Button>
              </div>
            </div>
          )}

          {mfaStep === 'idle' && (
            <div className="flex gap-2">
              {!mfaEnabled ? (
                <Button onClick={startSetup}>{t('sec.enable2fa')}</Button>
              ) : (
                <Button
                  onClick={() => setMfaStep('verify-disable')}
                  variant="danger"
                >
                  {t('sec.disable2fa')}
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
