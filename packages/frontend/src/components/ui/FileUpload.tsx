import { useState, useRef, DragEvent } from 'react';
import { Upload, X, File, FileText, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface FileUploadProps {
  onUpload: (file: File, metadata: { title: string; category: string; patientId?: string; description?: string }) => Promise<void>;
  categories?: { key: string; label: string }[];
  showPatientSelect?: boolean;
  patients?: { id: string; name: string }[];
}

export function FileUpload({ onUpload, categories = [], showPatientSelect, patients = [] }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [patientId, setPatientId] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const fileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');
    try {
      await onUpload(selectedFile, { title: title || selectedFile.name, category, patientId: patientId || undefined, description: description || undefined });
      setSelectedFile(null);
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      {!selectedFile ? (
        <div
          className={clsx('border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50')}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">Drop a file here or click to browse</p>
          <p className="text-xs text-gray-500 mt-1">PDF, images, documents — up to 50MB</p>
          <input ref={inputRef} type="file" className="hidden" onChange={handleSelect} />
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            {fileIcon(selectedFile.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatSize(selectedFile.size)}</p>
            </div>
            <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-gray-200 rounded" disabled={uploading}>
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <input className="input" placeholder="Document title" value={title} onChange={e => setTitle(e.target.value)} />
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            <option value="other">Other</option>
          </select>
          {showPatientSelect && (
            <select className="input" value={patientId} onChange={e => setPatientId(e.target.value)}>
              <option value="">No patient linked</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <textarea className="input min-h-[60px]" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full">
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      )}
    </div>
  );
}
