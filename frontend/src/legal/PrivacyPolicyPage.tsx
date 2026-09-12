import { ArrowLeft } from 'lucide-react';

const LAST_UPDATED = '30 August 2026';

interface Props {
  onNavigate?: (route: string) => void;
}

export default function PrivacyPolicyPage({ onNavigate }: Props) {
  const handleNav = (route: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigate) onNavigate(route);
    else window.location.href = route;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F2] text-[#1C1F1D] flex flex-col font-sans">

      {/* Top Banner */}
      <div className="bg-[#EBEBE6] text-[#666B67] text-xs py-1.5 px-6 border-b border-[#D9DCD8]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-[#1C1F1D]">LEGAL &amp; COMPLIANCE PORTAL</span>
          <span className="text-[#556B5D] font-bold">BNSS §92 &amp; DPDP ACT 2023</span>
        </div>
      </div>

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
          <h1 className="text-2xl font-bold text-[#1C1F1D] tracking-tight">Privacy &amp; Data Governance Policy</h1>
          <p className="text-xs text-[#666B67]">Last updated: {LAST_UPDATED}</p>
        </div>

        <article className="space-y-8 text-xs text-[#666B67] leading-relaxed">

          {/* 1 */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#1C1F1D]">1. Introduction and Scope</h2>
            <p>
              This Privacy Policy governs the collection, processing, storage, and disposal of data within 
              the NEXUS-CRIME AI-Powered Criminal Network Analysis System ("the System"), developed in 
              response to Smart India Hackathon (SIH) Problem Statement 189. The System is designed 
              exclusively for use by authorized law-enforcement investigators, supervising officers, and 
              judicial stakeholders operating under the jurisdiction of Indian criminal law, including the 
              Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023 and the Information Technology Act, 2000.
            </p>
            <p>
              This policy applies to all categories of data processed by the System, including but not 
              limited to: cell tower dump records, Call Detail Records (CDRs), financial transaction logs, 
              First Information Report (FIR) narratives, geospatial coordinates, device identifiers, and 
              any derived analytical outputs such as risk scores, relationship graphs, and entity resolution results.
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">2. Lawful Basis for Data Processing</h2>
            <p>
              All data processing within NEXUS-CRIME is conducted under explicit legal authorization. 
              The System enforces a hard-gated requirement under BNSS Section 92 (successor to CrPC Section 91): 
              no correlation job, data ingestion, or analytical query can be initiated without a valid, 
              verifiable court warrant reference or judicial authorization order. This warrant reference is 
              recorded immutably in the audit log and attached to every derived output.
            </p>
            <p>
              Processing activities fall under the following lawful bases:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Compliance with legal obligations under BNSS, IT Act, and applicable state police acts</li>
              <li>Performance of tasks carried out in the public interest, specifically criminal investigation and prosecution support</li>
              <li>Legitimate law-enforcement interests balanced against the data subject's fundamental rights as guaranteed under Article 21 of the Constitution of India</li>
            </ul>
          </section>

          {/* 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">3. Categories of Data Collected</h2>
            
            <h3 className="text-sm font-semibold text-slate-200">3.1 Investigative Data</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong className="text-slate-300">Cell Tower Dump Records:</strong> Tower identifiers (Cell ID, LAC), timestamps, coverage radii, operator metadata, and associated device IMEI/IMSI hashes</li>
              <li><strong className="text-slate-300">Call Detail Records (CDRs):</strong> Anonymized caller/callee device hashes, call timestamps, durations, cell tower associations, and call types (voice, SMS, data)</li>
              <li><strong className="text-slate-300">Financial Transaction Records:</strong> Transaction identifiers, anonymized sender/receiver hashes, amounts, timestamps, and transaction types (hawala, UPI, bank transfer)</li>
              <li><strong className="text-slate-300">FIR Narratives:</strong> Full-text First Information Reports as filed with police stations, including extracted named entities (persons, locations, vehicles, phone numbers, organizations)</li>
              <li><strong className="text-slate-300">Geospatial Data:</strong> Latitude/longitude coordinates of crime scenes, cell tower locations, and device movement trajectories</li>
            </ul>

            <h3 className="text-sm font-semibold text-slate-200">3.2 System Access Data</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong className="text-slate-300">Authentication Records:</strong> Investigator email, department affiliation, sign-in timestamps, session identifiers, and IP addresses</li>
              <li><strong className="text-slate-300">Audit Trail Entries:</strong> Every query, correlation request, entity resolution decision, evidence export, and configuration change with operator identity and timestamp</li>
              <li><strong className="text-slate-300">Error and Diagnostic Logs:</strong> Request IDs, stack traces (sanitized), processing durations, and system health metrics — no personally identifiable information (PII) is recorded in diagnostic logs</li>
            </ul>

            <h3 className="text-sm font-semibold text-slate-200">3.3 Data NOT Collected</h3>
            <p className="text-slate-400">
              The System explicitly does not collect, store, or process any demographic attributes including 
              but not limited to: religion, caste, ethnicity, gender, political affiliation, sexual orientation, 
              or disability status. No risk scoring formula, graph weighting algorithm, or entity resolution 
              heuristic incorporates any such feature. This is an architectural constraint, not a policy 
              preference — the data model does not contain fields for these attributes.
            </p>
          </section>

          {/* 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">4. Data Processing Purposes</h2>
            <p>Data processed by the System is used exclusively for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Cross-source correlation of telecommunications, financial, and narrative data to identify investigative leads</li>
              <li>Geospatial co-location and co-movement analysis using PostGIS spatial queries</li>
              <li>Relationship graph construction and community detection using Neo4j and Louvain modularity clustering</li>
              <li>Named entity recognition and resolution from FIR narratives using spaCy NER and RapidFuzz fuzzy matching</li>
              <li>Explainable risk scoring using a transparent, linear formula with auditable weight parameters</li>
              <li>Generation of judicial dossiers containing evidence chains with verbatim source citations</li>
              <li>Maintaining a complete, tamper-evident audit trail for legal compliance and judicial review</li>
            </ul>
          </section>

          {/* 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">5. Data Storage and Security</h2>
            <h3 className="text-sm font-semibold text-slate-200">5.1 Storage Architecture</h3>
            <p className="text-slate-400">
              All data is stored on air-gapped or department-controlled infrastructure. The System is designed 
              for offline-first operation per the blueprint specification and does not transmit investigative 
              data to any external cloud service, third-party analytics platform, or public endpoint. 
              PostgreSQL with PostGIS extensions stores structured records and spatial data. Neo4j stores 
              the fused relationship graph. All databases are encrypted at rest using AES-256.
            </p>

            <h3 className="text-sm font-semibold text-slate-200">5.2 Access Controls</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Role-based access control (RBAC) with investigator, supervisor, and admin roles</li>
              <li>Authentication via Firebase Authentication with Google Workspace integration restricted to authorized government domains</li>
              <li>Session tokens expire after 8 hours of inactivity; all sessions are server-invalidatable</li>
              <li>All API endpoints require valid authentication and are rate-limited</li>
            </ul>

            <h3 className="text-sm font-semibold text-slate-200">5.3 Data Anonymization</h3>
            <p className="text-slate-400">
              All device identifiers (IMEI, IMSI, phone numbers) are stored as irreversible SHA-256 hashes. 
              The System operates on hashed identifiers for correlation purposes. Raw identifiers are accepted 
              at ingestion, hashed immediately, and the raw values are discarded from application memory. 
              Reverse lookup of hashes to original identifiers requires a separate, independently authorized 
              process outside the scope of this System.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">6. Data Retention</h2>
            <p className="text-slate-400">
              Investigative data is retained for the duration of the active case plus a statutory retention 
              period as defined by the investigating authority's records management policy, typically aligned 
              with the applicable limitation period under the Bharatiya Nyaya Sanhita (BNS) 2023. Upon case 
              closure and expiry of the retention period, all associated data — including raw records, derived 
              graphs, risk scores, and audit logs — is subject to secure deletion using NIST SP 800-88 
              compliant procedures. Audit trail records may be retained beyond the investigative data retention 
              period as required by judicial oversight obligations.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">7. Data Sharing and Disclosure</h2>
            <p className="text-slate-400">
              The System does not share data with any commercial entity, advertising network, or data broker. 
              Data may be disclosed in the following circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>To other authorized investigating officers within the same case, subject to RBAC permissions and audit logging</li>
              <li>To supervising judicial officers reviewing evidence or audit trails as part of pre-trial or trial proceedings</li>
              <li>In response to a court order or legal process that supersedes the existing warrant authorization</li>
              <li>To a designated data protection officer for compliance review or incident investigation</li>
            </ul>
          </section>

          {/* 8 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">8. Rights of Data Subjects</h2>
            <p className="text-slate-400">
              Persons whose data has been processed by the System (suspects, witnesses, bystanders captured 
              in tower dump overlap) have rights under the Digital Personal Data Protection Act, 2023 (DPDPA) 
              and Article 21 of the Constitution, subject to the statutory exemptions for law enforcement:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong className="text-slate-300">Right to Access:</strong> Subject to the law-enforcement exemption under DPDPA Section 17(2)(a), data subjects may request disclosure through the appropriate judicial channel</li>
              <li><strong className="text-slate-300">Right to Correction:</strong> Entity resolution decisions are human-reviewable; errors in identity linkage can be corrected by an authorized operator</li>
              <li><strong className="text-slate-300">Right to Erasure:</strong> Upon acquittal, case dismissal, or expiry of the retention period, all personal data associated with the individual is securely deleted</li>
              <li><strong className="text-slate-300">Right to Grievance Redressal:</strong> Complaints may be directed to the designated Data Protection Officer of the operating department</li>
            </ul>
          </section>

          {/* 9 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">9. Algorithmic Transparency</h2>
            <p className="text-slate-400">
              All risk scores produced by the System are computed using a fully transparent, deterministic 
              linear formula: <code className="font-mono text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded text-xs">Risk = (0.30 × Centrality) + (0.25 × CoLocation) + (0.25 × CoMovement) + (0.20 × Calls)</code>. 
              No opaque machine learning model, neural network, or black-box classifier is used in the scoring 
              pipeline. The weight parameters are configurable and auditable. Every scored entity carries a 
              complete evidence citation chain linking the score to specific raw source records.
            </p>
            <p className="text-slate-400">
              Named Entity Recognition (NER) uses the spaCy framework with a pre-trained model. Entity 
              resolution uses RapidFuzz with a configurable similarity threshold. All entities flagged in 
              the 70–90% confidence corridor are routed to a human-in-the-loop review queue — no automated 
              identity merges occur in this range.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">10. Cookies and Tracking</h2>
            <p className="text-slate-400">
              The System uses strictly necessary session cookies for authentication state management. 
              No analytics cookies, advertising trackers, third-party pixels, fingerprinting scripts, 
              or behavioral tracking mechanisms are deployed. The System does not integrate with any 
              external analytics platform (Google Analytics, Mixpanel, Amplitude, etc.).
            </p>
          </section>

          {/* 11 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">11. International Data Transfers</h2>
            <p className="text-slate-400">
              The System is designed for deployment on sovereign Indian infrastructure. No investigative data 
              is transferred outside the territory of India. Firebase Authentication may process authentication 
              tokens through Google's global infrastructure, but no investigative data (case records, suspect 
              data, CDRs, tower dumps, financial records, or FIR narratives) is transmitted to or stored on 
              any server outside the operating department's controlled infrastructure.
            </p>
          </section>

          {/* 12 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">12. Changes to This Policy</h2>
            <p className="text-slate-400">
              This Privacy Policy may be updated to reflect changes in legal requirements, system capabilities, 
              or operational practices. All authorized users will be notified of material changes via the 
              System's audit notification channel. The "Last Updated" date at the top of this document 
              reflects the most recent revision. Continued use of the System after a policy update constitutes 
              acceptance of the revised terms.
            </p>
          </section>

          {/* 13 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">13. Contact Information</h2>
            <p className="text-slate-400">
              For questions, complaints, or data subject access requests relating to this Privacy Policy, 
              contact the designated Data Protection Officer of the operating law-enforcement department. 
              Requests must include the case reference number (if known), the nature of the request, and 
              proof of identity or legal standing.
            </p>
          </section>

        </article>
      </main>

      <footer className="border-t border-slate-800/80 bg-[#0b0f19] px-6 py-4 mt-12">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>NEXUS-CRIME · Privacy Policy</span>
          <div className="flex gap-4">
            <button onClick={(e) => handleNav('/terms', e)} className="hover:text-slate-300 transition-colors">Terms</button>
            <button onClick={(e) => handleNav('/acceptable-use', e)} className="hover:text-slate-300 transition-colors">Acceptable Use</button>
            <button onClick={(e) => handleNav('/data-processing', e)} className="hover:text-slate-300 transition-colors">DPA</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
