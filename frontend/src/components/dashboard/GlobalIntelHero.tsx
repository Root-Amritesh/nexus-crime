import React from 'react';
import { useCaseStore } from '../../state/useCaseStore';
import { PlusCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const GlobalIntelHero: React.FC = () => {
  const { 
    activeCase, 
    cases, 
    backendStatus, 
    setActiveTab, 
    checkBackendConnection,
    graphData,
    manualIngestedRecords,
    loadSyntheticBenchmarkDataset,
    clearAllData
  } = useCaseStore();

  const totalPeople = graphData.nodes.filter(n => n.type === 'person' || n.type === 'device').length;
  const totalConnections = graphData.edges.length;
  const totalRecords = manualIngestedRecords.length + (activeCase ? 1 : 0);

  return (
    <div className="space-y-4 font-sans">
      
      {/* Backend Disconnected Notice (Only if disconnected) */}
      {backendStatus === 'DISCONNECTED' && (
        <div className="bg-white border border-[#D9DCD8] rounded p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#914B4B]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-semibold text-[#1C1F1D]">System Not Connected.</span>
              <span className="text-[#666B67] ml-1">
                The application is running in local offline mode. Real-time data will sync when the backend service is started.
              </span>
            </div>
          </div>
          <button
            onClick={() => checkBackendConnection()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#F5F5F2] hover:bg-[#EBEBE6] border border-[#D9DCD8] text-[#1C1F1D] font-medium transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3 text-[#666B67]" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Main Overview Panel */}
      <div className="bg-white border border-[#D9DCD8] rounded p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#D9DCD8]">
          <div>
            <h1 className="text-xl font-bold text-[#1C1F1D] tracking-tight">
              {activeCase ? activeCase.title : 'Investigation Overview'}
            </h1>
            <p className="text-xs text-[#666B67] mt-1 max-w-2xl">
              {activeCase 
                ? activeCase.description 
                : 'View combined information from phone logs, reports, location records, and financial activity.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#556B5D] hover:bg-[#435449] text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Information</span>
            </button>

            {/* Test Benchmark Loader (Explicit action for SIH demonstration evaluation) */}
            {cases.length === 0 ? (
              <button
                onClick={loadSyntheticBenchmarkDataset}
                className="px-3 py-2 rounded bg-[#F5F5F2] hover:bg-[#EBEBE6] border border-[#D9DCD8] text-[#666B67] hover:text-[#1C1F1D] text-xs font-medium transition-colors cursor-pointer"
                title="Load sample test benchmark dataset for evaluation"
              >
                Load Demo Benchmark
              </button>
            ) : (
              <button
                onClick={clearAllData}
                className="px-3 py-2 rounded bg-[#F5F5F2] hover:bg-[#EBEBE6] border border-[#D9DCD8] text-[#914B4B] hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                title="Clear all session records and reset to empty state"
              >
                Clear Data
              </button>
            )}
          </div>
        </div>

        {/* 4 Core Plain English Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 text-center">
          
          <div className="border-r border-[#D9DCD8] last:border-0 pr-4">
            <div className="text-xs font-medium text-[#666B67] uppercase tracking-wide">
              Cases
            </div>
            <div className="text-3xl font-bold text-[#1C1F1D] mt-1">
              {cases.length}
            </div>
            <div className="text-[11px] text-[#666B67] mt-0.5">
              {cases.length === 1 ? '1 active case' : `${cases.length} total cases`}
            </div>
          </div>

          <div className="border-r border-[#D9DCD8] last:border-0 pr-4">
            <div className="text-xs font-medium text-[#666B67] uppercase tracking-wide">
              People &amp; Entities
            </div>
            <div className="text-3xl font-bold text-[#1C1F1D] mt-1">
              {totalPeople}
            </div>
            <div className="text-[11px] text-[#666B67] mt-0.5">
              {totalPeople === 1 ? '1 person identified' : `${totalPeople} total people`}
            </div>
          </div>

          <div className="border-r border-[#D9DCD8] last:border-0 pr-4">
            <div className="text-xs font-medium text-[#666B67] uppercase tracking-wide">
              Records
            </div>
            <div className="text-3xl font-bold text-[#1C1F1D] mt-1">
              {totalRecords}
            </div>
            <div className="text-[11px] text-[#666B67] mt-0.5">
              {totalRecords === 1 ? '1 record entered' : `${totalRecords} total records`}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-[#666B67] uppercase tracking-wide">
              Connections
            </div>
            <div className="text-3xl font-bold text-[#1C1F1D] mt-1">
              {totalConnections}
            </div>
            <div className="text-[11px] text-[#666B67] mt-0.5">
              {totalConnections === 1 ? '1 relationship link' : `${totalConnections} links discovered`}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default GlobalIntelHero;
