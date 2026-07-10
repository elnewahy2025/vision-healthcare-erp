import { useState, useRef } from 'react';
import { Card, CardBody, Button, Input, Select, Spinner } from '../components/ui';
import { Upload, FileSpreadsheet, Check, AlertCircle, Download } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface ImportResult {
  totalRows: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export default function DataImportPage() {
  const [importType, setImportType] = useState('patients');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);

    // Preview first 5 rows
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1, 6).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((h, i) => row[h] = values[i] || '');
          return row;
        });
        setPreview(rows);
      }
    };
    reader.readAsText(selected);
  };

  const handleImport = async () => {
    if (!file) return toast.error('Please select a file');
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', importType);
      const res = await api.post('/data-import/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data.data);
      if (res.data.data.errors?.length > 0) {
        toast.error(`${res.data.data.errors.length} rows had errors`);
      } else {
        toast.success(`Imported ${res.data.data.imported} rows successfully`);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Import failed');
    } finally { setImporting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-100 rounded-lg"><Upload className="w-6 h-6 text-cyan-600" /></div>
        <div><h1 className="text-2xl font-bold">Data Import</h1><p className="text-sm text-gray-500">Bulk import data from Excel or CSV files</p></div>
      </div>

      <Card><CardBody>
        <div className="space-y-4">
          <Select label="Import Type" value={importType} onChange={e => setImportType(e.target.value)}
            options={[
              { value: 'patients', label: 'Patients' },
              { value: 'inventory', label: 'Inventory Items' },
              { value: 'insurance', label: 'Insurance Companies' },
              { value: 'appointments', label: 'Appointments' },
            ]} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select File (CSV or Excel)</label>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}

          <Button onClick={handleImport} disabled={importing || !file} icon={<Upload className="w-4 h-4" />}>
            {importing ? 'Importing...' : 'Start Import'}
          </Button>
        </div>
      </CardBody></Card>

      {preview.length > 0 && (
        <Card><CardBody>
          <h3 className="font-semibold mb-3">Preview (first 5 rows)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>{Object.keys(preview[0]).map(h => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {preview.map((row, i) => (
                  <tr key={i}>{Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 text-gray-600">{String(v).substring(0, 50)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody></Card>
      )}

      {result && (
        <Card><CardBody>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            {result.errors.length === 0 ? <Check className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-yellow-600" />}
            Import Results
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{result.totalRows}</p><p className="text-sm text-gray-500">Total Rows</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{result.imported}</p><p className="text-sm text-gray-500">Imported</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p><p className="text-sm text-gray-500">Skipped</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {result.errors.map((err, i) => (
                <div key={i} className="text-sm text-red-600 bg-red-50 p-2 rounded">Row {err.row}: {err.error}</div>
              ))}
            </div>
          )}
        </CardBody></Card>
      )}
    </div>
  );
}
