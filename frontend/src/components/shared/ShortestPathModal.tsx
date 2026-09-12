import React from 'react';
import { X, Route, ArrowRight } from 'lucide-react';
import { useCaseStore } from '../../state/useCaseStore';

export const ShortestPathModal: React.FC = () => {
  const { 
    isShortestPathModalOpen, 
    clearShortestPath, 
    shortestPathNodes, 
    graphData
  } = useCaseStore();

  if (!isShortestPathModalOpen) return null;

  const { source, target, path } = shortestPathNodes;

  const getNodeLabel = (id: string) => {
    const node = graphData.nodes.find(n => n.id === id);
    return node ? (node.alias || node.label) : id;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-xl w-full rounded border border-[#D9DCD8] p-6 shadow-xl space-y-4 font-sans text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9DCD8] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#F5F5F2] border border-[#D9DCD8] text-[#556B5D]">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1C1F1D]">
                Connection Path Discovery
              </h3>
              <p className="text-[11px] text-[#666B67]">
                From <strong>{getNodeLabel(source)}</strong> to <strong>{getNodeLabel(target)}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={clearShortestPath}
            className="text-[#666B67] hover:text-[#1C1F1D] p-1.5 rounded hover:bg-[#F5F5F2] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Path Results */}
        {path ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[#1C1F1D]">
              <span className="font-semibold">Path Found ({path.length - 1} intermediary steps):</span>
              <span className="text-[#556B5D] font-bold bg-[#556B5D]/10 px-2 py-0.5 rounded text-[11px]">CONNECTED</span>
            </div>

            {/* Stepper visual */}
            <div className="flex items-center flex-wrap gap-2 bg-[#F5F5F2] p-4 rounded border border-[#D9DCD8]">
              {path.map((nodeId, index) => (
                <React.Fragment key={nodeId}>
                  <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded border border-[#D9DCD8] shadow-xs">
                    <span className="font-bold text-[#1C1F1D] text-xs">
                      {getNodeLabel(nodeId)}
                    </span>
                  </div>
                  {index < path.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-[#556B5D]" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center bg-[#F5F5F2] rounded border border-[#D9DCD8] text-[#666B67] space-y-1">
            <div className="font-semibold text-[#1C1F1D]">No connection path found</div>
            <p className="text-xs">
              These two entities are not currently linked by any recorded phone calls, shared locations, or money transfers.
            </p>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end border-t border-[#D9DCD8] pt-3">
          <button
            onClick={clearShortestPath}
            className="px-4 py-1.5 rounded bg-[#556B5D] hover:bg-[#435449] text-white text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default ShortestPathModal;
