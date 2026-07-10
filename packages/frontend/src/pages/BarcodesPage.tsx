import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input, Modal } from '../components/ui';
import { Barcode, Plus, Search, Scan, Printer, Trash2, Edit3, Copy, Clock } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function BarcodesPage() {
  const [tab, setTab] = useState<'templates' | 'labels' | 'scans'>('templates');
  const [templates, setTemplates] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [scanLogs, setScanLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showScan, setShowScan] = useState(false);

  const loadData = async () => {
    try {
      const [tRes, lRes, sRes] = await Promise.all([
        api.get('/barcodes/templates'),
        api.get('/barcodes/labels'),
        api.get('/barcodes/scan-logs'),
      ]);
      setTemplates(tRes.data.data || []);
      setLabels(lRes.data.data || []);
      setScanLogs(sRes.data.data || []);
    } catch {
      // silent
    }
  };

  useEffect(() => { setLoading(true); loadData().finally(() => setLoading(false)); }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  const filteredTemplates = templates.filter((t: any) => !search || t.name?.toLowerCase().includes(search.toLowerCase()));
  const filteredLabels = labels.filter((l: any) => !search || l.barcodeData?.toLowerCase().includes(search.toLowerCase()) || l.referenceType?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Barcodes & Labels</h1>
          <p className="text-gray-500 mt-1">{templates.length} templates · {labels.length} labels · {scanLogs.length} scans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowScan(true)}><Scan className="w-4 h-4" /> Log Scan</Button>
          <Button onClick={() => setShowGenerate(true)}><Plus className="w-4 h-4" /> Generate</Button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={tab === 'templates' ? 'primary' : 'secondary'} onClick={() => setTab('templates')}><Barcode className="w-4 h-4" /> Templates ({templates.length})</Button>
        <Button variant={tab === 'labels' ? 'primary' : 'secondary'} onClick={() => setTab('labels')}><Printer className="w-4 h-4" /> Labels ({labels.length})</Button>
        <Button variant={tab === 'scans' ? 'primary' : 'secondary'} onClick={() => setTab('scans')}><Scan className="w-4 h-4" /> Scan Logs ({scanLogs.length})</Button>
      </div>

      <Card className="mb-6"><CardBody>
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>

      {tab === 'templates' && (
        <>
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setShowNewTemplate(true)}><Plus className="w-4 h-4" /> New Template</Button>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>Code</th><th>Category</th><th>Symbology</th><th>Format</th><th>Human Readable</th><th>Active</th></tr></thead>
              <tbody>
                {filteredTemplates.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-500">No barcode templates</td></tr>
                ) : filteredTemplates.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="font-medium">{t.name}</td>
                    <td className="font-mono text-xs">{t.code}</td>
                    <td><Badge>{t.category}</Badge></td>
                    <td><Badge variant="gray">{t.symbology}</Badge></td>
                    <td>{t.format}</td>
                    <td>{t.includeHumanReadable ? <Badge variant="success">Yes</Badge> : <Badge variant="gray">No</Badge>}</td>
                    <td><Badge variant={t.isActive ? 'success' : 'gray'}>{t.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'labels' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Barcode Data</th><th>Template</th><th>Reference</th><th>Format</th><th>Status</th><th>Prints</th><th>Created</th></tr></thead>
            <tbody>
              {filteredLabels.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">No labels generated</td></tr>
              ) : filteredLabels.map((l: any) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="font-mono text-xs max-w-[200px] truncate">{l.barcodeData}</td>
                  <td className="text-xs">{l.templateName || '-'}</td>
                  <td className="text-xs">{l.referenceType ? `${l.referenceType}:${l.referenceId?.slice(0, 8)}` : '-'}</td>
                  <td>{l.format}</td>
                  <td><Badge variant={l.status === 'active' ? 'success' : l.status === 'printed' ? 'info' : 'gray'}>{l.status}</Badge></td>
                  <td>{l.printCount || 0}</td>
                  <td className="text-xs">{new Date(l.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'scans' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Barcode</th><th>Action</th><th>Status</th><th>Location</th><th>Scanner</th><th>Scanned At</th></tr></thead>
            <tbody>
              {scanLogs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">No scan logs</td></tr>
              ) : scanLogs.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="font-mono text-xs max-w-[200px] truncate">{s.barcodeData}</td>
                  <td><Badge>{s.action}</Badge></td>
                  <td><Badge variant={s.status === 'success' ? 'success' : s.status === 'warning' ? 'warning' : 'danger'}>{s.status}</Badge></td>
                  <td className="text-xs">{s.location || '-'}</td>
                  <td className="text-xs">{s.scannerId || '-'}</td>
                  <td className="text-xs">{new Date(s.scannedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewTemplate && (
        <Modal open={showNewTemplate} onClose={() => setShowNewTemplate(false)} title="New Barcode Template" size="lg">
          <NewTemplateForm onDone={() => { setShowNewTemplate(false); loadData(); }} />
        </Modal>
      )}

      {showGenerate && (
        <Modal open={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Barcode" size="md">
          <GenerateBarcodeForm templates={templates} onDone={() => { setShowGenerate(false); loadData(); }} />
        </Modal>
      )}

      {showScan && (
        <Modal open={showScan} onClose={() => setShowScan(false)} title="Log Scan" size="md">
          <ScanForm onDone={() => { setShowScan(false); loadData(); }} />
        </Modal>
      )}
    </div>
  );
}

function NewTemplateForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('patient');
  const [symbology, setSymbology] = useState('code128');
  const [format, setFormat] = useState('png');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await api.post('/barcodes/templates', { name, category, symbology, format });
      toast.success('Template created');
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create template');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Template Name</label>
        <Input placeholder="e.g., Patient Wristband" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="patient">Patient</option>
            <option value="sample">Sample</option>
            <option value="medication">Medication</option>
            <option value="asset">Asset</option>
            <option value="label">Label</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Symbology</label>
          <select className="input" value={symbology} onChange={e => setSymbology(e.target.value)}>
            <option value="code128">Code 128</option>
            <option value="qr">QR Code</option>
            <option value="datamatrix">Data Matrix</option>
            <option value="ean13">EAN-13</option>
            <option value="upca">UPC-A</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Format</label>
          <select className="input" value={format} onChange={e => setFormat(e.target.value)}>
            <option value="png">PNG</option>
            <option value="svg">SVG</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
      </div>
      <Button className="w-full" onClick={handleSubmit} disabled={saving}>{saving ? 'Creating...' : 'Create Template'}</Button>
    </div>
  );
}

function GenerateBarcodeForm({ templates, onDone }: { templates: any[]; onDone: () => void }) {
  const [templateCode, setTemplateCode] = useState(templates[0]?.code || '');
  const [referenceType, setReferenceType] = useState('patient');
  const [referenceId, setReferenceId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!templateCode) { toast.error('Select a template'); return; }
    setSaving(true);
    try {
      await api.post('/barcodes/generate', { templateCode, referenceType: referenceType || undefined, referenceId: referenceId || undefined });
      toast.success('Barcode generated');
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to generate');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Template</label>
        <select className="input" value={templateCode} onChange={e => setTemplateCode(e.target.value)}>
          {templates.map((t: any) => <option key={t.code} value={t.code}>{t.name} ({t.code})</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Reference Type</label>
          <select className="input" value={referenceType} onChange={e => setReferenceType(e.target.value)}>
            <option value="patient">Patient</option>
            <option value="prescription">Prescription</option>
            <option value="lab_order">Lab Order</option>
            <option value="asset">Asset</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reference ID</label>
          <Input placeholder="Optional ID..." value={referenceId} onChange={e => setReferenceId(e.target.value)} />
        </div>
      </div>
      <Button className="w-full" onClick={handleSubmit} disabled={saving}>{saving ? 'Generating...' : 'Generate Barcode'}</Button>
    </div>
  );
}

function ScanForm({ onDone }: { onDone: () => void }) {
  const [barcodeData, setBarcodeData] = useState('');
  const [action, setAction] = useState('scan');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!barcodeData) { toast.error('Barcode data is required'); return; }
    setSaving(true);
    try {
      await api.post('/barcodes/scan', { barcodeData, action, location: location || undefined });
      toast.success('Scan logged');
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to log scan');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Barcode Data</label>
        <Input placeholder="Scan or type barcode data..." value={barcodeData} onChange={e => setBarcodeData(e.target.value)} autoFocus />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Action</label>
          <select className="input" value={action} onChange={e => setAction(e.target.value)}>
            <option value="scan">Scan</option>
            <option value="verify">Verify</option>
            <option value="check_in">Check-In</option>
            <option value="dispense">Dispense</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <Input placeholder="e.g., Pharmacy counter" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
      </div>
      <Button className="w-full" onClick={handleSubmit} disabled={saving}>{saving ? 'Logging...' : 'Log Scan'}</Button>
    </div>
  );
}
