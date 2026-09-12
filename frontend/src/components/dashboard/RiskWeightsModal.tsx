import React, { useState } from 'react';
import { X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useCaseStore } from '../../state/useCaseStore';
import { DEFAULT_RISK_WEIGHTS } from '../../data/mockData';

export const RiskWeightsModal: React.FC = () => {
  const { isWeightsModalOpen, closeWeightsModal, riskWeights, setRiskWeights } = useCaseStore();

  const [weights, setLocalWeights] = useState(riskWeights);

  if (!isWeightsModalOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setRiskWeights(weights);
    closeWeightsModal();
  };

  const handleReset = () => {
    setLocalWeights(DEFAULT_RISK_WEIGHTS);
  };

  const totalWeight = weights.centrality + weights.colocation + weights.comovement + weights.call_frequency;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded border border-[#D9DCD8] p-6 shadow-xl space-y-4 font-sans text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9DCD8] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#F5F5F2] border border-[#D9DCD8] text-[#556B5D]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1C1F1D]">
                Risk Calculation Formula Weights
              </h3>
              <p className="text-[11px] text-[#666B67]">
                Adjust how much each factor influences the overall risk score.
              </p>
            </div>
          </div>

          <button
            onClick={closeWeightsModal}
            className="text-[#666B67] hover:text-[#1C1F1D] p-1.5 rounded hover:bg-[#F5F5F2] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sliders Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Slider 1: Centrality */}
          <div className="space-y-1 bg-[#F5F5F2] p-3 rounded border border-[#D9DCD8]">
            <div className="flex justify-between">
              <span className="font-semibold text-[#1C1F1D]">Network Position Weight</span>
              <span className="font-bold text-[#556B5D]">{(weights.centrality * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.centrality}
              onChange={(e) => setLocalWeights({ ...weights, centrality: parseFloat(e.target.value) })}
              className="w-full accent-[#556B5D] cursor-pointer"
            />
          </div>

          {/* Slider 2: Co-Location */}
          <div className="space-y-1 bg-[#F5F5F2] p-3 rounded border border-[#D9DCD8]">
            <div className="flex justify-between">
              <span className="font-semibold text-[#1C1F1D]">Locations Visited Weight</span>
              <span className="font-bold text-[#556B5D]">{(weights.colocation * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.colocation}
              onChange={(e) => setLocalWeights({ ...weights, colocation: parseFloat(e.target.value) })}
              className="w-full accent-[#556B5D] cursor-pointer"
            />
          </div>

          {/* Slider 3: Co-Movement */}
          <div className="space-y-1 bg-[#F5F5F2] p-3 rounded border border-[#D9DCD8]">
            <div className="flex justify-between">
              <span className="font-semibold text-[#1C1F1D]">Traveling Together Weight</span>
              <span className="font-bold text-[#556B5D]">{(weights.comovement * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.comovement}
              onChange={(e) => setLocalWeights({ ...weights, comovement: parseFloat(e.target.value) })}
              className="w-full accent-[#556B5D] cursor-pointer"
            />
          </div>

          {/* Slider 4: Call Frequency */}
          <div className="space-y-1 bg-[#F5F5F2] p-3 rounded border border-[#D9DCD8]">
            <div className="flex justify-between">
              <span className="font-semibold text-[#1C1F1D]">Phone Calls with Group Weight</span>
              <span className="font-bold text-[#556B5D]">{(weights.call_frequency * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.call_frequency}
              onChange={(e) => setLocalWeights({ ...weights, call_frequency: parseFloat(e.target.value) })}
              className="w-full accent-[#556B5D] cursor-pointer"
            />
          </div>

          {/* Total Weight Indicator */}
          <div className="flex items-center justify-between text-xs font-semibold px-1">
            <span>Total Sum of Weights:</span>
            <span className={totalWeight === 1.0 ? 'text-[#556B5D]' : 'text-[#A67C3D]'}>
              {(totalWeight * 100).toFixed(0)}% {totalWeight !== 1.0 && '(Normalized automatically)'}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between border-t border-[#D9DCD8] pt-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-[#666B67] hover:text-[#1C1F1D] text-xs font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeWeightsModal}
                className="px-3 py-1.5 rounded bg-[#F5F5F2] hover:bg-[#EBEBE6] text-[#1C1F1D] text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#556B5D] hover:bg-[#435449] text-white text-xs font-semibold cursor-pointer"
              >
                Apply &amp; Recompute
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

export default RiskWeightsModal;
