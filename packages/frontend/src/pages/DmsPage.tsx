import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { dmsApi } from '../lib/api';
import { FileUpload, ImageViewer } from '../components/ui';
import { FileText, Search, Loader2, Download, Trash2, Eye, Image as ImageIcon, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DmsPage() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<{ key: string; label: string }[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { loadDocuments(); dmsApi.categories().then(setCategories).catch(() => {}); }, [categoryFilter]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await dmsApi.list({ search: search || undefined, category: categoryFilter || undefined });
      setDocuments(data.data);
    } catch { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  };

  useEffect(() => { const timer = setTimeout(loadDocuments, 300); return () => clearTimeout(timer); }, [search]);

  const handleUpload = async (file: File, metadata: any) => {
    await dmsApi.upload(file, metadata);
    toast.success('File uploaded successfully');
    setShowUpload(false);
    loadDocuments();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    setDeleting(id);
    try { await dmsApi.delete(id); toast.success('Deleted'); loadDocuments(); }
    catch { toast.error('Failed to delete'); }
    finally { setDeleting(null); }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const categoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      lab_report: 'badge-info', radiology_report: 'badge-purple',
      prescription: 'badge-success', consent: 'badge-warning',
      id_scan: 'badge-gray', insurance: 'badge-info',
    };
    return colors[cat] || 'badge-gray';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><FileText className="w-6 h-6" /> Documents</h1>
          <p className="text-gray-500 mt-1">{documents.length} files</p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} className="btn-primary">
          <FileText className="w-4 h-4" /> {showUpload ? 'Close Upload' : 'Upload File'}
        </button>
      </div>

      {/* Upload Area */}
      {showUpload && (
        <div className="card mb-6">
          <div className="card-body">
            <FileUpload onUpload={handleUpload} categories={categories} showPatientSelect />
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="card mb-6">
        <div className="card-body flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-10" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input sm:w-48" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No documents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc: any) => (
            <div key={doc.id} className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="flex items-start gap-3">
                  {doc.mimeType?.startsWith('image/') ? (
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <ImageIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`badge text-xs ${categoryColor(doc.category)}`}>{doc.category?.replace(/_/g, ' ')}</span>
                  {doc.version > 1 && <span className="text-xs text-gray-400">v{doc.version}</span>}
                  <span className="text-xs text-gray-400 ml-auto">{formatSize(doc.fileSize)}</span>
                </div>
                {doc.patientName && <p className="text-xs text-gray-500 mt-1">Patient: {doc.patientName}</p>}
                <div className="flex gap-1 mt-3">
                  <button onClick={() => setViewingDoc(doc)} className="btn-ghost btn-sm flex-1">
                    <Eye className="w-3 h-3" /> View
                  </button>
                  <a href={dmsApi.attachmentUrl(doc.id)} download className="btn-ghost btn-sm flex-1">
                    <Download className="w-3 h-3" /> Download
                  </a>
                  <button onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id} className="btn-ghost btn-sm text-red-500 hover:text-red-600">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">{new Date(doc.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image/File Viewer */}
      {viewingDoc && (
        <ImageViewer
          src={dmsApi.downloadUrl(viewingDoc.id)}
          title={viewingDoc.title}
          mimeType={viewingDoc.mimeType || 'application/octet-stream'}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
}
