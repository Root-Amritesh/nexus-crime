import React, { useState, useEffect } from 'react';
import { useCaseStore } from './state/useCaseStore';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { Header } from './components/layout/Header';
import { NavigationTabs } from './components/layout/NavigationTabs';
import { GlobalIntelHero } from './components/dashboard/GlobalIntelHero';
import { CaseStatsCards } from './components/dashboard/CaseStatsCards';
import { RankedSuspectTable } from './components/dashboard/RankedSuspectTable';
import { MapView } from './components/map/MapView';
import { GraphView } from './components/graph/GraphView';
import { FIREntityView } from './components/fir/FIREntityView';
import { CaseUploadView } from './components/upload/CaseUploadView';
import { ExplainabilityPanel } from './components/shared/ExplainabilityPanel';
import { AuditLogModal } from './components/shared/AuditLogModal';
import { RiskWeightsModal } from './components/dashboard/RiskWeightsModal';
import { ShortestPathModal } from './components/shared/ShortestPathModal';
import LandingPage from './pages/LandingPage';
import LoginPage from './auth/LoginPage';
import PrivacyPolicyPage from './legal/PrivacyPolicyPage';
import TermsPage from './legal/TermsPage';
import AcceptableUsePage from './legal/AcceptableUsePage';
import DataProcessingPage from './legal/DataProcessingPage';
import ErrorPage from './pages/ErrorPage';
import SuccessPage from './pages/SuccessPage';
import ManualIngestionPage from './pages/ManualIngestionPage';
import { Shield, Scale } from 'lucide-react';

/**
 * Inner app component that consumes auth context.
 * Separated from App so useAuth() can be called inside AuthProvider.
 */
const AppInner: React.FC = () => {
  const { activeTab, activeCase } = useCaseStore();
  const { user, loading, demoMode } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>('workstation');

  // Determine if the user is authenticated
  const isAuthenticated = demoMode || !!user;

  // Sync route on mount and popstate
  useEffect(() => {
    const getRouteFromUrl = () => {
      const path = window.location.pathname.replace(/^\//, '') || window.location.hash.replace(/^#\/?/, '');
      if (path === 'login') return 'login';
      if (path === 'landing' || path === 'home') return 'landing';
      if (path === 'privacy') return 'privacy';
      if (path === 'terms') return 'terms';
      if (path === 'acceptable-use') return 'acceptable-use';
      if (path === 'data-processing') return 'data-processing';
      if (path === 'manual-ingestion' || path === 'manual-ingest') return 'manual-ingestion';
      if (path === 'error') return 'error';
      if (path === 'success') return 'success';
      return 'workstation';
    };

    setCurrentRoute(getRouteFromUrl());

    const handlePopState = () => {
      setCurrentRoute(getRouteFromUrl());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: string) => {
    const cleaned = route.replace(/^\//, '');
    setCurrentRoute(cleaned || 'workstation');
    window.history.pushState({}, '', route.startsWith('/') ? route : `/${route}`);
    window.scrollTo(0, 0);
  };

  // Show loading spinner while Firebase auth state is resolving
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F2] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded bg-[#556B5D] text-white flex items-center justify-center font-bold text-sm mx-auto animate-pulse">
            <Shield className="w-4 h-4" />
          </div>
          <p className="text-xs text-[#666B67]">Verifying session…</p>
        </div>
      </div>
    );
  }

  // Render standalone pages outside authenticated shell
  if (currentRoute === 'landing') {
    return <LandingPage onNavigate={navigate} />;
  }

  if (currentRoute === 'login') {
    return <LoginPage onNavigate={navigate} onLoginSuccess={() => navigate('workstation')} />;
  }

  if (currentRoute === 'privacy') {
    return <PrivacyPolicyPage onNavigate={navigate} />;
  }

  if (currentRoute === 'terms') {
    return <TermsPage onNavigate={navigate} />;
  }

  if (currentRoute === 'acceptable-use') {
    return <AcceptableUsePage onNavigate={navigate} />;
  }

  if (currentRoute === 'data-processing') {
    return <DataProcessingPage onNavigate={navigate} />;
  }

  if (currentRoute === 'error') {
    return <ErrorPage />;
  }

  if (currentRoute === 'success') {
    return <SuccessPage />;
  }

  // Gate: Redirect to login if not authenticated (workstation and manual-ingestion require auth)
  if (!isAuthenticated && (currentRoute === 'workstation' || currentRoute === 'manual-ingestion')) {
    // Use setTimeout to avoid state update during render
    setTimeout(() => navigate('login'), 0);
    return null;
  }

  if (currentRoute === 'manual-ingestion') {
    return <ManualIngestionPage onNavigate={navigate} />;
  }

  // Workstation Shell
  return (
    <div className="min-h-screen bg-[#F5F5F2] text-[#1C1F1D] flex flex-col justify-between font-sans">
      
      {/* Top Application Shell */}
      <div>
        <Header onNavigate={navigate} />
        <NavigationTabs />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          
          {/* Active Case Banner (if a case exists) */}
          {activeCase && (
            <div className="bg-white border border-[#D9DCD8] rounded px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-[#F5F5F2] border border-[#D9DCD8] flex items-center justify-center shrink-0">
                  <Scale className="w-3.5 h-3.5 text-[#556B5D]" />
                </div>
                <div>
                  <span className="font-bold text-[#1C1F1D] text-sm">{activeCase.title}</span>
                  <span className="text-[#666B67] block text-xs sm:inline sm:ml-2">
                    Case Ref: {activeCase.case_reference}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#666B67]">
                <span>Status: <strong className="text-[#556B5D]">{activeCase.status}</strong></span>
                <span>·</span>
                <span>Officer: <strong className="text-[#1C1F1D]">
                  {demoMode
                    ? 'INV-DEMO-001'
                    : user?.email || activeCase.investigator_id || 'Not Assigned'}
                </strong></span>
              </div>
            </div>
          )}

          {/* Tab Views */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <GlobalIntelHero />
              <CaseStatsCards />
              <RankedSuspectTable />
            </div>
          )}

          {activeTab === 'map' && (
            <div>
              <MapView />
            </div>
          )}

          {activeTab === 'graph' && (
            <div>
              <GraphView />
            </div>
          )}

          {activeTab === 'fir' && (
            <div>
              <FIREntityView />
            </div>
          )}

          {activeTab === 'upload' && (
            <div>
              <CaseUploadView />
            </div>
          )}

        </main>
      </div>

      {/* Shared Modals */}
      <ExplainabilityPanel />
      <AuditLogModal />
      <RiskWeightsModal />
      <ShortestPathModal />

      {/* Footer */}
      <footer className="bg-white border-t border-[#D9DCD8] px-6 py-4 mt-8 text-xs text-[#666B67]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#556B5D]" />
            <span>
              <strong>NEXUS-CRIME</strong> · AI-Powered Criminal Network Analysis System
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <button onClick={() => navigate('privacy')} className="hover:text-[#1C1F1D] transition-colors cursor-pointer">Privacy</button>
            <span>·</span>
            <button onClick={() => navigate('terms')} className="hover:text-[#1C1F1D] transition-colors cursor-pointer">Terms</button>
            <span>·</span>
            <button onClick={() => navigate('acceptable-use')} className="hover:text-[#1C1F1D] transition-colors cursor-pointer">AUP</button>
            <span>·</span>
            <button onClick={() => navigate('data-processing')} className="hover:text-[#1C1F1D] transition-colors cursor-pointer">DPA</button>
          </div>
        </div>
      </footer>

    </div>
  );
};

/**
 * Root App component — wraps everything in AuthProvider.
 */
export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
};

export default App;
