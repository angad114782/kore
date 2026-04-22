import React from 'react';
import { X, ExternalLink, Download, FileText } from 'lucide-react';

interface DocPreviewDialogProps {
  open: boolean;
  url: string;
  title: string;
  onClose: () => void;
}

const DocPreviewDialog: React.FC<DocPreviewDialogProps> = ({ open, url, title, onClose }) => {
  if (!open || !url) return null;

  const isPDF = url.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-10000 flex items-center justify-center p-4 md:p-10">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Dialog Body */}
      <div className="relative w-full max-w-6xl h-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <FileText className="text-indigo-600" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isPDF ? 'PDF Document' : 'Image File'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-200"
              title="Open in new tab"
            >
              <ExternalLink size={20} />
            </a>
            <a 
              href={url} 
              download
              className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-emerald-600 transition-all border border-transparent hover:border-slate-200"
              title="Download file"
            >
              <Download size={20} />
            </a>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-all border border-transparent hover:border-slate-200"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center">
          {isPDF ? (
            <iframe 
              src={`${url}#toolbar=0`} 
              className="w-full h-full rounded-xl border border-slate-300 shadow-inner bg-white"
              title={title}
            />
          ) : (
            <img 
              src={url} 
              alt={title} 
              className="w-full h-full object-contain rounded-xl shadow-lg"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DocPreviewDialog;
