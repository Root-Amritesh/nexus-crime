import React from 'react';
import { 
  FileText, CheckCircle2, 
  Split, Merge, PlusCircle, Users 
} from 'lucide-react';
import { useCaseStore } from '../../state/useCaseStore';
import type { EntityType } from '../../types';

export const FIREntityView: React.FC = () => {
  const { 
    firText, 
    firEntities, 
    entityResolutionQueue, 
    resolveEntityCandidate,
    setActiveTab
  } = useCaseStore();

  const getEntityBadgeStyle = (type: EntityType) => {
    switch (type) {
      case 'PERSON': return 'bg-[#556B5D]/10 text-[#556B5D] border-[#556B5D]/30';
      case 'LOCATION': return 'bg-[#A67C3D]/10 text-[#A67C3D] border-[#A67C3D]/30';
      case 'VEHICLE': return 'bg-[#F5F5F2] text-[#1C1F1D] border-[#D9DCD8]';
      case 'PHONE': return 'bg-[#1C1F1D]/10 text-[#1C1F1D] border-[#D9DCD8] font-mono';
      case 'ORG': return 'bg-[#556B5D]/10 text-[#556B5D] border-[#556B5D]/30';
    }
  };

  const pendingCount = entityResolutionQueue.filter(e => e.status === 'pending').length;

  return (
    <div className="bg-white border border-[#D9DCD8] rounded p-6 space-y-6 font-sans">
      
      {/* View Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#D9DCD8]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#1C1F1D]">
              Find Names, Phones &amp; Locations
            </h2>
            <span className="text-xs bg-[#F5F5F2] border border-[#D9DCD8] text-[#666B67] px-2.5 py-0.5 rounded font-medium">
              Automated Text Scanner
            </span>
          </div>
          <p className="text-xs text-[#666B67] mt-0.5">
            Reads incident text, finds identified people and phone numbers, and helps you match people with similar names.
          </p>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded bg-[#F5F5F2] border border-[#D9DCD8] text-[#1C1F1D] font-medium">
            {firEntities.length} items found
          </span>
          <span className="px-3 py-1 rounded bg-[#A67C3D]/10 border border-[#A67C3D]/20 text-[#A67C3D] font-medium">
            {pendingCount} people to review
          </span>
        </div>
      </div>

      {!firText || firEntities.length === 0 ? (
        <div className="py-16 px-6 text-center space-y-3">
          <div className="text-base font-semibold text-[#1C1F1D]">
            No documents or text records yet
          </div>
          <p className="text-xs text-[#666B67] max-w-md mx-auto leading-relaxed">
            Add a police complaint, incident report, or written document in the Add Information tab to find names, phone numbers, and locations automatically.
          </p>
          <button
            onClick={() => setActiveTab('upload')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#556B5D] hover:bg-[#435449] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Add Information</span>
          </button>
        </div>
      ) : (
        /* Main Grid: FIR Narrative & Entity Resolution Queue */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: FIR Text Narrative (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#D9DCD8] pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#556B5D]" />
                  <span className="text-xs font-bold text-[#1C1F1D]">
                    Document Text &amp; Extracted Items
                  </span>
                </div>
                <span className="text-[11px] text-[#666B67]">
                  Incident Text
                </span>
              </div>

              {/* Formatted Text Box */}
              <div className="bg-white border border-[#D9DCD8] rounded p-4 text-xs leading-relaxed text-[#1C1F1D] max-h-[340px] overflow-y-auto whitespace-pre-wrap">
                {firText}
              </div>

              {/* Extracted Entities List */}
              <div className="space-y-2 pt-2 border-t border-[#D9DCD8]">
                <div className="text-xs font-bold text-[#1C1F1D]">
                  Identified Details:
                </div>
                <div className="flex flex-wrap gap-2">
                  {firEntities.map((entity) => (
                    <span
                      key={entity.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs border ${getEntityBadgeStyle(entity.type)}`}
                    >
                      <span className="text-[10px] font-bold opacity-75">[{entity.type}]</span>
                      <span>{entity.text}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Entity Resolution Review Queue (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#D9DCD8] pb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#556B5D]" />
                  <span className="text-xs font-bold text-[#1C1F1D]">
                    Find Matching People
                  </span>
                </div>
                <span className="text-[11px] text-[#666B67]">
                  Human Review
                </span>
              </div>

              <p className="text-xs text-[#666B67] leading-relaxed">
                Review names that look very similar to see if they are the same person before joining their records together.
              </p>

              {entityResolutionQueue.length === 0 ? (
                <div className="p-4 rounded bg-white border border-[#D9DCD8] text-center text-xs text-[#666B67]">
                  No matching candidates to review right now.
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {entityResolutionQueue.map((item) => {
                    const isPending = item.status === 'pending';

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded border space-y-2.5 bg-white ${
                          isPending ? 'border-[#A67C3D]/40 shadow-xs' : 'border-[#D9DCD8] opacity-60'
                        }`}
                      >
                        {/* Comparison Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-[#1C1F1D]">
                              {item.entity_a.name} <span className="text-[#666B67] font-normal">and</span> {item.entity_b.name}
                            </div>
                            <div className="text-[11px] text-[#666B67]">
                              {item.reason}
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#A67C3D]/10 text-[#A67C3D] border border-[#A67C3D]/20">
                            {(item.similarity_score * 100).toFixed(0)}% Similar
                          </span>
                        </div>

                        {/* Actions or Status */}
                        {isPending ? (
                          <div className="flex items-center gap-2 pt-1 border-t border-[#D9DCD8]">
                            <button
                              onClick={() => resolveEntityCandidate(item.id, 'merge')}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-[#556B5D] hover:bg-[#435449] text-white font-medium text-xs transition-colors cursor-pointer"
                            >
                              <Merge className="w-3.5 h-3.5" />
                              <span>Same Person (Merge)</span>
                            </button>
                            <button
                              onClick={() => resolveEntityCandidate(item.id, 'reject')}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-[#F5F5F2] hover:bg-[#EBEBE6] text-[#1C1F1D] border border-[#D9DCD8] text-xs font-medium transition-colors cursor-pointer"
                            >
                              <Split className="w-3.5 h-3.5" />
                              <span>Different People</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-[#556B5D] font-medium pt-1 border-t border-[#D9DCD8]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Decision: {item.status.toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default FIREntityView;
