import { ArrowLeft } from 'lucide-react';

const LAST_UPDATED = '30 August 2026';

interface Props {
  onNavigate?: (route: string) => void;
}

export default function TermsPage({ onNavigate }: Props) {
  const handleNav = (route: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigate) onNavigate(route);
    else window.location.href = route;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F2] text-[#1C1F1D] flex flex-col font-sans">

      {/* Nav */}
      <nav className="border-b border-[#D9DCD8] bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={(e) => handleNav('/', e)} className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded bg-[#556B5D] text-white flex items-center justify-center text-xs font-bold">
              NX
            </div>
            <span className="font-bold text-base text-[#1C1F1D]">
              NEXUS-CRIME
            </span>
          </button>
          <button onClick={(e) => handleNav('/', e)} className="inline-flex items-center gap-1.5 text-xs text-[#666B67] hover:text-[#1C1F1D] transition-colors cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Workspace
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-1 mb-8 pb-4 border-b border-[#D9DCD8]">
          <h1 className="text-2xl font-bold text-[#1C1F1D] tracking-tight">Terms &amp; Conditions</h1>
          <p className="text-xs text-[#666B67]">Last updated: {LAST_UPDATED}</p>
        </div>

        <article className="space-y-8 text-xs text-[#666B67] leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the NEXUS-CRIME AI-Powered Criminal Network Analysis System ("the System"), 
              you acknowledge that you have read, understood, and agree to be bound by these Terms and 
              Conditions. If you do not agree, you must not access or use the System. These terms constitute 
              a binding agreement between you ("the User," "Investigator," or "Officer") and the operating 
              law-enforcement authority that administers this installation of the System.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">2. Authorized Use</h2>
            <p>
              The System is restricted to authorized law-enforcement investigators, supervising officers, 
              prosecutors, and designated judicial stakeholders who have been granted access by their 
              department's system administrator. Access credentials are issued on a per-individual basis and 
              are non-transferable. Sharing credentials, session tokens, or access methods with unauthorized 
              persons constitutes a violation of these terms and may result in immediate access revocation, 
              disciplinary action under applicable service rules, and potential criminal liability under the 
              Information Technology Act, 2000 (Sections 43, 66, 66C).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">3. Legal Prerequisites for System Use</h2>
            <p>
              Every data ingestion, correlation job, and analytical query requires a valid court warrant 
              reference or judicial authorization order compliant with BNSS Section 92. The User is personally 
              responsible for ensuring that:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>The warrant is valid, current, and has not expired or been revoked</li>
              <li>The scope of the warrant covers the specific data categories being ingested (tower dumps, CDRs, financial records, FIR narratives)</li>
              <li>The warrant authorizes correlation across the specific geographical and temporal boundaries of the investigation</li>
              <li>A copy of the warrant is available for judicial review upon request</li>
            </ul>
            <p className="text-slate-400">
              Submission of a fraudulent, expired, or fabricated warrant reference is a criminal offense and 
              will be reported to the relevant oversight authority. The System logs all warrant references 
              immutably; retroactive modification is not possible.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">4. Nature of System Outputs</h2>
            <p>
              All outputs produced by the System — including risk scores, ranked suspect lists, relationship 
              graphs, co-location analyses, and entity resolution suggestions — are <strong className="text-slate-100">investigative leads</strong>, 
              not evidentiary conclusions. They represent mathematical correlations across data sources and 
              do not, individually or collectively, establish guilt, intent, association, or criminal liability.
            </p>
            <p className="text-slate-400">
              The User acknowledges and accepts that:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Risk scores are derived from a transparent linear formula and reflect proximity metrics, not probabilistic guilt assessments</li>
              <li>Co-location at a cell tower does not prove physical presence at a crime scene — tower coverage radii may span several kilometers</li>
              <li>Entity resolution matches below 90% confidence require human review and must not be treated as confirmed identity links</li>
              <li>All flagged entities require independent verification through traditional investigative methods before any procedural action</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">5. Audit Trail and Accountability</h2>
            <p>
              The System maintains a comprehensive, tamper-evident audit trail recording every significant 
              action: sign-ins, data uploads, correlation job initiations, entity resolution decisions, 
              evidence exports, configuration changes, and sign-outs. Each audit entry includes the operator's 
              identity, timestamp, action type, case reference, and warrant reference.
            </p>
            <p className="text-slate-400">
              The User acknowledges that this audit trail may be reviewed by supervising officers, internal 
              affairs divisions, judicial authorities, and designated oversight bodies. The User may not 
              disable, circumvent, or tamper with audit logging. Any attempt to do so constitutes a violation 
              of these terms and may result in criminal prosecution under the IT Act.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">6. Prohibited Uses</h2>
            <p>The following uses of the System are expressly prohibited:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Using the System for personal, commercial, or non-investigative purposes</li>
              <li>Querying data unrelated to an active, authorized investigation</li>
              <li>Profiling individuals based on religion, caste, ethnicity, gender, political affiliation, or any other protected characteristic</li>
              <li>Exporting data for use in systems that do not maintain equivalent audit and access controls</li>
              <li>Attempting to reverse-engineer hashed identifiers to recover original phone numbers, IMEI, or IMSI values through the System</li>
              <li>Using the System's outputs to harass, intimidate, or coerce any individual</li>
              <li>Sharing screenshots, exports, or analytical results with media, social media, or any unauthorized third party</li>
              <li>Modifying risk formula weights with the intent to bias results toward or against specific individuals or groups</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">7. Intellectual Property</h2>
            <p>
              The System's software, algorithms, user interface design, documentation, and associated 
              intellectual property are protected under the Copyright Act, 1957 and the Patents Act, 1970. 
              The User is granted a non-exclusive, non-transferable, revocable license to use the System 
              solely for its intended law-enforcement purpose. No rights to the source code, data models, 
              or algorithmic logic are transferred to the User. Reverse engineering, decompilation, or 
              disassembly of the System is prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">8. Limitation of Liability</h2>
            <p>
              The System is provided as-is for law-enforcement support. The developers and operating 
              authority make no warranty, express or implied, regarding the accuracy, completeness, or 
              reliability of the System's analytical outputs. The System does not replace human judgment, 
              independent investigation, or forensic evidence. In no event shall the System's developers 
              or operators be liable for any direct, indirect, incidental, or consequential damages arising 
              from the use or inability to use the System, including but not limited to wrongful arrest, 
              false prosecution, or reputational harm to any individual.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">9. Indemnification</h2>
            <p>
              The User agrees to indemnify, defend, and hold harmless the System's developers, the operating 
              department, and their respective officers, employees, and agents from and against any claims, 
              damages, losses, or expenses (including legal fees) arising from the User's violation of these 
              terms, misuse of the System, submission of false warrant references, or failure to comply with 
              applicable laws and regulations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">10. Termination</h2>
            <p>
              Access to the System may be suspended or revoked at any time by the system administrator, 
              department head, or designated oversight authority, with or without cause. Grounds for 
              immediate termination include: unauthorized access attempts, credential sharing, use for 
              non-investigative purposes, submission of fraudulent warrant references, or any violation 
              of these terms. Upon termination, the User's access credentials are invalidated, and all 
              active sessions are destroyed. Data submitted or generated by the User during their authorized 
              access period remains subject to the case retention policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">11. Governing Law and Jurisdiction</h2>
            <p>
              These Terms and Conditions are governed by and construed in accordance with the laws of India, 
              including the Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023, the Information Technology Act, 
              2000, the Digital Personal Data Protection Act, 2023, and applicable state police acts. Any 
              disputes arising under or in connection with these terms shall be subject to the exclusive 
              jurisdiction of the courts in the district where the operating department is headquartered.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">12. Amendments</h2>
            <p>
              These terms may be amended by the operating authority at any time. Users will be notified 
              of material amendments through the System's notification channel. Continued use of the 
              System following notification of an amendment constitutes acceptance of the revised terms.
            </p>
          </section>

        </article>
      </main>

      <footer className="border-t border-slate-800/80 bg-[#0b0f19] px-6 py-4 mt-12">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>NEXUS-CRIME · Terms & Conditions</span>
          <div className="flex gap-4">
            <button onClick={(e) => handleNav('/privacy', e)} className="hover:text-slate-300 transition-colors">Privacy</button>
            <button onClick={(e) => handleNav('/acceptable-use', e)} className="hover:text-slate-300 transition-colors">Acceptable Use</button>
            <button onClick={(e) => handleNav('/data-processing', e)} className="hover:text-slate-300 transition-colors">DPA</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
