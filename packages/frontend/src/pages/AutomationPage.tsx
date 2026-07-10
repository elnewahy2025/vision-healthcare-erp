import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { Zap, Plus, Search, Play, Clock, Activity, FileText, Trash2, Edit3, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function AutomationPage() {
  const [tab, setTab] = useState<'rules' | 'logs'>('rules');
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [triggerRule, setTriggerRule] = useState<any>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const loadRules = async () => {
    try {
      const r = await api.get('/automation/rules');
      setRules(r.data.data);
    } catch { setRules([]); }
  };

  const loadLogs = async () => {
    try {
      const r = await api.get('/automation/logs');
      setLogs(r.data.data.logs || []);
    } catch { setLogs([]); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadRules(), loadLogs()]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  const filteredRules = rules.filter((r: any) => {
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory && r.category !== filterCategory) return false;
    return true;
  });

  const categories = [...new Set(rules.map((r: any) => r.category))];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Automation Engine</h1>
          <p className="text-gray-500 mt-1">{rules.length} rules · {logs.length} executions</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}><Plus className="w-4 h-4" /> New Rule</Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === 'rules' ? 'primary' : 'secondary'} onClick={() => setTab('rules')}><Zap className="w-4 h-4" /> Rules ({rules.length})</Button>
        <Button variant={tab === 'logs' ? 'primary' : 'secondary'} onClick={() => setTab('logs')}><Activity className="w-4 h-4" /> Execution Logs ({logs.length})</Button>
      </div>

      {tab === 'rules' && (
        <>
          <Card className="mb-6"><CardBody>
            <div className="flex gap-4 flex-wrap">
              <Input placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
              <select className="input max-w-[200px]" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </CardBody></Card>

          <div className="space-y-3">
            {filteredRules.length === 0 ? (
              <Card><CardBody><p className="text-center py-8 text-gray-500">No automation rules configured</p></CardBody></Card>
            ) : filteredRules.map((rule: any) => (
              <Card key={rule.id}>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)} className="p-1 hover:bg-gray-100 rounded">
                        {expandedRule === rule.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </button>
                      <Zap className={`w-5 h-5 ${rule.isActive ? 'text-primary-600' : 'text-gray-300'}`} />
                      <div>
                        <span className="font-medium">{rule.name}</span>
                        <div className="flex gap-2 mt-1">
                          <Badge>{rule.category}</Badge>
                          <Badge variant={rule.triggerType === 'event' ? 'info' : rule.triggerType === 'schedule' ? 'warning' : 'gray'}>{rule.triggerType}</Badge>
                          <Badge variant={rule.isActive ? 'success' : 'gray'}>{rule.isActive ? 'Active' : 'Inactive'}</Badge>
                          {rule.triggerEvent && <Badge variant="info">{rule.triggerEvent}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setTriggerRule(rule); setShowTriggerModal(true); }}><Play className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm"><Edit3 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  {expandedRule === rule.id && (
                    <div className="mt-4 pl-8 border-t pt-4">
                      {rule.description && <p className="text-sm text-gray-600 mb-3">{rule.description}</p>}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div><span className="text-gray-500">Priority:</span> {rule.priority}</div>
                        <div><span className="text-gray-500">Cooldown:</span> {rule.cooldownMinutes || 0} min</div>
                        <div><span className="text-gray-500">Max Executions:</span> {rule.maxExecutions || 'Unlimited'}</div>
                        <div><span className="text-gray-500">Last Triggered:</span> {rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).toLocaleString() : 'Never'}</div>
                        <div><span className="text-gray-500">Created:</span> {new Date(rule.createdAt).toLocaleDateString()}</div>
                      </div>
                      {rule.triggerConfig && Object.keys(rule.triggerConfig).length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm font-medium text-gray-500">Trigger Config:</span>
                          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs">{JSON.stringify(rule.triggerConfig, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'logs' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Status</th>
                <th>Trigger</th>
                <th>Reference</th>
                <th>Duration</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">No execution logs yet</td></tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="font-medium">{log.ruleName || log.ruleId?.slice(0, 8)}</td>
                  <td><Badge variant={log.status === 'completed' ? 'success' : log.status === 'running' ? 'warning' : 'danger'}>{log.status}</Badge></td>
                  <td><Badge variant="gray">{log.triggerType}</Badge></td>
                  <td className="text-xs">{log.referenceType ? `${log.referenceType}:${log.referenceId?.slice(0, 8)}` : '-'}</td>
                  <td className="text-xs">{log.durationMs}ms</td>
                  <td className="text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewModal && (
        <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="Create Automation Rule" size="lg">
          <NewRuleForm onDone={() => { setShowNewModal(false); loadRules(); }} />
        </Modal>
      )}

      {showTriggerModal && triggerRule && (
        <Modal open={showTriggerModal} onClose={() => { setShowTriggerModal(false); setTriggerRule(null); }} title={`Trigger: ${triggerRule.name}`} size="md">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Manually trigger this automation rule. Optional reference context can be provided.</p>
            <Button className="w-full" onClick={async () => {
              try {
                await api.post(`/automation/rules/${triggerRule.id}/trigger`, {});
                toast.success('Rule triggered successfully');
                setShowTriggerModal(false);
                setTriggerRule(null);
                loadLogs();
              } catch (err: any) {
                toast.error(err?.response?.data?.error || 'Failed to trigger rule');
              }
            }}><Play className="w-4 h-4" /> Trigger Now</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NewRuleForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [triggerType, setTriggerType] = useState('manual');
  const [triggerEvent, setTriggerEvent] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await api.post('/automation/rules', { name, category, triggerType, triggerEvent: triggerEvent || undefined, description: description || undefined });
      toast.success('Rule created');
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create rule');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Rule Name</label>
        <Input placeholder="e.g., Send reminder after booking" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="general">General</option>
            <option value="clinical">Clinical</option>
            <option value="billing">Billing</option>
            <option value="operations">Operations</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Trigger Type</label>
          <select className="input" value={triggerType} onChange={e => setTriggerType(e.target.value)}>
            <option value="manual">Manual</option>
            <option value="event">Event-Driven</option>
            <option value="schedule">Scheduled (Cron)</option>
          </select>
        </div>
      </div>
      {triggerType === 'event' && (
        <div>
          <label className="block text-sm font-medium mb-1">Trigger Event</label>
          <select className="input" value={triggerEvent} onChange={e => setTriggerEvent(e.target.value)}>
            <option value="">Select event...</option>
            <option value="appointment.created">Appointment Created</option>
            <option value="appointment.completed">Appointment Completed</option>
            <option value="appointment.cancelled">Appointment Cancelled</option>
            <option value="patient.registered">Patient Registered</option>
            <option value="lab.result_ready">Lab Results Ready</option>
            <option value="billing.invoice_paid">Invoice Paid</option>
            <option value="inventory.low_stock">Low Stock Alert</option>
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea className="input min-h-[80px]" placeholder="Optional description..." value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <Button className="w-full" onClick={handleSubmit} disabled={saving}><Plus className="w-4 h-4" /> {saving ? 'Creating...' : 'Create Rule'}</Button>
    </div>
  );
}
