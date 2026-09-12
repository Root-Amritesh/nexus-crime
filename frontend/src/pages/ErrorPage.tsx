import { useState } from 'react';
import { Shield, AlertCircle, ArrowLeft } from 'lucide-react';

interface ErrorPageProps {
  variant?: 'not-found' | 'system';
  requestId?: string;
  detail?: string;
  onNavigate?: (route: string) => void;
}

export default function ErrorPage({
  variant = 'not-found',
  requestId = 'REQ-7F4D19E8',
  detail = 'The requested investigation record or reference was not found.',
  onNavigate,
}: ErrorPageProps) {
  const [showRaw, setShowRaw] = useState(false);
  const isNotFound = variant === 'not-found';
  const timestamp = new Date().toISOString();

  const handleNav = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      window.location.href = route;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F2] text-[#1C1F1D] flex flex-col font-sans">
      
      {/* Main Header */}
      <header className="bg-white border-b border-[#D9DCD8]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav('/')}>
            <div className="w-8 h-8 rounded bg-[#556B5D] text-white flex items-center justify-center font-bold text-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-[#1C1F1D]">NEXUS-CRIME</span>
          </div>

          <button
            onClick={() => handleNav('/')}
            className="text-xs text-[#666B67] hover:text-[#1C1F1D] transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Workspace</span>
          </button>
        </div>
      </header>

      {/* Error Card */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg bg-white border border-[#D9DCD8] rounded p-6 sm:p-8 space-y-6 shadow-sm">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#914B4B]">
              <AlertCircle className="w-4 h-4" />
              <span>{isNotFound ? '404 · RECORD NOT FOUND' : '500 · SYSTEM ERROR'}</span>
            </div>
            <h1 className="text-xl font-bold text-[#1C1F1D]">
              {isNotFound ? 'Record or Page Not Found' : 'System Service Error'}
            </h1>
            <p className="text-xs text-[#666B67] leading-relaxed">
              {detail}
            </p>
          </div>

          <div className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-4 text-xs space-y-1.5">
            <div className="flex justify-between text-[#666B67]">
              <span>Request ID:</span>
              <span className="font-mono text-[#1C1F1D]">{requestId}</span>
            </div>
            <div className="flex justify-between text-[#666B67]">
              <span>Timestamp:</span>
              <span className="font-mono text-[#1C1F1D]">{timestamp}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#D9DCD8]">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs text-[#666B67] hover:underline cursor-pointer"
            >
              {showRaw ? 'Hide Raw Details' : 'Show Technical Info'}
            </button>

            <button
              onClick={() => handleNav('/')}
              className="px-4 py-2 rounded bg-[#556B5D] hover:bg-[#435449] text-white text-xs font-semibold cursor-pointer"
            >
              Return Home
            </button>
          </div>

          {showRaw && (
            <pre className="p-3 rounded bg-[#EBEBE6] text-[11px] font-mono text-[#1C1F1D] overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify({ status: isNotFound ? 404 : 500, requestId, timestamp, detail }, null, 2)}
            </pre>
          )}

        </div>
      </main>

      <footer className="border-t border-[#D9DCD8] bg-white py-4 text-xs text-[#666B67] text-center">
        NEXUS-CRIME · System Diagnostics
      </footer>

    </div>
  );
}
