import { ArrowLeft } from 'lucide-react';

const LAST_UPDATED = '30 August 2026';

interface Props {
  onNavigate?: (route: string) => void;
}

export default function DataProcessingPage({ onNavigate }: Props) {
  const handleNav = (route: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigate) onNavigate(route);
    else window.location.href = route;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F2] text-[#1C1F1D] flex flex-col font-sans">

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
          <h1 className="text-2xl font-bold text-[#1C1F1D] tracking-tight">Data Processing Agreement</h1>
          <p className="text-xs text-[#666B67]">Last updated: {LAST_UPDATED}</p>
        </div>

        <article className="space-y-8 text-xs text-[#666B67] leading-relaxed">

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#1C1F1D]">1. Parties and Definitions</h2>
            <p>
              This Data Processing Agreement ("DPA") is entered into between the law-enforcement department 
              deploying the NEXUS-CRIME system ("the Controller") and the technical team responsible for 
              system development, maintenance, and support ("the Processor"). This DPA governs the 
              processing of personal data carried out by the Processor on behalf of the Controller.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong className="text-slate-300">"Personal Data"</strong> means any information relating to an identified or identifiable natural person, including device hashes that correspond to a specific individual's telecommunications device</li>
              <li><strong className="text-slate-300">"Processing"</strong> means any operation performed on personal data, including collection, recording, organization, structuring, storage, adaptation, alteration, retrieval, consultation, use, disclosure, alignment, combination, restriction, erasure, or destruction</li>
              <li><strong className="text-slate-300">"Data Subject"</strong> means any natural person whose personal data is processed by the System, including suspects, witnesses, bystanders, and individuals whose device identifiers appear in tower dump or CDR datasets</li>
              <li><strong className="text-slate-300">"Sub-Processor"</strong> means any third party engaged by the Processor to carry out specific processing activities on behalf of the Controller</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">2. Subject Matter and Duration</h2>
            <p>
              This DPA covers the processing of investigative data within the NEXUS-CRIME system for the 
              purpose of criminal network analysis, cross-source correlation, and the generation of 
              investigative leads. The DPA remains in effect for the duration of the Controller's use 
              of the System and survives termination for the period required to complete data deletion 
              obligations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">3. Categories of Data Processed</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-400 border border-slate-800 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-300">Data Category</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-300">Personal Data Elements</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-300">Anonymization</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800/60">
                    <td className="px-4 py-2 text-slate-300">Cell Tower Dumps</td>
                    <td className="px-4 py-2">IMEI/IMSI hashes, timestamps, Cell ID</td>
                    <td className="px-4 py-2">SHA-256 at ingestion</td>
                  </tr>
                  <tr className="border-b border-slate-800/60">
                    <td className="px-4 py-2 text-slate-300">Call Detail Records</td>
                    <td className="px-4 py-2">Caller/callee device hashes, timestamps, durations</td>
                    <td className="px-4 py-2">SHA-256 at ingestion</td>
                  </tr>
                  <tr className="border-b border-slate-800/60">
                    <td className="px-4 py-2 text-slate-300">Financial Records</td>
                    <td className="px-4 py-2">Sender/receiver hashes, amounts, timestamps</td>
                    <td className="px-4 py-2">SHA-256 at ingestion</td>
                  </tr>
                  <tr className="border-b border-slate-800/60">
                    <td className="px-4 py-2 text-slate-300">FIR Narratives</td>
                    <td className="px-4 py-2">Names, addresses, vehicle registrations, phone numbers</td>
                    <td className="px-4 py-2">Stored as-filed; NER extraction only</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-300">Access Logs</td>
                    <td className="px-4 py-2">Investigator email, IP, session ID</td>
                    <td className="px-4 py-2">Not anonymized (audit requirement)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">4. Obligations of the Processor</h2>
            <p>The Processor shall:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Process personal data only on documented instructions from the Controller, including with regard to transfers of personal data</li>
              <li>Ensure that persons authorized to process the personal data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality</li>
              <li>Implement and maintain appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Encryption of personal data at rest (AES-256) and in transit (TLS 1.3)</li>
                  <li>Role-based access controls with principle of least privilege</li>
                  <li>Automated session expiry and server-side session invalidation</li>
                  <li>Tamper-evident audit logging of all data access and processing activities</li>
                  <li>Regular security assessments and vulnerability remediation</li>
                </ul>
              </li>
              <li>Assist the Controller in ensuring compliance with data subject access requests, data protection impact assessments, and reporting obligations</li>
              <li>Not engage any Sub-Processor without prior written authorization from the Controller</li>
              <li>Make available to the Controller all information necessary to demonstrate compliance with this DPA and allow for and contribute to audits and inspections</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">5. Obligations of the Controller</h2>
            <p>The Controller shall:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Ensure that all data submitted to the System has been obtained lawfully and under valid judicial authorization</li>
              <li>Verify the validity and scope of warrant references before initiating correlation jobs</li>
              <li>Ensure that all investigators using the System have completed mandatory training on data protection, acceptable use, and the System's limitations</li>
              <li>Maintain records of all processing activities conducted through the System as required by DPDPA</li>
              <li>Notify the Processor immediately of any data breach, unauthorized access, or suspected compromise of the System</li>
              <li>Conduct periodic reviews of the audit trail to detect and address any misuse or policy violations</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">6. Data Breach Notification</h2>
            <p>
              In the event of a personal data breach, the Processor shall notify the Controller without 
              undue delay and in no case later than 72 hours after becoming aware of the breach. The 
              notification shall include:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>The nature of the breach, including the categories and approximate number of data subjects and records affected</li>
              <li>The name and contact details of the Processor's designated point of contact</li>
              <li>A description of the likely consequences of the breach</li>
              <li>A description of the measures taken or proposed to address the breach, including measures to mitigate its possible adverse effects</li>
            </ul>
            <p className="text-slate-400">
              The Controller is responsible for notifying the relevant supervisory authority and affected 
              data subjects as required by DPDPA and applicable regulations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">7. Data Retention and Deletion</h2>
            <p>
              Upon termination of the processing relationship, or upon the Controller's written instruction, 
              the Processor shall:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Delete all personal data processed on behalf of the Controller, including all copies, backups, and derived data (risk scores, relationship graphs, entity resolution results)</li>
              <li>Provide written certification of deletion to the Controller</li>
              <li>Retain only such data as is required by law or regulation, and only for the minimum period required</li>
              <li>Apply NIST SP 800-88 compliant secure deletion procedures to all storage media that contained personal data</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">8. Sub-Processing</h2>
            <p>
              The Processor shall not engage any Sub-Processor without the prior specific written 
              authorization of the Controller. The current list of authorized Sub-Processors is:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-400 border border-slate-800 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-300">Sub-Processor</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-300">Processing Activity</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-300">Data Location</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800/60">
                    <td className="px-4 py-2 text-slate-300">Google Firebase</td>
                    <td className="px-4 py-2">Authentication token management only</td>
                    <td className="px-4 py-2">Google Cloud (auth tokens only; no investigative data)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-300">OpenStreetMap / CARTO</td>
                    <td className="px-4 py-2">Base map tile rendering</td>
                    <td className="px-4 py-2">CDN-delivered tiles; no user data transmitted</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              No investigative data (case records, suspect data, CDRs, tower dumps, financial records, 
              FIR narratives, risk scores, or relationship graphs) is transmitted to any Sub-Processor.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">9. International Transfers</h2>
            <p>
              The Processor shall not transfer personal data outside the territory of India without the 
              prior written consent of the Controller. Authentication tokens processed by Firebase may 
              transit Google's global infrastructure; however, no investigative data is transmitted 
              internationally. The Controller acknowledges this limited international processing for 
              authentication purposes only.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">10. Audit Rights</h2>
            <p>
              The Controller has the right to conduct audits and inspections of the Processor's data 
              processing activities, either directly or through an independent auditor, to verify 
              compliance with this DPA. The Processor shall cooperate with such audits and make available 
              all relevant documentation, system access, and personnel. Audits shall be conducted with 
              reasonable notice and during normal business hours, unless the urgency of a suspected 
              breach requires immediate action.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">11. Liability</h2>
            <p>
              Each party's liability under this DPA is subject to the limitations and exclusions set out 
              in the Terms & Conditions. The Processor shall be liable for damages caused by processing 
              that does not comply with this DPA or with the Controller's lawful instructions. The 
              Controller shall be liable for damages caused by processing that violates applicable law 
              or the Controller's own instructions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">12. Governing Law</h2>
            <p>
              This DPA is governed by the laws of India, including the Digital Personal Data Protection 
              Act, 2023, the Information Technology Act, 2000, and applicable rules and regulations 
              thereunder. Any disputes arising under this DPA shall be resolved in accordance with the 
              dispute resolution mechanism specified in the Terms & Conditions.
            </p>
          </section>

        </article>
      </main>

      <footer className="border-t border-slate-800/80 bg-[#0b0f19] px-6 py-4 mt-12">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>NEXUS-CRIME · Data Processing Agreement</span>
          <div className="flex gap-4">
            <button onClick={(e) => handleNav('/privacy', e)} className="hover:text-slate-300 transition-colors">Privacy</button>
            <button onClick={(e) => handleNav('/terms', e)} className="hover:text-slate-300 transition-colors">Terms</button>
            <button onClick={(e) => handleNav('/acceptable-use', e)} className="hover:text-slate-300 transition-colors">Acceptable Use</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
