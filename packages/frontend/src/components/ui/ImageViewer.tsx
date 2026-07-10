import { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  title: string;
  mimeType: string;
  onClose: () => void;
}

export function ImageViewer({ src, title, mimeType, onClose }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const isImage = mimeType.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
          <h3 className="text-sm font-medium text-white truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isImage && (
            <>
              <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1.5 hover:bg-white/10 rounded-lg">
                <ZoomOut className="w-4 h-4 text-white" />
              </button>
              <span className="text-xs text-white/70 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-1.5 hover:bg-white/10 rounded-lg">
                <ZoomIn className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => setRotation(r => r + 90)} className="p-1.5 hover:bg-white/10 rounded-lg">
                <RotateCw className="w-4 h-4 text-white" />
              </button>
            </>
          )}
          <a href={src} download className="p-1.5 hover:bg-white/10 rounded-lg">
            <Download className="w-4 h-4 text-white" />
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        {isImage ? (
          <img
            src={src}
            alt={title}
            className="max-w-full max-h-full transition-transform duration-200"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          />
        ) : (
          <div className="text-center">
            <FileText className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <p className="text-white/70 text-sm mb-4">Preview not available for this file type</p>
            <a href={src} download className="btn-primary">
              <Download className="w-4 h-4" /> Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
