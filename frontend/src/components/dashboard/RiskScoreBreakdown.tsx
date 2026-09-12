import React from 'react';
import type { Suspect } from '../../types';
import { useCaseStore } from '../../state/useCaseStore';
import { Network, MapPin, Navigation, Phone, FileSearch } from 'lucide-react';

interface Props {
  suspect: Suspect;
}

export const RiskScoreBreakdown: React.FC<Props> = ({ suspect }) => {
  const { riskWeights, openExplainability } = useCaseStore();
  const { score_breakdown } = suspect;

  const components = [
    {
      name: 'Network Position',
      weight: riskWeights.centrality,
      rawValue: suspect.centrality_score.toFixed(2),
      contribution: score_breakdown.centrality_contribution,
      percentage: Math.round((score_breakdown.centrality_contribution / (suspect.risk_score || 1)) * 100),
      icon: Network,
      description: 'How strongly this person connects other people in the group.',
    },
    {
      name: 'Locations Visited',
      weight: riskWeights.colocation,
      rawValue: `${suspect.co_location_count} places`,
      contribution: score_breakdown.colocation_contribution,
      percentage: Math.round((score_breakdown.colocation_contribution / (suspect.risk_score || 1)) * 100),
      icon: MapPin,
      description: `Seen at ${suspect.flagged_scenes.length} incident locations.`,
    },
    {
      name: 'Traveling Together',
      weight: riskWeights.comovement,
      rawValue: `${suspect.co_movement_count} trips`,
      contribution: score_breakdown.comovement_contribution,
      percentage: Math.round((score_breakdown.comovement_contribution / (suspect.risk_score || 1)) * 100),
      icon: Navigation,
      description: 'Moving along the same route as others within a close time window.',
    },
    {
      name: 'Phone Calls with Group',
      weight: riskWeights.call_frequency,
      rawValue: `${suspect.call_frequency} calls`,
      contribution: score_breakdown.call_contribution,
      percentage: Math.round((score_breakdown.call_contribution / (suspect.risk_score || 1)) * 100),
      icon: Phone,
      description: 'Calls exchanged with other identified people in this case.',
    },
  ];

  return (
    <div className="bg-white border border-[#D9DCD8] rounded p-4 text-xs space-y-4">
      
      {/* Header explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9DCD8] pb-3">
        <div>
          <div className="font-bold text-[#1C1F1D] text-sm">
            How this risk score was calculated: {(suspect.risk_score * 100).toFixed(0)}%
          </div>
          <div className="text-[11px] text-[#666B67] mt-0.5">
            Based on mathematical proximity and call frequency. No personal or demographic attributes are used.
          </div>
        </div>
        <button
          onClick={() => openExplainability(suspect.device_hash)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#556B5D] hover:bg-[#435449] text-white text-xs font-semibold cursor-pointer shrink-0 transition-colors"
        >
          <FileSearch className="w-3.5 h-3.5" />
          <span>Inspect Evidence Records</span>
        </button>
      </div>

      {/* 4 Factor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {components.map((comp, idx) => {
          const Icon = comp.icon;
          return (
            <div key={idx} className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-3 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1C1F1D] flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-[#556B5D]" />
                    <span>{comp.name}</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#1C1F1D]">
                    {comp.percentage}%
                  </span>
                </div>
                <p className="text-[11px] text-[#666B67] mt-1 leading-normal">
                  {comp.description}
                </p>
              </div>

              <div>
                <div className="w-full bg-[#D9DCD8] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#556B5D] h-full rounded-full"
                    style={{ width: `${Math.min(100, comp.percentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#666B67] mt-1">
                  <span>Count: {comp.rawValue}</span>
                  <span>Weight: {(comp.weight * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default RiskScoreBreakdown;
