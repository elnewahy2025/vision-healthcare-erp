import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { CreditCard, Plus, Search, BarChart3, Clock, DollarSign } from 'lucide-react';
import api from '../lib/api';

export default function SaasBillingPage() {
  const [tab, setTab] = useState<'subscription' | 'plans' | 'invoices' | 'usage'>('subscription');
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/saas/subscription').then(r => setSubscription(r.data.data)).catch(() => null),
      api.get('/saas/plans').then(r => setPlans(r.data.data)).catch(() => []),
      api.get('/saas/invoices').then(r => setInvoices(r.data.data)).catch(() => []),
      api.get('/saas/usage').then(r => setUsage(r.data.data)).catch(() => null),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">SaaS Billing</h1></div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === 'subscription' ? 'primary' : 'secondary'} onClick={() => setTab('subscription')}><CreditCard className="w-4 h-4" /> Subscription</Button>
        <Button variant={tab === 'plans' ? 'primary' : 'secondary'} onClick={() => setTab('plans')}><BarChart3 className="w-4 h-4" /> Plans ({plans.length})</Button>
        <Button variant={tab === 'invoices' ? 'primary' : 'secondary'} onClick={() => setTab('invoices')}><DollarSign className="w-4 h-4" /> Invoices ({invoices.length})</Button>
        <Button variant={tab === 'usage' ? 'primary' : 'secondary'} onClick={() => setTab('usage')}><Clock className="w-4 h-4" /> Usage</Button>
      </div>

      {tab === 'subscription' && (
        <div>
          {subscription ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card><CardBody>
                <p className="text-sm text-gray-500">Current Plan</p>
                <p className="text-xl font-bold">{subscription.planName}</p>
                <Badge>{subscription.status}</Badge>
              </CardBody></Card>
              <Card><CardBody>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-xl font-bold">{Number(subscription.amount).toFixed(2)} SAR</p>
                <p className="text-xs text-gray-400">{subscription.billingCycle}</p>
              </CardBody></Card>
              <Card><CardBody>
                <p className="text-sm text-gray-500">Period</p>
                <p className="text-sm font-medium">{subscription.currentPeriodStart?.split('T')[0]} → {subscription.currentPeriodEnd?.split('T')[0]}</p>
                {subscription.trialEndsAt && <p className="text-xs text-orange-500">Trial until {subscription.trialEndsAt?.split('T')[0]}</p>}
              </CardBody></Card>
            </div>
          ) : (
            <Card className="mb-6"><CardBody>
              <p className="text-gray-500">No active subscription. Browse plans to subscribe.</p>
            </CardBody></Card>
          )}

          <Card><CardBody>
            <h3 className="font-semibold mb-3">Plan Details</h3>
            {subscription ? (
              <div className="text-sm space-y-2">
                <p><strong>Category:</strong> {subscription.planCategory}</p>
                <p><strong>Max Users:</strong> {subscription.maxUsers} · <strong>Max Branches:</strong> {subscription.maxBranches} · <strong>Storage:</strong> {subscription.maxStorageGb}GB</p>
                <p><strong>Features:</strong> {(subscription.planFeatures || []).join(', ') || 'None'}</p>
              </div>
            ) : <p className="text-sm text-gray-500">Select a plan to see details</p>}
          </CardBody></Card>
        </div>
      )}

      {tab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p: any) => (
            <Card key={p.id} className={`border-2 ${subscription?.planId === p.id ? 'border-primary-500' : 'border-gray-200'}`}>
              <CardBody>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  <Badge>{p.category}</Badge>
                </div>
                <p className="text-3xl font-bold mb-1">{p.priceMonthly} <span className="text-sm font-normal text-gray-500">SAR/mo</span></p>
                {p.priceYearly > 0 && <p className="text-sm text-gray-500 mb-4">{p.priceYearly} SAR/yr (save {Math.round((1 - p.priceYearly / (p.priceMonthly * 12)) * 100)}%)</p>}
                <div className="text-sm space-y-2 mb-4">
                  <p>👤 {p.maxUsers} users · 🏥 {p.maxBranches} branches · 💾 {p.maxStorageGb}GB</p>
                  <p className="font-medium">Modules: {(p.modules || []).join(', ')}</p>
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {(p.features || []).map((f: string) => <Badge key={f} variant="gray">{f}</Badge>)}
                </div>
                {subscription?.planId !== p.id && (
                  <Button className="w-full" onClick={async () => {
                    await api.post('/saas/subscription', { planId: p.id });
                    const r = await api.get('/saas/subscription'); setSubscription(r.data.data);
                  }}>Subscribe</Button>
                )}
                {subscription?.planId === p.id && <Button className="w-full" variant="secondary" disabled>Current Plan</Button>}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Invoice #</th><th>Period</th><th>Amount</th><th>Tax</th><th>Total</th><th>Status</th><th>Paid</th></tr></thead>
            <tbody>
              {invoices.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">No invoices</td></tr> :
                invoices.map((i: any) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="font-mono text-xs">{i.invoiceNumber}</td>
                    <td className="text-xs">{i.periodStart} → {i.periodEnd}</td>
                    <td>{Number(i.amount).toFixed(2)}</td>
                    <td>{Number(i.tax).toFixed(2)}</td>
                    <td className="font-medium">{Number(i.total).toFixed(2)} SAR</td>
                    <td><Badge variant={i.status === 'paid' ? 'success' : i.status === 'failed' ? 'danger' : 'warning'}>{i.status}</Badge></td>
                    <td className="text-xs">{i.paidAt?.split('T')[0] || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'usage' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Usage metrics for the last 30 days</p>
          {usage?.totals?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {usage.totals.map((t: any) => (
                <Card key={t.metric}><CardBody>
                  <p className="text-sm text-gray-500 capitalize">{t.metric.replace(/_/g, ' ')}</p>
                  <p className="text-2xl font-bold">{t.total?.toLocaleString()}</p>
                </CardBody></Card>
              ))}
            </div>
          ) : <p className="text-gray-500 mb-4">No usage data yet</p>}

          {usage?.records?.length > 0 && (
            <div className="table-container">
              <table>
                <thead><tr><th>Metric</th><th>Quantity</th><th>Date</th></tr></thead>
                <tbody>
                  {usage.records.slice(0, 20).map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td><Badge>{r.metric}</Badge></td>
                      <td className="font-medium">{r.quantity}</td>
                      <td className="text-xs">{r.recordDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
