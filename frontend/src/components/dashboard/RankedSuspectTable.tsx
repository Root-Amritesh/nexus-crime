import React, { useState } from 'react';
import { 
  ChevronDown, ChevronRight, Search, PlusCircle, 
  MapPin, Network 
} from 'lucide-react';
import { useCaseStore } from '../../state/useCaseStore';
import { RiskScoreBreakdown } from './RiskScoreBreakdown';

export const RankedSuspectTable: React.FC = () => {
  const { 
    suspects, 
    crimeScenes, 
    openExplainability, 
    setActiveTab, 
    setGraphFilter,
    setMapFilter
  } = useCaseStore();

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSceneFilter, setSelectedSceneFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'risk_score' | 'centrality_score' | 'co_location_count' | 'call_frequency'>('risk_score');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleRow = (hash: string) => {
    setExpandedRows(prev => ({ ...prev, [hash]: !prev[hash] }));
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  // Filter & Sort suspects
  const filteredSuspects = suspects
    .filter(s => {
      const matchesSearch = 
        s.device_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.alias && s.alias.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesScene = selectedSceneFilter === 'all' || s.flagged_scenes.includes(selectedSceneFilter);
      return matchesSearch && matchesScene;
    })
    .sort((a, b) => {
      const mult = sortAsc ? 1 : -1;
      return (a[sortBy] - b[sortBy]) * mult;
    });

  const getRiskBadge = (score: number) => {
    if (score >= 0.80) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#914B4B]/10 text-[#914B4B] border border-[#914B4B]/20">
          High Risk ({(score * 100).toFixed(0)}%)
        </span>
      );
    }
    if (score >= 0.60) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#A67C3D]/10 text-[#A67C3D] border border-[#A67C3D]/20">
          Medium Risk ({(score * 100).toFixed(0)}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-[#666B67] bg-[#F5F5F2] border border-[#D9DCD8]">
        Low Risk ({(score * 100).toFixed(0)}%)
      </span>
    );
  };

  const jumpToGraphNode = (hash: string) => {
    setGraphFilter('searchQuery', hash);
    setActiveTab('graph');
  };

  const jumpToMapDevice = (hash: string) => {
    setMapFilter('selectedTimelineDevice', hash);
    setActiveTab('map');
  };

  return (
    <div className="bg-white border border-[#D9DCD8] rounded p-6 space-y-4">
      
      {/* Title & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#D9DCD8]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#1C1F1D]">
              Key People &amp; Phone Numbers
            </h2>
            <span className="text-xs text-[#666B67] bg-[#F5F5F2] border border-[#D9DCD8] px-2 py-0.5 rounded font-medium">
              {filteredSuspects.length} total
            </span>
          </div>
          <p className="text-xs text-[#666B67] mt-0.5">
            People ranked by number of connections, calls made, and places visited together.
          </p>
        </div>

        {/* Filter Bar */}
        {suspects.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#666B67] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search person or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded pl-8 pr-3 py-1.5 text-xs text-[#1C1F1D] focus:outline-none w-48"
              />
            </div>

            <select
              value={selectedSceneFilter}
              onChange={(e) => setSelectedSceneFilter(e.target.value)}
              className="bg-[#F5F5F2] border border-[#D9DCD8] rounded px-2.5 py-1.5 text-xs text-[#1C1F1D] focus:outline-none cursor-pointer"
            >
              <option value="all">All Locations</option>
              {crimeScenes.map(sc => (
                <option key={sc.scene_id} value={sc.scene_id}>{sc.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Empty State */}
      {suspects.length === 0 ? (
        <div className="py-12 px-6 text-center space-y-3">
          <div className="text-base font-semibold text-[#1C1F1D]">
            No people or entities identified yet
          </div>
          <p className="text-xs text-[#666B67] max-w-md mx-auto leading-relaxed">
            When call logs, police reports, or location files are added to a case, matching people and phone numbers will appear here ranked by their involvement.
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
        /* Populated Table */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F5F5F2] border-y border-[#D9DCD8] text-[#666B67] font-medium">
                <th className="py-2.5 px-3 w-8"></th>
                <th className="py-2.5 px-3">Person / Phone</th>
                <th className="py-2.5 px-3 cursor-pointer" onClick={() => handleSort('risk_score')}>
                  Risk Level {sortBy === 'risk_score' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-2.5 px-3 cursor-pointer" onClick={() => handleSort('co_location_count')}>
                  Places Visited {sortBy === 'co_location_count' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-2.5 px-3 cursor-pointer" onClick={() => handleSort('call_frequency')}>
                  Calls Made {sortBy === 'call_frequency' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9DCD8]">
              {filteredSuspects.map((suspect) => {
                const isExpanded = !!expandedRows[suspect.device_hash];

                return (
                  <React.Fragment key={suspect.device_hash}>
                    <tr className="hover:bg-[#F5F5F2] transition-colors">
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleRow(suspect.device_hash)}
                          className="text-[#666B67] hover:text-[#1C1F1D] cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#1C1F1D]">
                          {suspect.alias || 'Unknown Individual'}
                        </div>
                        <div className="text-[11px] text-[#666B67] font-mono">
                          {suspect.device_hash}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {getRiskBadge(suspect.risk_score)}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-[#1C1F1D]">
                          {suspect.co_location_count}
                        </span>
                        <span className="text-[#666B67] text-[11px] ml-1">
                          {suspect.co_location_count === 1 ? 'place' : 'places'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-[#1C1F1D]">
                          {suspect.call_frequency}
                        </span>
                        <span className="text-[#666B67] text-[11px] ml-1">calls</span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => jumpToMapDevice(suspect.device_hash)}
                            title="Show on map"
                            className="p-1.5 rounded hover:bg-[#EBEBE6] text-[#666B67] hover:text-[#1C1F1D] cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => jumpToGraphNode(suspect.device_hash)}
                            title="View connections"
                            className="p-1.5 rounded hover:bg-[#EBEBE6] text-[#666B67] hover:text-[#1C1F1D] cursor-pointer"
                          >
                            <Network className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openExplainability(suspect.device_hash)}
                            className="px-2.5 py-1 rounded bg-[#556B5D] hover:bg-[#435449] text-white text-xs font-medium cursor-pointer"
                          >
                            View Evidence
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-[#F5F5F2] p-4">
                          <RiskScoreBreakdown suspect={suspect} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default RankedSuspectTable;
