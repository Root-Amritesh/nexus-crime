import React from 'react';
import { 
  X, FileSearch, Download, MapPin, Radio, 
  Phone, CreditCard, Navigation 
} from 'lucide-react';
import { useCaseStore } from '../../state/useCaseStore';
import type { EvidenceItem } from '../../types';

export const ExplainabilityPanel: React.FC = () => {
  const { 
    isExplainabilityOpen, 
    closeExplainability, 
    selectedSuspect, 
    selectedEvidenceSuspectId, 
    selectedEvidenceList,
    activeCase
  } = useCaseStore();

  if (!isExplainabilityOpen) return null;

  const handleExportDossier = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({
        case_reference: activeCase?.case_reference || 'CASE-GENERAL',
        warrant_reference: activeCase?.warrant_reference || 'BNSS §92',
        suspect_hash: selectedEvidenceSuspectId,
        alias: selectedSuspect?.alias,
        risk_score: selectedSuspect?.risk_score,
        score_breakdown: selectedSuspect?.score_breakdown,
        evidence_trail: selectedEvidenceList,
        exported_at: new Date().toISOString(),
      }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `EVIDENCE_DOSSIER_${selectedEvidenceSuspectId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getEvidenceIcon = (type: EvidenceItem['type']) => {
    switch (type) {
      case 'CO_LOCATED_AT': return <MapPin className="w-4 h-4 text-[#914B4B]" />;
      case 'CO_MOVED_WITH': return <Navigation className="w-4 h-4 text-[#556B5D]" />;
      case 'CALLED': return <Phone className="w-4 h-4 text-[#A67C3D]" />;
      case 'TRANSACTED_WITH': return <CreditCard className="w-4 h-4 text-[#556B5D]" />;
      default: return <Radio className="w-4 h-4 text-[#666B67]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-3xl w-full max-h-[90vh] rounded border border-[#D9DCD8] p-6 shadow-xl flex flex-col space-y-4 font-sans text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9DCD8] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#F5F5F2] border border-[#D9DCD8] text-[#556B5D]">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1C1F1D]">
                  Evidence Details &amp; Records
                </span>
              </div>
              <p className="text-xs text-[#666B67]">
                Target: <strong>{selectedSuspect?.alias || selectedEvidenceSuspectId}</strong>
              </p>
            </div>
          </div>
          
          <button 
            onClick={closeExplainability}
            className="p-1.5 rounded hover:bg-[#F5F5F2] text-[#666B67] hover:text-[#1C1F1D] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Evidence List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {(!selectedEvidenceList || selectedEvidenceList.length === 0) ? (
            <div className="p-8 text-center bg-[#F5F5F2] rounded border border-[#D9DCD8] text-[#666B67] space-y-1">
              <div className="font-semibold text-[#1C1F1D]">No specific raw evidence citations attached</div>
              <p className="text-xs">
                Mathematical risk score was calculated from active in-memory link analysis.
              </p>
            </div>
          ) : (
            selectedEvidenceList.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-3 flex items-start gap-3"
              >
                <div className="p-1.5 rounded bg-white border border-[#D9DCD8] mt-0.5">
                  {getEvidenceIcon(item.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1C1F1D] text-xs">
                      {item.type}
                    </span>
                    {item.timestamp && (
                      <span className="text-[11px] text-[#666B67]">
                        {item.timestamp}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#1C1F1D] leading-relaxed">
                    {item.details}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#D9DCD8] pt-3">
          <div className="text-[11px] text-[#666B67]">
            Compliant with Section 92 evidentiary recording.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDossier}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#F5F5F2] hover:bg-[#EBEBE6] border border-[#D9DCD8] text-[#1C1F1D] font-medium text-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Dossier (JSON)</span>
            </button>
            <button
              onClick={closeExplainability}
              className="px-4 py-1.5 rounded bg-[#556B5D] hover:bg-[#435449] text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExplainabilityPanel;
