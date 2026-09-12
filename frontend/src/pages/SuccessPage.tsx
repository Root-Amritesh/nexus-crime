import { Shield, CheckCircle2, ArrowRight } from 'lucide-react';

interface SuccessPageProps {
  suspectsFlagged?: number;
  crimeScenes?: number;
  recordsIngested?: number;
  recordsRejected?: number;
  processingTime?: number;
  caseReference?: string;
  onNavigate?: (route: string) => void;
}

export default function SuccessPage({
  suspectsFlagged = 0,
  crimeScenes = 0,
  recordsIngested = 0,
  processingTime = 0.0,
  caseReference = 'Active Case',
  onNavigate,
}: SuccessPageProps) {
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
            className="text-xs text-[#666B67] hover:text-[#1C1F1D] transition-colors cursor-pointer font-medium"
          >
            ← Return to Workspace
          </button>
        </div>
      </header>

      {/* Success Card */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl bg-white border border-[#D9DCD8] rounded p-6 sm:p-8 space-y-6 shadow-sm">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#556B5D]">
              <CheckCircle2 className="w-4 h-4" />
              <span>PROCESSING COMPLETE</span>
            </div>
            <h1 className="text-xl font-bold text-[#1C1F1D]">
              Information Ingestion &amp; Correlation Finished
            </h1>
            <p className="text-xs text-[#666B67] leading-relaxed">
              Case {caseReference} has been processed and linked into the active relationship graph.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#F5F5F2] border border-[#D9DCD8] p-3 rounded text-center">
              <div className="text-xs text-[#666B67]">People Identified</div>
              <div className="text-xl font-bold text-[#1C1F1D] mt-1">{suspectsFlagged}</div>
            </div>
            <div className="bg-[#F5F5F2] border border-[#D9DCD8] p-3 rounded text-center">
              <div className="text-xs text-[#666B67]">Locations</div>
              <div className="text-xl font-bold text-[#1C1F1D] mt-1">{crimeScenes}</div>
            </div>
            <div className="bg-[#F5F5F2] border border-[#D9DCD8] p-3 rounded text-center">
              <div className="text-xs text-[#666B67]">Records Joined</div>
              <div className="text-xl font-bold text-[#1C1F1D] mt-1">{recordsIngested}</div>
            </div>
            <div className="bg-[#F5F5F2] border border-[#D9DCD8] p-3 rounded text-center">
              <div className="text-xs text-[#666B67]">Duration</div>
              <div className="text-xl font-bold text-[#556B5D] mt-1">{processingTime}s</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9DCD8]">
            <button
              onClick={() => handleNav('/')}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#556B5D] hover:bg-[#435449] text-white text-xs font-semibold cursor-pointer"
            >
              <span>View Case Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </main>

      <footer className="border-t border-[#D9DCD8] bg-white py-4 text-xs text-[#666B67] text-center">
        NEXUS-CRIME · Processing Results
      </footer>

    </div>
  );
}
