import React from 'react';
import { ManualIngestionView } from '../components/upload/ManualIngestionView';
import { Header } from '../components/layout/Header';
import { NavigationTabs } from '../components/layout/NavigationTabs';
import { ExplainabilityPanel } from '../components/shared/ExplainabilityPanel';
import { AuditLogModal } from '../components/shared/AuditLogModal';
import { RiskWeightsModal } from '../components/dashboard/RiskWeightsModal';
import { ShortestPathModal } from '../components/shared/ShortestPathModal';

interface ManualIngestionPageProps {
  onNavigate?: (route: string) => void;
}

export const ManualIngestionPage: React.FC<ManualIngestionPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#F5F5F2] text-[#1C1F1D] flex flex-col justify-between font-sans">
      
      <div>
        <Header onNavigate={onNavigate} />
        <NavigationTabs />

        <main className="max-w-7xl mx-auto px-6 py-6">
          <ManualIngestionView />
        </main>
      </div>

      {/* Shared Modals */}
      <ExplainabilityPanel />
      <AuditLogModal />
      <RiskWeightsModal />
      <ShortestPathModal />

      {/* Footer */}
      <footer className="border-t border-[#D9DCD8] bg-white py-4 px-6 text-xs text-[#666B67] text-center">
        NEXUS-CRIME · Manual Data Entry · AI-Powered Criminal Network Analysis
      </footer>

    </div>
  );
};

export default ManualIngestionPage;
