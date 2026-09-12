import React from 'react';
import { Shield, ArrowRight, FileText, Database, Network, Lock, Scale } from 'lucide-react';

interface LandingPageProps {
  onNavigate?: (route: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const handleNav = (route: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigate) {
      onNavigate(route);
    } else {
      window.location.href = route;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F2] text-[#1C1F1D] flex flex-col font-sans">
      
      {/* Top Banner */}
      <div className="bg-[#EBEBE6] text-[#666B67] border-b border-[#D9DCD8] text-xs py-1.5 px-6 font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1C1F1D]">MINISTRY OF HOME AFFAIRS / NCRB</span>
            <span className="text-[#D9DCD8]">|</span>
            <span>CRIMINAL NETWORK ANALYSIS SYSTEM (SIH-189)</span>
          </div>
          <span className="text-[#556B5D] font-semibold hidden sm:inline">OFFICIAL INVESTIGATOR PORTAL</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-[#D9DCD8] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={(e) => handleNav('/', e)}>
            <div className="w-8 h-8 rounded bg-[#556B5D] text-white flex items-center justify-center font-bold text-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-[#1C1F1D] leading-none">
                NEXUS-CRIME
              </div>
              <div className="text-xs text-[#666B67] mt-0.5">
                Criminal Network Analysis
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={(e) => handleNav('/login', e)}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#556B5D] hover:bg-[#435449] px-4 py-2 rounded transition-colors cursor-pointer"
            >
              <span>Investigator Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">

        {/* Hero Section: Plain, Clear English */}
        <section className="border-b border-[#D9DCD8] bg-white py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-3xl space-y-6">
              
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#556B5D] bg-[#F5F5F2] border border-[#D9DCD8] px-3 py-1 rounded">
                <Scale className="w-3.5 h-3.5" />
                <span>Statutory Compliance &amp; Case Analysis</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1C1F1D] leading-tight">
                Connect phone records, reports, and locations into one clear investigation view.
              </h1>

              <p className="text-base text-[#666B67] leading-relaxed">
                NEXUS-CRIME helps investigating officers discover hidden connections between people, phone numbers, and money transfers across multiple incident locations with complete evidence tracing.
              </p>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={(e) => handleNav('/login', e)}
                  className="flex items-center gap-2 text-xs font-semibold bg-[#556B5D] hover:bg-[#435449] text-white px-5 py-2.5 rounded transition-colors cursor-pointer"
                >
                  <span>Open Investigation Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleNav('/privacy', e)}
                  className="text-xs font-medium text-[#1C1F1D] bg-[#F5F5F2] hover:bg-[#EBEBE6] border border-[#D9DCD8] px-4 py-2.5 rounded transition-colors cursor-pointer"
                >
                  Compliance &amp; Governance
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* 4 Step Grandparent-Friendly Workflow */}
        <section className="border-b border-[#D9DCD8] bg-[#F5F5F2] py-14">
          <div className="max-w-7xl mx-auto px-6">
            
            <div className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#556B5D]">
                How It Works
              </h2>
              <p className="text-2xl font-bold text-[#1C1F1D] mt-1">
                4 Steps from Raw Files to Clear Evidence
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className="bg-white border border-[#D9DCD8] p-5 rounded space-y-2">
                <div className="w-7 h-7 rounded bg-[#F5F5F2] border border-[#D9DCD8] flex items-center justify-center text-[#556B5D]">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-[#556B5D]">1. Add Information</div>
                <div className="text-sm font-bold text-[#1C1F1D]">Warrant &amp; File Entry</div>
                <p className="text-xs text-[#666B67] leading-relaxed">
                  Enter police reports, call logs, bank records, or field notes under verified statutory authorization.
                </p>
              </div>

              <div className="bg-white border border-[#D9DCD8] p-5 rounded space-y-2">
                <div className="w-7 h-7 rounded bg-[#F5F5F2] border border-[#D9DCD8] flex items-center justify-center text-[#556B5D]">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-[#556B5D]">2. Find Matches</div>
                <div className="text-sm font-bold text-[#1C1F1D]">Locations &amp; Movements</div>
                <p className="text-xs text-[#666B67] leading-relaxed">
                  Checks which phones or people were present at the same locations or traveled together along the same path.
                </p>
              </div>

              <div className="bg-white border border-[#D9DCD8] p-5 rounded space-y-2">
                <div className="w-7 h-7 rounded bg-[#F5F5F2] border border-[#D9DCD8] flex items-center justify-center text-[#556B5D]">
                  <Network className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-[#556B5D]">3. View Connections</div>
                <div className="text-sm font-bold text-[#1C1F1D]">Relationship Graph</div>
                <p className="text-xs text-[#666B67] leading-relaxed">
                  Connects callers, transfer recipients, and co-located people into a visual map of relationships.
                </p>
              </div>

              <div className="bg-white border border-[#D9DCD8] p-5 rounded space-y-2">
                <div className="w-7 h-7 rounded bg-[#F5F5F2] border border-[#D9DCD8] flex items-center justify-center text-[#556B5D]">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-[#556B5D]">4. Inspect Evidence</div>
                <div className="text-sm font-bold text-[#1C1F1D]">Transparent Scoring</div>
                <p className="text-xs text-[#666B67] leading-relaxed">
                  Explains each risk score with exact date, time, and citation records for official reporting.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* Factual Statutory Ethics Notice */}
        <section className="bg-white py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="border border-[#D9DCD8] bg-[#F5F5F2] p-5 rounded text-xs space-y-2">
              <div className="flex items-center gap-2 text-[#914B4B] font-bold">
                <Scale className="w-4 h-4" />
                <span>Statutory Investigative Guidelines (BNSS §92 &amp; IT Act 2000)</span>
              </div>
              <p className="text-[#666B67] leading-relaxed">
                Every calculation generated by this platform constitutes an investigative correlation lead, not an evidentiary conclusion. Risk scores reflect mathematical proximity across telecommunication datasets and do not imply guilt. No demographic attributes (religion, caste, ethnicity, gender) are collected or used in any scoring formula. All identified entities require independent field corroboration by the assigned investigating officer.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#D9DCD8] bg-white py-6 text-xs text-[#666B67]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#1C1F1D] font-bold">NEXUS-CRIME</span>
            <span>· AI-Powered Criminal Network Analysis System · SIH PS 189</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={(e) => handleNav('/privacy', e)} className="hover:text-[#1C1F1D] transition-colors cursor-pointer">Privacy</button>
            <span>·</span>
            <button onClick={(e) => handleNav('/terms', e)} className="hover:text-[#1C1F1D] transition-colors cursor-pointer">Terms</button>
            <span>·</span>
            <button onClick={(e) => handleNav('/acceptable-use', e)} className="hover:text-[#1C1F1D] transition-colors cursor-pointer">AUP</button>
            <span>·</span>
            <button onClick={(e) => handleNav('/data-processing', e)} className="hover:text-[#1C1F1D] transition-colors cursor-pointer">DPA</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
