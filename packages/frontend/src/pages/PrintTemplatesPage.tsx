import { useState, useEffect } from 'react';
import { Spinner, Badge, Card, CardBody, Button, Input } from '../components/ui';
import { Printer, Plus, Search, Eye, FileText } from 'lucide-react';
import api from '../lib/api';

export default function PrintTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    api.get('/print/templates').then(r => setTemplates(r.data.data)).catch(() => []).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" className="py-16" />;

  const filtered = templates.filter((t: any) => !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.documentType?.includes(search));

  const documentTypes = [...new Set(templates.map((t: any) => t.documentType))];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Print Templates</h1><p className="text-gray-500 mt-1">{templates.length} templates</p></div>
        <Button><Plus className="w-4 h-4" /> New Template</Button>
      </div>

      <Card className="mb-6"><CardBody>
        <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      </CardBody></Card>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 cursor-pointer" onClick={() => setSearch('')}>All ({templates.length})</button>
        {documentTypes.map((dt: string) => (
          <button key={dt} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer capitalize ${search === dt ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
            onClick={() => setSearch(dt)}>{dt.replace(/_/g, ' ')} ({templates.filter((t: any) => t.documentType === dt).length})</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <Card className="col-span-full"><CardBody className="text-center py-12 text-gray-500">No print templates</CardBody></Card>
        ) : filtered.map((t: any) => (
          <Card key={t.id}>
            <CardBody>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <h3 className="font-semibold">{t.name}</h3>
                </div>
                <Badge>{t.category}</Badge>
              </div>
              <p className="text-xs font-mono text-gray-500 mb-1">{t.code}</p>
              <p className="text-xs text-gray-500 mb-3 capitalize">Type: {t.documentType.replace(/_/g, ' ')} · Paper: {t.paperSize}</p>
              <div className="flex gap-2">
                <Badge>{t.variables?.length || 0} variables</Badge>
                {t.isDefault && <Badge variant="success">Default</Badge>}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
