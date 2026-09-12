import React, { useState, useMemo } from 'react';
import { 
  FileText, Phone, CreditCard, Eye, UserPlus, 
  CheckCircle2, PlusCircle, Search 
} from 'lucide-react';
import { useCaseStore } from '../../state/useCaseStore';
import type { 
  EntityType, GraphNode, GraphEdge, IngestedRecord 
} from '../../types';

type IngestionSourceType = 'FIR' | 'CDR' | 'FINANCIAL' | 'SURVEILLANCE' | 'ENTITY';

interface ExtractedEntityCandidate {
  text: string;
  type: EntityType;
  confidence: number;
}

interface ResolutionMatch {
  newEntity: string;
  existingEntity: string;
  type: EntityType;
  similarityScore: number;
  reason: string;
  decision?: 'merge' | 'separate';
}

export const ManualIngestionView: React.FC = () => {
  const { 
    graphData, 
    addManualIngestedRecord, 
    commitManualDataToGraph,
    manualIngestedRecords,
    loadSyntheticBenchmarkDataset,
    setActiveTab
  } = useCaseStore();

  // Source Type Selector
  const [sourceType, setSourceType] = useState<IngestionSourceType>('FIR');

  // Form State: FIR / Incident (Empty by default)
  const [firCaseId, setFirCaseId] = useState('');
  const [firDate, setFirDate] = useState('');
  const [firLocation, setFirLocation] = useState('');
  const [firNarrative, setFirNarrative] = useState('');

  // Form State: CDR (Empty by default)
  const [cdrCaller, setCdrCaller] = useState('');
  const [cdrRecipient, setCdrRecipient] = useState('');
  const [cdrDate, setCdrDate] = useState('');
  const [cdrDuration, setCdrDuration] = useState('');
  const [cdrTower, setCdrTower] = useState('');

  // Form State: Financial (Empty by default)
  const [finSender, setFinSender] = useState('');
  const [finReceiver, setFinReceiver] = useState('');
  const [finAmount, setFinAmount] = useState('');
  const [finType, setFinType] = useState('Bank Transfer');

  // Form State: Surveillance (Empty by default)
  const [survLocation, setSurvLocation] = useState('');
  const [survUnit, setSurvUnit] = useState('');
  const [survNarrative, setSurvNarrative] = useState('');

  // Form State: Entity Record (Empty by default)
  const [entityType] = useState<EntityType>('PERSON');
  const [entityName, setEntityName] = useState('');
  const [entityAlias, setEntityAlias] = useState('');
  const [entityPhone, setEntityPhone] = useState('');

  // Processing & Pipeline State
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntityCandidate[]>([]);
  const [resolutionMatches, setResolutionMatches] = useState<ResolutionMatch[]>([]);
  const [pendingGraphImpact, setPendingGraphImpact] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Search & Filter for Ingested Records Table
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Simple string similarity for matching
  const calculateSimilarity = (s1: string, s2: string): number => {
    const a = s1.toLowerCase().trim();
    const b = s2.toLowerCase().trim();
    if (a === b) return 1.0;
    if (a.includes(b) || b.includes(a)) return 0.85;
    
    // Character matching ratio
    let matches = 0;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) matches++;
    }
    return matches / Math.max(a.length, b.length);
  };

  // Rule-based entity extraction
  const extractEntitiesFromText = (text: string): ExtractedEntityCandidate[] => {
    const results: ExtractedEntityCandidate[] = [];
    if (!text) return results;

    const phoneMatches = text.match(/(?:\+91[\-\s]?)?[6-9]\d{9}|(?:\+91[\-\s]?)?\d{5}[\-\s]?\d{5}/g);
    if (phoneMatches) {
      phoneMatches.forEach(p => {
        results.push({ text: p.trim(), type: 'PHONE', confidence: 0.95 });
      });
    }

    const vehicleMatches = text.match(/[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,2}[-\s]?[0-9]{4}/g);
    if (vehicleMatches) {
      vehicleMatches.forEach(v => {
        results.push({ text: v.trim(), type: 'VEHICLE', confidence: 0.92 });
      });
    }

    const nameMatches = text.match(/(?:Mr\.|Shri|Inspector|accused|suspect|named|identified as)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g);
    if (nameMatches) {
      nameMatches.forEach(m => {
        const cleanName = m.replace(/(?:Mr\.|Shri|Inspector|accused|suspect|named|identified as)\s+/i, '').trim();
        if (cleanName && cleanName.length > 2) {
          results.push({ text: cleanName, type: 'PERSON', confidence: 0.88 });
        }
      });
    }

    return results;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setCurrentStep(1); // [01] Validation

    setTimeout(() => {
      setCurrentStep(2); // [02] Entity Extraction
      let extracted: ExtractedEntityCandidate[] = [];
      const newNodes: GraphNode[] = [];
      const newEdges: GraphEdge[] = [];

      if (sourceType === 'FIR') {
        extracted = extractEntitiesFromText(firNarrative);
        if (firLocation) {
          extracted.push({ text: firLocation, type: 'LOCATION', confidence: 0.98 });
          newNodes.push({
            id: `LOC-${firLocation.replace(/\s+/g, '-').toUpperCase()}`,
            label: firLocation,
            type: 'location',
            risk_score: 0.50,
            community: 1,
            centrality: 0.30,
            colocation_count: 1
          });
        }
        extracted.forEach((ent) => {
          if (ent.type === 'PERSON' || ent.type === 'PHONE') {
            const nodeId = `NODE-${ent.text.replace(/\s+/g, '-').toUpperCase()}`;
            newNodes.push({
              id: nodeId,
              label: ent.text,
              type: ent.type === 'PERSON' ? 'person' : 'device',
              risk_score: 0.65,
              community: 0,
              centrality: 0.40,
              colocation_count: 1
            });
            if (firLocation) {
              newEdges.push({
                id: `EDGE-${nodeId}-LOC`,
                source: nodeId,
                target: `LOC-${firLocation.replace(/\s+/g, '-').toUpperCase()}`,
                type: 'CO_LOCATED_AT',
                weight: 1,
                evidence: [{
                  type: 'CO_LOCATED_AT',
                  details: `Mentioned at ${firLocation} in report ${firCaseId}`
                }]
              });
            }
          }
        });
      } else if (sourceType === 'CDR') {
        const callerId = `PHONE-${cdrCaller.replace(/\D/g, '') || 'CALLER'}`;
        const recipientId = `PHONE-${cdrRecipient.replace(/\D/g, '') || 'RECIPIENT'}`;

        newNodes.push(
          {
            id: callerId,
            label: cdrCaller || 'Caller Phone',
            type: 'device',
            risk_score: 0.70,
            community: 0,
            centrality: 0.45,
            colocation_count: 1
          },
          {
            id: recipientId,
            label: cdrRecipient || 'Recipient Phone',
            type: 'device',
            risk_score: 0.65,
            community: 0,
            centrality: 0.35,
            colocation_count: 1
          }
        );

        newEdges.push({
          id: `CALL-${callerId}-${recipientId}`,
          source: callerId,
          target: recipientId,
          type: 'CALLED',
          weight: Math.max(1, Math.round(Number(cdrDuration || 60) / 60)),
          evidence: [{
            type: 'CALLED',
            duration: Number(cdrDuration) || 0,
            details: `Call between ${cdrCaller} and ${cdrRecipient} on ${cdrDate}`
          }]
        });

        extracted = [
          { text: cdrCaller, type: 'PHONE', confidence: 1.0 },
          { text: cdrRecipient, type: 'PHONE', confidence: 1.0 }
        ];
      } else if (sourceType === 'FINANCIAL') {
        const sendNode = `ACC-${finSender.replace(/\s+/g, '-').toUpperCase()}`;
        const recvNode = `ACC-${finReceiver.replace(/\s+/g, '-').toUpperCase()}`;

        newNodes.push(
          {
            id: sendNode,
            label: finSender || 'Sender Account',
            type: 'person',
            risk_score: 0.75,
            community: 0,
            centrality: 0.50,
            colocation_count: 1
          },
          {
            id: recvNode,
            label: finReceiver || 'Receiver Account',
            type: 'person',
            risk_score: 0.80,
            community: 0,
            centrality: 0.55,
            colocation_count: 1
          }
        );

        newEdges.push({
          id: `TXN-${sendNode}-${recvNode}`,
          source: sendNode,
          target: recvNode,
          type: 'TRANSACTED_WITH',
          weight: Math.max(1, Math.round(Number(finAmount || 10000) / 50000)),
          evidence: [{
            type: 'TRANSACTED_WITH',
            amount: Number(finAmount) || 0,
            details: `Transfer of ₹${Number(finAmount || 0).toLocaleString()} via ${finType}`
          }]
        });

        extracted = [
          { text: finSender, type: 'PERSON', confidence: 0.95 },
          { text: finReceiver, type: 'PERSON', confidence: 0.95 }
        ];
      } else if (sourceType === 'ENTITY') {
        const directId = `ENT-${(entityName || entityPhone || 'NODE').replace(/\s+/g, '-').toUpperCase()}`;
        newNodes.push({
          id: directId,
          label: entityName || entityPhone || 'New Entity',
          type: entityType === 'PERSON' ? 'person' : entityType === 'LOCATION' ? 'location' : 'device',
          risk_score: 0.50,
          community: 0,
          centrality: 0.20,
          colocation_count: 1,
          alias: entityAlias
        });
        extracted = [{
          text: entityName || entityPhone || 'New Entity',
          type: entityType,
          confidence: 1.0
        }];
      }

      setExtractedEntities(extracted);

      setTimeout(() => {
        setCurrentStep(3); // [03] Entity Resolution

        const matches: ResolutionMatch[] = [];
        extracted.forEach(ent => {
          graphData.nodes.forEach(existingNode => {
            const sim = calculateSimilarity(ent.text, existingNode.label);
            if (sim >= 0.65 && sim < 1.0) {
              matches.push({
                newEntity: ent.text,
                existingEntity: existingNode.label,
                type: ent.type,
                similarityScore: sim,
                reason: `Name token similarity (${(sim * 100).toFixed(0)}%) with existing node`
              });
            }
          });
        });

        setResolutionMatches(matches);
        setPendingGraphImpact({ nodes: newNodes, edges: newEdges });

        setTimeout(() => {
          setCurrentStep(4); // [04] Ready for Review
          setIsProcessing(false);
          setShowReviewModal(true);
        }, 500);

      }, 500);

    }, 500);
  };

  // Commit Approved Record into Graph & Session Store
  const handleApproveAndCommit = () => {
    if (!pendingGraphImpact) return;

    const newRecordId = `REC-${sourceType}-${Date.now().toString().slice(-4)}`;
    let summaryText = '';
    let sourceRef = '';

    if (sourceType === 'FIR') {
      summaryText = `Report for ${firCaseId || 'Incident'} at ${firLocation || 'Location'}`;
      sourceRef = firCaseId || 'DIRECT-ENTRY';
    } else if (sourceType === 'CDR') {
      summaryText = `Call: ${cdrCaller || 'Caller'} -> ${cdrRecipient || 'Recipient'} (${cdrDuration || 0}s)`;
      sourceRef = 'CDR-LOG';
    } else if (sourceType === 'FINANCIAL') {
      summaryText = `Transfer: ₹${Number(finAmount || 0).toLocaleString()} (${finSender || 'Sender'} -> ${finReceiver || 'Receiver'})`;
      sourceRef = 'FIN-TXN';
    } else if (sourceType === 'SURVEILLANCE') {
      summaryText = `Observation by ${survUnit || 'Officer'} at ${survLocation || 'Location'}`;
      sourceRef = 'SURV-REP';
    } else {
      summaryText = `Direct Entity: ${entityName || entityPhone || 'Unknown'} [${entityType}]`;
      sourceRef = 'DIRECT-ENT';
    }

    const createdRecord: IngestedRecord = {
      id: newRecordId,
      type: sourceType,
      source_reference: sourceRef,
      entities_extracted: extractedEntities.length,
      relationships_created: pendingGraphImpact.edges.length,
      status: 'PROCESSED',
      timestamp: new Date().toISOString(),
      summary: summaryText,
      raw_payload: {
        sourceType,
        firCaseId,
        cdrCaller,
        cdrRecipient,
        finAmount,
        entityName
      },
      extracted_entities: extractedEntities.map((ent, idx) => ({
        id: `ENT-${newRecordId}-${idx}`,
        text: ent.text,
        type: ent.type,
        start_char: 0,
        end_char: ent.text.length,
        confidence: ent.confidence,
        status: 'accepted'
      }))
    };

    addManualIngestedRecord(createdRecord);
    commitManualDataToGraph(
      pendingGraphImpact.nodes,
      pendingGraphImpact.edges,
      createdRecord.extracted_entities
    );

    setShowReviewModal(false);
    setSubmissionSuccess(true);
    setPendingGraphImpact(null);
    setCurrentStep(null);

    // Reset form fields
    setFirNarrative('');
    setFirLocation('');
    setFirCaseId('');
    setCdrCaller('');
    setCdrRecipient('');
    setCdrDuration('');
    setFinSender('');
    setFinReceiver('');
    setFinAmount('');
    setEntityName('');
    setEntityPhone('');
    setSurvNarrative('');

    setTimeout(() => {
      setSubmissionSuccess(false);
    }, 4000);
  };

  const filteredIngestedRecords = useMemo(() => {
    return manualIngestedRecords.filter(r => {
      const matchesSearch = 
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.source_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.summary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [manualIngestedRecords, searchQuery, typeFilter]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Success Notification */}
      {submissionSuccess && (
        <div className="p-4 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Information added successfully. Relationships and counts have been updated in real time.</span>
          </div>
          <button 
            onClick={() => setActiveTab('graph')}
            className="font-semibold text-emerald-900 underline hover:no-underline cursor-pointer"
          >
            View Connections →
          </button>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white border border-[#D9DCD8] rounded p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9DCD8]">
          <div>
            <h2 className="text-base font-bold text-[#1C1F1D]">
              Add Case Information
            </h2>
            <p className="text-xs text-[#666B67] mt-0.5">
              Enter reports, phone calls, money transfers, or person records directly.
            </p>
          </div>

          {/* Demonstration synthetic dataset loader (Clearly marked as demo) */}
          <button
            type="button"
            onClick={loadSyntheticBenchmarkDataset}
            className="text-xs text-[#556B5D] hover:underline cursor-pointer font-medium"
          >
            Load Sample Demonstration Data
          </button>
        </div>

        {/* Source Stream Selector (Plain Language) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 'FIR' as const, label: 'Police Report', icon: FileText },
            { id: 'CDR' as const, label: 'Phone Call Record', icon: Phone },
            { id: 'FINANCIAL' as const, label: 'Money Transfer', icon: CreditCard },
            { id: 'SURVEILLANCE' as const, label: 'Observation Report', icon: Eye },
            { id: 'ENTITY' as const, label: 'Add Person Directly', icon: UserPlus },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = sourceType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSourceType(tab.id)}
                className={`flex items-center justify-center gap-2 p-3 rounded border text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#556B5D] text-white border-[#556B5D] font-semibold'
                    : 'bg-[#F5F5F2] border-[#D9DCD8] text-[#666B67] hover:text-[#1C1F1D]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {/* Stream 1: Police / Incident Report */}
          {sourceType === 'FIR' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#666B67] block mb-1">Case Number / Reference</label>
                  <input
                    type="text"
                    value={firCaseId}
                    onChange={(e) => setFirCaseId(e.target.value)}
                    placeholder="e.g. CASE-2026-DEL-189"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#666B67] block mb-1">Date of Incident</label>
                  <input
                    type="date"
                    value={firDate}
                    onChange={(e) => setFirDate(e.target.value)}
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#666B67] block mb-1">Location of Incident</label>
                  <input
                    type="text"
                    value={firLocation}
                    onChange={(e) => setFirLocation(e.target.value)}
                    placeholder="e.g. Connaught Place, New Delhi"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#666B67] block mb-1">Report Narrative / Details</label>
                <textarea
                  rows={4}
                  value={firNarrative}
                  onChange={(e) => setFirNarrative(e.target.value)}
                  placeholder="Enter complaint narrative describing identified people, phone numbers, vehicles, or incident details..."
                  className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded p-3 text-xs text-[#1C1F1D] leading-relaxed focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Stream 2: Phone Call Record */}
          {sourceType === 'CDR' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#666B67] block mb-1">Caller Phone Number *</label>
                  <input
                    type="text"
                    value={cdrCaller}
                    onChange={(e) => setCdrCaller(e.target.value)}
                    required
                    placeholder="e.g. +91-98711-00124"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#666B67] block mb-1">Recipient Phone Number *</label>
                  <input
                    type="text"
                    value={cdrRecipient}
                    onChange={(e) => setCdrRecipient(e.target.value)}
                    required
                    placeholder="e.g. +91-98102-99831"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#666B67] block mb-1">Call Duration (Seconds)</label>
                  <input
                    type="number"
                    value={cdrDuration}
                    onChange={(e) => setCdrDuration(e.target.value)}
                    placeholder="e.g. 180"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#666B67] block mb-1">Call Date &amp; Time</label>
                  <input
                    type="text"
                    value={cdrDate}
                    onChange={(e) => setCdrDate(e.target.value)}
                    placeholder="e.g. 2026-08-30 14:22"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#666B67] block mb-1">Cell Tower Location</label>
                  <input
                    type="text"
                    value={cdrTower}
                    onChange={(e) => setCdrTower(e.target.value)}
                    placeholder="e.g. Tower North Delhi (28.6139, 77.2090)"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stream 3: Money Transfer */}
          {sourceType === 'FINANCIAL' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[#666B67] block mb-1">Sender Person / Account *</label>
                  <input
                    type="text"
                    value={finSender}
                    onChange={(e) => setFinSender(e.target.value)}
                    required
                    placeholder="e.g. Ramesh Kumar or Account-101"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#666B67] block mb-1">Receiver Person / Account *</label>
                  <input
                    type="text"
                    value={finReceiver}
                    onChange={(e) => setFinReceiver(e.target.value)}
                    required
                    placeholder="e.g. Amit Verma or Account-202"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#666B67] block mb-1">Amount (INR) *</label>
                  <input
                    type="number"
                    value={finAmount}
                    onChange={(e) => setFinAmount(e.target.value)}
                    required
                    placeholder="e.g. 50000"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#666B67] block mb-1">Transfer Mode</label>
                  <select
                    value={finType}
                    onChange={(e) => setFinType(e.target.value)}
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI Payment">UPI Instant Payment</option>
                    <option value="Cash Hawala Deposit">Cash Deposit</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Stream 4: Direct Person / Entity */}
          {sourceType === 'ENTITY' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#666B67] block mb-1">Person Name / Description *</label>
                  <input
                    type="text"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    required
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#666B67] block mb-1">Alias / Known As</label>
                  <input
                    type="text"
                    value={entityAlias}
                    onChange={(e) => setEntityAlias(e.target.value)}
                    placeholder="e.g. Raju"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#666B67] block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={entityPhone}
                    onChange={(e) => setEntityPhone(e.target.value)}
                    placeholder="e.g. +91-98765-43210"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stream 5: Observation Report */}
          {sourceType === 'SURVEILLANCE' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#666B67] block mb-1">Location Observed</label>
                  <input
                    type="text"
                    value={survLocation}
                    onChange={(e) => setSurvLocation(e.target.value)}
                    placeholder="e.g. Chandni Chowk, Delhi"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#666B67] block mb-1">Reporting Officer / Unit</label>
                  <input
                    type="text"
                    value={survUnit}
                    onChange={(e) => setSurvUnit(e.target.value)}
                    placeholder="e.g. Special Investigation Unit"
                    className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#666B67] block mb-1">Observation Notes</label>
                <textarea
                  rows={3}
                  value={survNarrative}
                  onChange={(e) => setSurvNarrative(e.target.value)}
                  placeholder="Enter observation notes describing meeting between targets, vehicle handovers, etc..."
                  className="w-full bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded p-3 text-xs text-[#1C1F1D] leading-relaxed focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="submit"
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 rounded bg-[#556B5D] hover:bg-[#435449] disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{isProcessing ? (currentStep === 1 ? 'Validating schema...' : currentStep === 2 ? 'Finding entities...' : currentStep === 3 ? 'Checking duplicate matches...' : 'Finalizing record...') : 'Process & Save Record'}</span>
            </button>

            {isProcessing && (
              <span className="text-xs text-[#556B5D] font-medium animate-pulse">
                Step {currentStep || 1} of 4 in progress...
              </span>
            )}
          </div>

        </form>

      </div>

      {/* Ingested Records Ledger */}
      <div className="bg-white border border-[#D9DCD8] rounded p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9DCD8]">
          <div>
            <h3 className="text-base font-bold text-[#1C1F1D]">
              Entered Records
            </h3>
            <p className="text-xs text-[#666B67] mt-0.5">
              History of all information items entered during this session.
            </p>
          </div>

          {manualIngestedRecords.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#F5F5F2] border border-[#D9DCD8] rounded px-2.5 py-1.5 text-xs text-[#1C1F1D] focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="FIR">Police Reports (FIR)</option>
                <option value="CDR">Phone Calls (CDR)</option>
                <option value="FINANCIAL">Money Transfers</option>
                <option value="SURVEILLANCE">Field Notes</option>
                <option value="ENTITY">Direct Items</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#666B67] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#F5F5F2] border border-[#D9DCD8] rounded pl-8 pr-3 py-1.5 text-xs text-[#1C1F1D] focus:outline-none w-44"
                />
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {manualIngestedRecords.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="text-sm font-medium text-[#1C1F1D]">No records entered yet</div>
            <p className="text-xs text-[#666B67] max-w-sm mx-auto">
              Use the form above to add a police report, phone call, or money transfer to begin analyzing data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F5F5F2] border-y border-[#D9DCD8] text-[#666B67] font-medium">
                  <th className="py-2.5 px-3">Record ID</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Summary</th>
                  <th className="py-2.5 px-3">Items Found</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DCD8]">
                {filteredIngestedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#F5F5F2]">
                    <td className="py-3 px-3 font-mono font-medium text-[#1C1F1D]">{rec.id}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-[#EBEBE6] text-[#1C1F1D] font-medium">
                        {rec.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#1C1F1D]">{rec.summary}</td>
                    <td className="py-3 px-3 text-[#556B5D] font-medium">{rec.entities_extracted} entities</td>
                    <td className="py-3 px-3 text-right text-[#666B67]">
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Human Review Modal before committing to Graph */}
      {showReviewModal && pendingGraphImpact && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D9DCD8] rounded p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D9DCD8] pb-3">
              <h3 className="font-bold text-[#1C1F1D] text-base">
                Confirm Adding Information
              </h3>
              <span className="text-xs text-[#556B5D] font-medium">
                +{pendingGraphImpact.nodes.length} people/places · +{pendingGraphImpact.edges.length} links
              </span>
            </div>

            <div className="space-y-3 text-xs text-[#1C1F1D]">
              <p className="text-[#666B67]">
                The following details were identified and will be linked into the active case:
              </p>

              <div className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-3 space-y-1.5 max-h-48 overflow-y-auto">
                {extractedEntities.map((ent, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-medium">[{ent.type}] {ent.text}</span>
                    <span className="text-[#666B67]">{(ent.confidence * 100).toFixed(0)}% confidence</span>
                  </div>
                ))}
              </div>

              {resolutionMatches.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 space-y-1">
                  <div className="font-bold">Possible matching person found:</div>
                  {resolutionMatches.map((m, idx) => (
                    <div key={idx} className="text-[11px]">
                      &quot;{m.newEntity}&quot; is similar to existing &quot;{m.existingEntity}&quot; ({(m.similarityScore * 100).toFixed(0)}% match).
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9DCD8]">
              <button
                type="button"
                onClick={() => { setShowReviewModal(false); setIsProcessing(false); }}
                className="px-4 py-2 rounded bg-[#F5F5F2] hover:bg-[#EBEBE6] text-[#1C1F1D] text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveAndCommit}
                className="px-4 py-2 rounded bg-[#556B5D] hover:bg-[#435449] text-white text-xs font-semibold cursor-pointer"
              >
                Approve &amp; Join into Case
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManualIngestionView;
