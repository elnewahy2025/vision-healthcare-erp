import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Globe, Shield } from 'lucide-react';
import {
  PageLoader, EmptyState, Card, CardBody, Button, Badge, Select,
} from '../components/ui';
import { apiClient as api } from '../lib/api';
import { sanitizeString } from '../lib/sanitize';

interface Region {
  id: string;
  code: string;
  name: string;
  provider: string;
  location: string;
  complianceFlags: string[];
}

interface DataResidency {
  id: string;
  primaryRegionId: string;
  primaryRegionName: string;
  primaryRegionCode: string;
  backupRegionId: string;
  backupRegionName: string;
  backupRegionCode: string;
  dataClassifications: Record<string, string>;
  complianceFramework: string;
}

export default function RegionsPage() {
  const { t } = useTranslation();
  const [regions, setRegions] = useState<Region[]>([]);
  const [residency, setResidency] = useState<DataResidency | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPrimary, setSelectedPrimary] = useState('');
  const [selectedBackup, setSelectedBackup] = useState('');
  const [framework, setFramework] = useState('hipaa');

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const [regionsRes, residencyRes] = await Promise.allSettled([
          api.get('/regions'),
          api.get('/regions/residency'),
        ]);
        if (cancelled) return;

        if (regionsRes.status === 'fulfilled') {
          const raw: unknown[] = regionsRes.value.data?.data ?? [];
          setRegions(
            raw.map((r: unknown) => {
              const region = r as Record<string, unknown>;
              return {
                id: String(region.id ?? ''),
                code: String(region.code ?? ''),
                name: String(region.name ?? ''),
                provider: String(region.provider ?? ''),
                location: String(region.location ?? ''),
                complianceFlags: Array.isArray(region.complianceFlags)
                  ? (region.complianceFlags as string[])
                  : [],
              };
            })
          );
        } else {
          toast.error(t('regions.loadError'));
        }

        if (residencyRes.status === 'fulfilled' && residencyRes.value.data?.data) {
          const d = residencyRes.value.data.data as Record<string, unknown>;
          const resolved: DataResidency = {
            id: String(d.id ?? ''),
            primaryRegionId: String(d.primaryRegionId ?? ''),
            primaryRegionName: String(d.primaryRegionName ?? ''),
            primaryRegionCode: String(d.primaryRegionCode ?? ''),
            backupRegionId: String(d.backupRegionId ?? ''),
            backupRegionName: String(d.backupRegionName ?? ''),
            backupRegionCode: String(d.backupRegionCode ?? ''),
            dataClassifications: (d.dataClassifications as Record<string, string>) ?? {},
            complianceFramework: String(d.complianceFramework ?? 'hipaa'),
          };
          setResidency(resolved);
          setSelectedPrimary(resolved.primaryRegionId);
          setSelectedBackup(resolved.backupRegionId);
          setFramework(resolved.complianceFramework);
        }
      } catch {
        if (!cancelled) toast.error(t('regions.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadData();
    return () => { cancelled = true; };
  }, [t]);

  const handleSave = useCallback(async () => {
    if (!selectedPrimary) return;
    setSaving(true);
    try {
      await api.put('/regions/residency', {
        primaryRegionId: selectedPrimary,
        backupRegionId: selectedBackup || undefined,
        complianceFramework: framework,
      });
      const r = await api.get('/regions/residency');
      if (r.data?.data) {
        const d = r.data.data as Record<string, unknown>;
        setResidency({
          id: String(d.id ?? ''),
          primaryRegionId: String(d.primaryRegionId ?? ''),
          primaryRegionName: String(d.primaryRegionName ?? ''),
          primaryRegionCode: String(d.primaryRegionCode ?? ''),
          backupRegionId: String(d.backupRegionId ?? ''),
          backupRegionName: String(d.backupRegionName ?? ''),
          backupRegionCode: String(d.backupRegionCode ?? ''),
          dataClassifications: (d.dataClassifications as Record<string, string>) ?? {},
          complianceFramework: String(d.complianceFramework ?? 'hipaa'),
        });
      }
      toast.success(t('regions.saveSuccess'));
    } catch {
      toast.error(t('regions.saveError'));
    } finally {
      setSaving(false);
    }
  }, [selectedPrimary, selectedBackup, framework, t]);

  if (loading) return <PageLoader message={t('common.loading')} />;

  const getRegionName = (id: string) =>
    regions.find((r) => r.id === id)?.name ?? t('regions.notSet');

  const complianceOptions = [
    { value: 'hipaa', label: t('regions.hipaa') },
    { value: 'gdpr', label: t('regions.gdpr') },
    { value: 'both', label: t('regions.both') },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('regions.title')}</h1>
          <p className="text-gray-500 mt-1">
            {t('regions.regionCount', { count: regions.length })}
          </p>
        </div>
      </div>

      {regions.length === 0 ? (
        <EmptyState
          icon={<Globe className="w-8 h-8 text-gray-400" />}
          title={t('regions.noRegions')}
          message={t('regions.noRegionsMessage')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">
              {t('regions.availableRegions')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regions.map((region) => (
                <Card
                  key={region.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedPrimary === region.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        {sanitizeString(region.name)}
                      </h3>
                      <Badge variant="gray">{sanitizeString(region.provider)}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 font-mono">
                      {sanitizeString(region.code)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {sanitizeString(region.location)}
                    </p>
                    {region.complianceFlags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {region.complianceFlags.map((flag) => (
                          <Badge key={flag} variant="gray">
                            {flag.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant={selectedPrimary === region.id ? 'primary' : 'secondary'}
                        onClick={() => setSelectedPrimary(region.id)}
                      >
                        {t('regions.primary')}
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedBackup === region.id ? 'primary' : 'secondary'}
                        onClick={() => setSelectedBackup(region.id)}
                      >
                        {t('regions.backup')}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Card>
              <CardBody>
                <h3 className="font-semibold mb-4">{t('regions.dataResidency')}</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">{t('regions.primaryRegion')}</p>
                    <p className="font-medium">{getRegionName(selectedPrimary)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">{t('regions.backupRegion')}</p>
                    <p className="font-medium">{getRegionName(selectedBackup)}</p>
                  </div>
                  <div>
                    <Select
                      label={t('regions.complianceFramework')}
                      value={framework}
                      onChange={(e) => setFramework(e.target.value)}
                      options={complianceOptions}
                    />
                  </div>
                  <Button
                    className="w-full"
                    loading={saving}
                    onClick={handleSave}
                  >
                    {t('regions.saveResidency')}
                  </Button>
                  <p className="text-xs text-gray-400 mt-2">
                    {t('regions.selectHint')}
                  </p>
                </div>
              </CardBody>
            </Card>

            {residency && (
              <Card className="mt-4">
                <CardBody>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">
                      {t('regions.compliance')}: {residency.complianceFramework.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {t('regions.complianceDesc')}
                  </p>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
