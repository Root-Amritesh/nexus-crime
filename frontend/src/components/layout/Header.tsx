import React, { useEffect } from 'react';
import { useCaseStore } from '../../state/useCaseStore';
import { SlidersHorizontal, Shield, LogOut, RefreshCw, Database } from 'lucide-react';

interface HeaderProps {
  onNavigate?: (route: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { 
    activeCase, 
    cases, 
    setActiveCase, 
    openAuditModal, 
    openWeightsModal,
    auditLogs,
    backendStatus,
    checkBackendConnection
  } = useCaseStore();

  useEffect(() => {
    // Check initial connection
    checkBackendConnection();
  }, []);

  return (
    <header className="bg-white border-b border-[#D9DCD8] sticky top-0 z-40">
      
      {/* Top System Status Ribbon */}
      <div className="bg-[#F5F5F2] border-b border-[#D9DCD8] text-xs py-1.5 px-6 text-[#666B67]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#1C1F1D]">NEXUS-CRIME</span>
            <span className="text-[#D9DCD8]">|</span>
            <span>Law Enforcement Case Analysis</span>
          </div>

          {/* Backend Connection Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span 
                className={`w-2 h-2 rounded-full ${
                  backendStatus === 'CONNECTED' 
                    ? 'bg-[#556B5D]' 
                    : backendStatus === 'LOADING'
                    ? 'bg-[#A67C3D] animate-pulse'
                    : 'bg-[#914B4B]'
                }`} 
              />
              <span className="font-medium">
                {backendStatus === 'CONNECTED' && 'DATABASE — CONNECTED'}
                {backendStatus === 'LOADING' && 'CHECKING DATABASE...'}
                {backendStatus === 'DISCONNECTED' && 'DATABASE — NOT CONNECTED'}
                {backendStatus === 'ERROR' && 'DATABASE — ERROR'}
              </span>
            </div>

            <button 
              onClick={() => checkBackendConnection()} 
              title="Test connection to backend service"
              className="text-[#666B67] hover:text-[#1C1F1D] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Check Connection</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Brand & System Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#556B5D] text-white flex items-center justify-center font-bold text-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1C1F1D] text-base tracking-tight">
                  NEXUS-CRIME
                </span>
                <span className="text-xs text-[#666B67]">
                  Investigation Workspace
                </span>
              </div>
            </div>
          </div>

          {/* Action Controls & Case Selector */}
          <div className="flex items-center flex-wrap gap-3 text-xs">
            
            {/* Active Case Selector */}
            <div className="flex items-center gap-2 bg-[#F5F5F2] border border-[#D9DCD8] rounded px-3 py-1.5">
              <Database className="w-3.5 h-3.5 text-[#556B5D] shrink-0" />
              <span className="text-[#666B67] font-medium">Case:</span>
              <select
                value={activeCase?.case_reference || ''}
                onChange={(e) => setActiveCase(e.target.value)}
                disabled={cases.length === 0}
                className="bg-transparent text-xs text-[#1C1F1D] font-medium focus:outline-none cursor-pointer disabled:text-[#666B67]"
              >
                {cases.length === 0 ? (
                  <option value="">No cases created yet</option>
                ) : (
                  cases.map((c) => (
                    <option key={c.case_reference} value={c.case_reference}>
                      {c.title} ({c.case_reference})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Risk Formula Weights Trigger */}
            <button
              onClick={openWeightsModal}
              className="flex items-center gap-1.5 text-xs text-[#1C1F1D] hover:text-black bg-[#F5F5F2] hover:bg-[#EBEBE6] border border-[#D9DCD8] px-3 py-1.5 rounded transition-all cursor-pointer font-medium"
              title="Inspect & tune risk scoring weights"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#666B67]" />
              <span>Risk Settings</span>
            </button>

            {/* Audit Log Trigger */}
            <button
              onClick={openAuditModal}
              className="flex items-center gap-2 text-xs text-[#1C1F1D] hover:text-black bg-[#F5F5F2] hover:bg-[#EBEBE6] border border-[#D9DCD8] px-3 py-1.5 rounded transition-all cursor-pointer font-medium"
              title="Inspect activity and compliance audit log"
            >
              <span>Activity Log</span>
              <span className="bg-[#D9DCD8] text-[#1C1F1D] px-1.5 py-0.2 rounded font-semibold text-[10px]">
                {auditLogs.length}
              </span>
            </button>

            {/* Logout Button */}
            {onNavigate && (
              <button
                onClick={() => onNavigate('/landing')}
                className="flex items-center gap-1.5 text-xs text-[#666B67] hover:text-[#914B4B] px-2 py-1.5 rounded transition-colors cursor-pointer"
                title="Sign out of investigation session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            )}

          </div>

        </div>
      </div>

    </header>
  );
};

export default Header;
