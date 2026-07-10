import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input } from '../components/ui';
import { Settings, Bell, Sun, Moon, Monitor, Keyboard, Save, Search } from 'lucide-react';
import { useTheme } from '../stores/themeStore';
import api from '../lib/api';

export default function UserPreferencesPage() {
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<'appearance' | 'notifications' | 'shortcuts'>('appearance');
  const [settings, setSettings] = useState<any>(null);
  const [notifPrefs, setNotifPrefs] = useState<any[]>([]);
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    Promise.all([
      api.get('/user/settings').then(r => { setSettings(r.data.data); setItemsPerPage(r.data.data?.itemsPerPage || 25); }).catch(() => {}),
      api.get('/user/notification-preferences').then(r => setNotifPrefs(r.data.data)).catch(() => []),
      api.get('/user/shortcuts').then(r => setShortcuts(r.data.data)).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    await api.put('/user/settings', { theme, itemsPerPage, quickSearchEnabled: true });
  };

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div><h1 className="page-title">User Preferences</h1></div>
        <Button onClick={saveSettings}><Save className="w-4 h-4" /> Save</Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'appearance' ? 'primary' : 'secondary'} onClick={() => setTab('appearance')}><Sun className="w-4 h-4" /> Appearance</Button>
        <Button variant={tab === 'notifications' ? 'primary' : 'secondary'} onClick={() => setTab('notifications')}><Bell className="w-4 h-4" /> Notifications</Button>
        <Button variant={tab === 'shortcuts' ? 'primary' : 'secondary'} onClick={() => setTab('shortcuts')}><Keyboard className="w-4 h-4" /> Shortcuts</Button>
      </div>

      {tab === 'appearance' && (
        <Card><CardBody>
          <h2 className="text-lg font-semibold mb-6">Appearance</h2>

          <div className="mb-6">
            <p className="text-sm font-medium mb-3">Theme</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light' as const, icon: Sun, label: 'Light' },
                { value: 'dark' as const, icon: Moon, label: 'Dark' },
              ].map(opt => (
                <button key={opt.value}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${theme === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setTheme(opt.value)}>
                  <opt.icon className={`w-6 h-6 mx-auto mb-2 ${theme === opt.value ? 'text-primary-600' : 'text-gray-400'}`} />
                  <p className={`text-sm font-medium ${theme === opt.value ? 'text-primary-700' : ''}`}>{opt.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium mb-2">Items Per Page</p>
            <select className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm" value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Quick Search</p>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Search className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Press <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs font-mono">/</kbd> or <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs font-mono">⌘K</kbd> to search</span>
            </div>
          </div>
        </CardBody></Card>
      )}

      {tab === 'notifications' && (
        <Card><CardBody>
          <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
          {notifPrefs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No notification preferences configured. Default channels will be used.</p>
          ) : notifPrefs.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between py-3 border-b last:border-0">
              <div>
                <p className="font-medium capitalize">{p.channel.replace(/_/g, ' ')}</p>
                <p className="text-xs text-gray-500">{(p.events || []).join(', ')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={p.isEnabled} onChange={async () => {
                  await api.put(`/user/notification-preferences/${p.channel}`, { isEnabled: !p.isEnabled });
                  const r = await api.get('/user/notification-preferences'); setNotifPrefs(r.data.data);
                }} />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </CardBody></Card>
      )}

      {tab === 'shortcuts' && (
        <Card><CardBody>
          <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
          <div className="space-y-3">
            {shortcuts.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{s.label}</p>
                  <p className="text-xs text-gray-500 capitalize">{s.category}</p>
                </div>
                <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs font-mono">{s.key}</kbd>
              </div>
            ))}
          </div>
        </CardBody></Card>
      )}
    </div>
  );
}
