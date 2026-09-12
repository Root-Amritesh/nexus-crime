import React from 'react';
import { X, History, Clock } from 'lucide-react';
import { useCaseStore } from '../../state/useCaseStore';

export const AuditLogModal: React.FC = () => {
  const { isAuditModalOpen, closeAuditModal, auditLogs, activeCase } = useCaseStore();

  if (!isAuditModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-3xl w-full max-h-[85vh] rounded border border-[#D9DCD8] p-6 shadow-xl flex flex-col space-y-4 font-sans text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9DCD8] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#F5F5F2] border border-[#D9DCD8] text-[#556B5D]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1C1F1D]">
                Activity &amp; Compliance Audit Log
              </h3>
              <p className="text-[11px] text-[#666B67] mt-0.5">
                Case: <strong className="text-[#1C1F1D]">{activeCase?.case_reference || 'General Session'}</strong> · Officer: <strong className="text-[#1C1F1D]">{activeCase?.investigator_id || 'Active Operator'}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={closeAuditModal}
            className="text-[#666B67] hover:text-[#1C1F1D] p-1.5 rounded hover:bg-[#F5F5F2] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audit Log Entries List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center bg-[#F5F5F2] rounded border border-[#D9DCD8] text-[#666B67]">
              No activity records generated yet during this session.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#556B5D] text-white">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-[#666B67] font-mono">{log.id}</span>
                  </div>
                  <span className="text-[11px] text-[#666B67] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-[#1C1F1D] leading-relaxed">
                  {log.details}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#D9DCD8] pt-3">
          <span className="text-[11px] text-[#666B67]">
            {auditLogs.length} total events recorded.
          </span>
          <button
            onClick={closeAuditModal}
            className="px-4 py-1.5 rounded bg-[#556B5D] hover:bg-[#435449] text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default AuditLogModal;
