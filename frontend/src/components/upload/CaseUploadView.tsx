import React, { useState } from 'react';
import { 
  Radio, Phone, CreditCard, FileText, Play, RefreshCw, 
  Layers, Edit3 
} from 'lucide-react';
import { useCaseStore } from '../../state/useCaseStore';
import { ManualIngestionView } from './ManualIngestionView';

export const CaseUploadView: React.FC = () => {
  const { 
    activeCase, 
    isProcessingUpload, 
    uploadStage, 
    uploadProgress, 
    simulateUploadPipeline 
  } = useCaseStore();

  const [ingestionMode, setIngestionMode] = useState<'MANUAL' | 'BATCH'>('MANUAL');
  const [caseRef, setCaseRef] = useState(activeCase?.case_reference || '');
  const [warrantRef, setWarrantRef] = useState(activeCase?.warrant_reference || '');
  const [investigatorId, setInvestigatorId] = useState(activeCase?.investigator_id || '');
  const [filesLoaded, setFilesLoaded] = useState<{ [key: string]: boolean }>({
    tower_dump: true,
    cdr: true,
    financial: true,
    fir_text: true,
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleToggleFile = (key: string) => {
    setFilesLoaded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStartIngestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseRef.trim()) {
      setValidationError('Please enter a case reference number.');
      return;
    }
    if (!warrantRef.trim()) {
      setValidationError('Please enter an authorization or court warrant reference.');
      return;
    }
    setValidationError(null);
    simulateUploadPipeline(caseRef, warrantRef, filesLoaded);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Ingestion Mode Switcher */}
      <div className="bg-white border border-[#D9DCD8] rounded p-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIngestionMode('MANUAL')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded transition-colors cursor-pointer font-medium ${
              ingestionMode === 'MANUAL'
                ? 'bg-[#556B5D] text-white font-semibold'
                : 'bg-transparent text-[#666B67] hover:text-[#1C1F1D] hover:bg-[#F5F5F2]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Enter Information Directly</span>
          </button>

          <button
            type="button"
            onClick={() => setIngestionMode('BATCH')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded transition-colors cursor-pointer font-medium ${
              ingestionMode === 'BATCH'
                ? 'bg-[#556B5D] text-white font-semibold'
                : 'bg-transparent text-[#666B67] hover:text-[#1C1F1D] hover:bg-[#F5F5F2]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Upload Multiple Files</span>
          </button>
        </div>

        <span className="text-xs text-[#666B67] px-3 hidden sm:inline">
          Official Authorization Required
        </span>
      </div>

      {/* Mode A: Manual Ingestion View */}
      {ingestionMode === 'MANUAL' ? (
        <ManualIngestionView />
      ) : (
        /* Mode B: Batch Multi-File Ingestion Gateway */
        <div className="bg-white border border-[#D9DCD8] rounded p-6 space-y-6">
          
          {/* Header */}
          <div className="pb-4 border-b border-[#D9DCD8]">
            <h2 className="text-base font-bold text-[#1C1F1D]">
              Upload Multiple Investigation Files
            </h2>
            <p className="text-xs text-[#666B67] mt-0.5">
              Attach files from cell towers, phone call logs, bank ledgers, or police incident reports.
            </p>
          </div>

          {/* Form Container */}
          <form onSubmit={handleStartIngestion} className="space-y-6">
            
            {validationError && (
              <div className="p-3 rounded bg-rose-50 border border-[#914B4B]/30 text-xs text-[#914B4B]">
                {validationError}
              </div>
            )}

            {/* Section 1: Authorization Inputs */}
            <div className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-4 space-y-3">
              <div className="text-xs font-bold text-[#1C1F1D] border-b border-[#D9DCD8] pb-2">
                1. Case &amp; Legal Authorization Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-[#666B67] block mb-1">
                    Case Reference Number *
                  </label>
                  <input
                    type="text"
                    value={caseRef}
                    onChange={(e) => setCaseRef(e.target.value)}
                    placeholder="e.g. CASE-2026-DEL-189"
                    className="w-full bg-white border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#666B67] block mb-1">
                    Authorization / Warrant Reference *
                  </label>
                  <input
                    type="text"
                    value={warrantRef}
                    onChange={(e) => setWarrantRef(e.target.value)}
                    placeholder="e.g. WR-DEL-HC-2026-8812"
                    className="w-full bg-white border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#666B67] block mb-1">
                    Investigating Officer ID
                  </label>
                  <input
                    type="text"
                    value={investigatorId}
                    onChange={(e) => setInvestigatorId(e.target.value)}
                    placeholder="e.g. INSP-R-SHARMA-742"
                    className="w-full bg-white border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Data Streams Matrix */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#1C1F1D]">
                2. Select File Types to Include
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* Tower Dumps */}
                <div 
                  onClick={() => handleToggleFile('tower_dump')}
                  className={`p-4 rounded border cursor-pointer transition-colors space-y-2 ${
                    filesLoaded.tower_dump
                      ? 'bg-[#F5F5F2] border-[#556B5D]'
                      : 'bg-white border-[#D9DCD8] opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Radio className="w-4 h-4 text-[#556B5D]" />
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#EBEBE6] text-[#1C1F1D]">
                      {filesLoaded.tower_dump ? 'INCLUDED' : 'EXCLUDED'}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-[#1C1F1D] text-xs">Cell Tower Data (CSV)</div>
                    <div className="text-[11px] text-[#666B67] mt-0.5">
                      Tower IDs, signal timestamps
                    </div>
                  </div>
                </div>

                {/* CDR Records */}
                <div 
                  onClick={() => handleToggleFile('cdr')}
                  className={`p-4 rounded border cursor-pointer transition-colors space-y-2 ${
                    filesLoaded.cdr
                      ? 'bg-[#F5F5F2] border-[#556B5D]'
                      : 'bg-white border-[#D9DCD8] opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Phone className="w-4 h-4 text-[#556B5D]" />
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#EBEBE6] text-[#1C1F1D]">
                      {filesLoaded.cdr ? 'INCLUDED' : 'EXCLUDED'}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-[#1C1F1D] text-xs">Call Logs (CDR)</div>
                    <div className="text-[11px] text-[#666B67] mt-0.5">
                      Caller, recipient, call duration
                    </div>
                  </div>
                </div>

                {/* Financial Ledger */}
                <div 
                  onClick={() => handleToggleFile('financial')}
                  className={`p-4 rounded border cursor-pointer transition-colors space-y-2 ${
                    filesLoaded.financial
                      ? 'bg-[#F5F5F2] border-[#556B5D]'
                      : 'bg-white border-[#D9DCD8] opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <CreditCard className="w-4 h-4 text-[#556B5D]" />
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#EBEBE6] text-[#1C1F1D]">
                      {filesLoaded.financial ? 'INCLUDED' : 'EXCLUDED'}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-[#1C1F1D] text-xs">Bank &amp; Money Transfers</div>
                    <div className="text-[11px] text-[#666B67] mt-0.5">
                      Account IDs, transfer amounts
                    </div>
                  </div>
                </div>

                {/* FIR Text */}
                <div 
                  onClick={() => handleToggleFile('fir_text')}
                  className={`p-4 rounded border cursor-pointer transition-colors space-y-2 ${
                    filesLoaded.fir_text
                      ? 'bg-[#F5F5F2] border-[#556B5D]'
                      : 'bg-white border-[#D9DCD8] opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <FileText className="w-4 h-4 text-[#556B5D]" />
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#EBEBE6] text-[#1C1F1D]">
                      {filesLoaded.fir_text ? 'INCLUDED' : 'EXCLUDED'}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-[#1C1F1D] text-xs">Reports &amp; Complaint Text</div>
                    <div className="text-[11px] text-[#666B67] mt-0.5">
                      Police reports, incident summaries
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Ingestion Progress / Run Button */}
            <div className="pt-2">
              {isProcessingUpload ? (
                <div className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#1C1F1D] font-medium flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#556B5D]" />
                      {uploadStage}
                    </span>
                    <span className="text-[#556B5D] font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#D9DCD8] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#556B5D] h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-[#556B5D] hover:bg-[#435449] text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Process Selected Files</span>
                </button>
              )}
            </div>

          </form>

        </div>
      )}

    </div>
  );
};

export default CaseUploadView;
