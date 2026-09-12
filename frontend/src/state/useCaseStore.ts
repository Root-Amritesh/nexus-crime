import { create } from 'zustand';
import type { 
  Case, CrimeScene, Tower, Suspect, GraphData, FIREntity, 
  EntityResolutionCandidate, AuditLogEntry, EvidenceItem, RiskWeightsConfig,
  IngestedRecord, GraphNode, GraphEdge, BackendStatus 
} from '../types';
import { 
  MOCK_CASES, MOCK_CRIME_SCENES, MOCK_TOWERS, MOCK_SUSPECTS, 
  MOCK_GRAPH_DATA, MOCK_FIR_TEXT, MOCK_FIR_ENTITIES, 
  MOCK_ENTITY_RESOLUTION_QUEUE, MOCK_AUDIT_LOGS, DEFAULT_RISK_WEIGHTS
} from '../data/mockData';

interface CaseStoreState {
  backendStatus: BackendStatus;
  backendEndpoint: string;
  activeCase: Case | null;
  cases: Case[];
  crimeScenes: CrimeScene[];
  towers: Tower[];
  suspects: Suspect[];
  graphData: GraphData;
  firText: string;
  firEntities: FIREntity[];
  entityResolutionQueue: EntityResolutionCandidate[];
  auditLogs: AuditLogEntry[];
  riskWeights: RiskWeightsConfig;
  manualIngestedRecords: IngestedRecord[];
  
  // Navigation & UI state
  activeTab: 'dashboard' | 'map' | 'graph' | 'fir' | 'upload';
  selectedSuspect: Suspect | null;
  selectedEvidenceSuspectId: string | null;
  selectedEvidenceList: EvidenceItem[] | null;
  isExplainabilityOpen: boolean;
  isAuditModalOpen: boolean;
  isWeightsModalOpen: boolean;
  isShortestPathModalOpen: boolean;
  shortestPathNodes: { source: string; target: string; path: string[] | null };
  
  // Map and Graph visual filters
  mapFilters: {
    showTowers: boolean;
    showScenes: boolean;
    showSuspects: boolean;
    showTracks: boolean;
    selectedTimelineDevice: string | null;
    timelineStep: number;
  };
  graphFilters: {
    minRisk: number;
    selectedCommunity: number | null;
    selectedRelationshipType: string | null;
    searchQuery: string;
  };
  
  // Upload simulation & ingestion
  isProcessingUpload: boolean;
  uploadStage: string;
  uploadProgress: number;
  
  // Actions
  checkBackendConnection: () => Promise<void>;
  setActiveTab: (tab: 'dashboard' | 'map' | 'graph' | 'fir' | 'upload') => void;
  setActiveCase: (caseRef: string) => void;
  openExplainability: (suspectId: string) => void;
  closeExplainability: () => void;
  openAuditModal: () => void;
  closeAuditModal: () => void;
  openWeightsModal: () => void;
  closeWeightsModal: () => void;
  setRiskWeights: (weights: RiskWeightsConfig) => void;
  recomputeRiskScores: () => void;
  
  setMapFilter: <K extends keyof CaseStoreState['mapFilters']>(key: K, value: CaseStoreState['mapFilters'][K]) => void;
  setGraphFilter: <K extends keyof CaseStoreState['graphFilters']>(key: K, value: CaseStoreState['graphFilters'][K]) => void;
  
  resolveEntityCandidate: (id: string, action: 'merge' | 'reject') => void;
  addAuditLog: (action: string, details: string) => void;
  
  findShortestPath: (sourceId: string, targetId: string) => void;
  clearShortestPath: () => void;
  
  simulateUploadPipeline: (caseRef: string, warrantRef: string, files: { [key: string]: boolean }, onComplete?: () => void) => void;
  addManualIngestedRecord: (record: IngestedRecord) => void;
  commitManualDataToGraph: (nodes: GraphNode[], edges: GraphEdge[], newEntities?: FIREntity[]) => void;
  loadSyntheticBenchmarkDataset: () => void;
  clearAllData: () => void;
}

export const useCaseStore = create<CaseStoreState>((set, get) => ({
  // ZERO FAKE DATA BY DEFAULT
  backendStatus: 'DISCONNECTED',
  backendEndpoint: 'http://localhost:8000',
  activeCase: null,
  cases: [],
  crimeScenes: [],
  towers: [],
  suspects: [],
  graphData: { nodes: [], edges: [] },
  firText: '',
  firEntities: [],
  entityResolutionQueue: [],
  auditLogs: [],
  riskWeights: DEFAULT_RISK_WEIGHTS,
  manualIngestedRecords: [],
  
  // Navigation & UI state
  activeTab: 'dashboard',
  selectedSuspect: null,
  selectedEvidenceSuspectId: null,
  selectedEvidenceList: null,
  isExplainabilityOpen: false,
  isAuditModalOpen: false,
  isWeightsModalOpen: false,
  isShortestPathModalOpen: false,
  shortestPathNodes: { source: '', target: '', path: null },
  
  mapFilters: {
    showTowers: true,
    showScenes: true,
    showSuspects: true,
    showTracks: true,
    selectedTimelineDevice: null,
    timelineStep: 0,
  },
  
  graphFilters: {
    minRisk: 0.0,
    selectedCommunity: null,
    selectedRelationshipType: null,
    searchQuery: '',
  },
  
  isProcessingUpload: false,
  uploadStage: '',
  uploadProgress: 0,
  
  // Check live backend connection status
  checkBackendConnection: async () => {
    set({ backendStatus: 'LOADING' });
    try {
      const endpoint = get().backendEndpoint;
      const res = await fetch(`${endpoint}/api/health`, { method: 'GET', signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (res && res.ok) {
        set({ backendStatus: 'CONNECTED' });
      } else {
        set({ backendStatus: 'DISCONNECTED' });
      }
    } catch {
      set({ backendStatus: 'DISCONNECTED' });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setActiveCase: (caseRef) => {
    const targetCase = get().cases.find(c => c.case_reference === caseRef);
    if (targetCase) {
      set({ activeCase: targetCase });
    }
  },

  openExplainability: (suspectId) => {
    const suspect = get().suspects.find(s => s.device_hash === suspectId);
    set({ 
      selectedEvidenceSuspectId: suspectId, 
      selectedSuspect: suspect || null,
      selectedEvidenceList: [],
      isExplainabilityOpen: true 
    });
  },

  closeExplainability: () => set({ isExplainabilityOpen: false, selectedEvidenceSuspectId: null, selectedSuspect: null }),

  openAuditModal: () => set({ isAuditModalOpen: true }),
  closeAuditModal: () => set({ isAuditModalOpen: false }),

  openWeightsModal: () => set({ isWeightsModalOpen: true }),
  closeWeightsModal: () => set({ isWeightsModalOpen: false }),

  setRiskWeights: (weights) => {
    set({ riskWeights: weights });
    get().recomputeRiskScores();
  },

  recomputeRiskScores: () => {
    const { suspects, riskWeights } = get();
    const updatedSuspects = suspects.map(s => {
      const centralityContrib = s.centrality_score * riskWeights.centrality;
      const colocationContrib = (Math.min(s.co_location_count, riskWeights.colocation_cap) / riskWeights.colocation_cap) * riskWeights.colocation;
      const comovementContrib = (Math.min(s.co_movement_count, riskWeights.comovement_cap) / riskWeights.comovement_cap) * riskWeights.comovement;
      const callContrib = Math.min(s.call_frequency / 20, 1.0) * riskWeights.call_frequency;
      
      const newScore = Math.min(1.0, centralityContrib + colocationContrib + comovementContrib + callContrib);
      
      return {
        ...s,
        risk_score: Number(newScore.toFixed(4)),
        score_breakdown: {
          ...s.score_breakdown,
          centrality_contribution: centralityContrib,
          colocation_contribution: colocationContrib,
          comovement_contribution: comovementContrib,
          call_contribution: callContrib,
        }
      };
    });

    updatedSuspects.sort((a, b) => b.risk_score - a.risk_score);
    set({ suspects: updatedSuspects });
  },

  setMapFilter: (key, value) => {
    set(state => ({
      mapFilters: { ...state.mapFilters, [key]: value }
    }));
  },

  setGraphFilter: (key, value) => {
    set(state => ({
      graphFilters: { ...state.graphFilters, [key]: value }
    }));
  },

  resolveEntityCandidate: (id, action) => {
    const queue = get().entityResolutionQueue.map(item => {
      if (item.id === id) {
        return { ...item, status: action === 'merge' ? 'merged' : 'rejected' } as EntityResolutionCandidate;
      }
      return item;
    });

    set({ entityResolutionQueue: queue });
    get().addAuditLog(
      `ENTITY_RESOLUTION_${action.toUpperCase()}`,
      `Candidate pair ${id} was marked as ${action === 'merge' ? 'MERGED IDENTITY' : 'REJECTED / SEPARATE'}.`
    );
  },

  addAuditLog: (action, details) => {
    const activeCaseRef = get().activeCase?.case_reference || 'GENERAL-SESSION';
    const warrant = get().activeCase?.warrant_reference || 'BNSS §92';
    const newEntry: AuditLogEntry = {
      id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      case_reference: activeCaseRef,
      investigator_id: get().activeCase?.investigator_id || 'OPERATOR',
      action,
      timestamp: new Date().toISOString(),
      details,
      warrant_reference: warrant,
      status: 'VERIFIED'
    };

    set(state => ({
      auditLogs: [newEntry, ...state.auditLogs]
    }));
  },

  findShortestPath: (sourceId, targetId) => {
    const { graphData } = get();
    if (!graphData.nodes.length) {
      set({ shortestPathNodes: { source: sourceId, target: targetId, path: null }, isShortestPathModalOpen: true });
      return;
    }

    const adj: Record<string, string[]> = {};
    graphData.nodes.forEach(n => { adj[n.id] = []; });
    graphData.edges.forEach(e => {
      if (adj[e.source] && !adj[e.source].includes(e.target)) adj[e.source].push(e.target);
      if (adj[e.target] && !adj[e.target].includes(e.source)) adj[e.target].push(e.source);
    });

    const queue: string[][] = [[sourceId]];
    const visited = new Set<string>([sourceId]);
    let foundPath: string[] | null = null;

    while (queue.length > 0) {
      const currentPath = queue.shift()!;
      const lastNode = currentPath[currentPath.length - 1];

      if (lastNode === targetId) {
        foundPath = currentPath;
        break;
      }

      for (const neighbor of (adj[lastNode] || [])) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...currentPath, neighbor]);
        }
      }
    }

    set({
      shortestPathNodes: {
        source: sourceId,
        target: targetId,
        path: foundPath
      },
      isShortestPathModalOpen: true
    });
  },

  clearShortestPath: () => {
    set({
      shortestPathNodes: { source: '', target: '', path: null },
      isShortestPathModalOpen: false
    });
  },

  addManualIngestedRecord: (record: IngestedRecord) => {
    set(state => ({
      manualIngestedRecords: [record, ...state.manualIngestedRecords]
    }));
    get().addAuditLog(
      `MANUAL_INGESTION_${record.type}`,
      `Ingested synthetic record ${record.id} with source ref ${record.source_reference}. Summary: ${record.summary}`
    );
  },

  commitManualDataToGraph: (newNodes: GraphNode[], newEdges: GraphEdge[], newEntities: FIREntity[] = []) => {
    set(state => {
      const existingNodeIds = new Set(state.graphData.nodes.map(n => n.id));
      const mergedNodes = [...state.graphData.nodes];

      newNodes.forEach(node => {
        if (!existingNodeIds.has(node.id)) {
          mergedNodes.push(node);
          existingNodeIds.add(node.id);
        }
      });

      const existingEdgeKeys = new Set(state.graphData.edges.map(e => `${e.source}-${e.target}-${e.type}`));
      const mergedEdges = [...state.graphData.edges];

      newEdges.forEach(edge => {
        const key = `${edge.source}-${edge.target}-${edge.type}`;
        if (!existingEdgeKeys.has(key)) {
          mergedEdges.push(edge);
          existingEdgeKeys.add(key);
        }
      });

      const mergedEntities = [...state.firEntities, ...newEntities];

      // Update or create active case counts dynamically
      const activeCase = state.activeCase ? {
        ...state.activeCase,
        stats: {
          ...state.activeCase.stats,
          total_devices: mergedNodes.filter(n => n.type === 'device').length,
          flagged_suspects: mergedNodes.filter(n => n.type === 'person').length,
        }
      } : {
        case_reference: 'CASE-001',
        warrant_reference: 'BNSS §92',
        investigator_id: 'IO-ASSIGNED',
        title: 'Active Investigation',
        incident_date: new Date().toLocaleDateString(),
        created_at: new Date().toISOString(),
        status: 'ACTIVE_ANALYSIS' as const,
        description: 'Case created via manual data ingestion.',
        stats: {
          total_pings: 0,
          total_devices: mergedNodes.filter(n => n.type === 'device').length,
          flagged_suspects: mergedNodes.filter(n => n.type === 'person').length,
          crime_scenes_count: 0,
          communities_count: 1,
          calls_analyzed: mergedEdges.filter(e => e.type === 'CALLED').length,
          transactions_analyzed: mergedEdges.filter(e => e.type === 'TRANSACTED_WITH').length,
        }
      };

      const updatedCases = state.cases.length === 0 ? [activeCase] : state.cases.map(c => c.case_reference === activeCase.case_reference ? activeCase : c);

      return {
        graphData: {
          nodes: mergedNodes,
          edges: mergedEdges
        },
        firEntities: mergedEntities,
        activeCase,
        cases: updatedCases
      };
    });

    get().addAuditLog(
      'GRAPH_COMMIT',
      `Committed +${newNodes.length} nodes and +${newEdges.length} edges to the active in-memory knowledge graph.`
    );
  },

  // EXPLICIT ACTION ONLY: User clicks "Load Synthetic Demo Data" button
  loadSyntheticBenchmarkDataset: () => {
    set({
      activeCase: MOCK_CASES[0],
      cases: MOCK_CASES,
      crimeScenes: MOCK_CRIME_SCENES,
      towers: MOCK_TOWERS,
      suspects: MOCK_SUSPECTS,
      graphData: MOCK_GRAPH_DATA,
      firText: MOCK_FIR_TEXT,
      firEntities: MOCK_FIR_ENTITIES,
      entityResolutionQueue: MOCK_ENTITY_RESOLUTION_QUEUE,
      auditLogs: MOCK_AUDIT_LOGS,
    });
    get().addAuditLog(
      'BENCHMARK_LOADED',
      'User explicitly loaded synthetic benchmark demonstration dataset for SIH evaluation.'
    );
  },

  // Reset to clean 0/empty state
  clearAllData: () => {
    set({
      activeCase: null,
      cases: [],
      crimeScenes: [],
      towers: [],
      suspects: [],
      graphData: { nodes: [], edges: [] },
      firText: '',
      firEntities: [],
      entityResolutionQueue: [],
      auditLogs: [],
      manualIngestedRecords: [],
      selectedSuspect: null,
      selectedEvidenceSuspectId: null,
      selectedEvidenceList: null,
    });
  },

  simulateUploadPipeline: (caseRef, warrantRef, _files, onComplete) => {
    set({ isProcessingUpload: true, uploadStage: 'Initiating schema validation...', uploadProgress: 10 });

    setTimeout(() => {
      set({ uploadStage: 'Checking BNSS §92 Court Warrant authorization...', uploadProgress: 30 });
      get().addAuditLog('WARRANT_VERIFICATION', `Verified warrant ${warrantRef} for ${caseRef}`);

      setTimeout(() => {
        set({ uploadStage: 'Parsing data files and extracting entity records...', uploadProgress: 60 });

        setTimeout(() => {
          set({ uploadStage: 'Connecting relationships in memory...', uploadProgress: 85 });

          setTimeout(() => {
            set({ uploadStage: 'Data ingestion complete.', uploadProgress: 100, isProcessingUpload: false });
            get().addAuditLog('PIPELINE_COMPLETE', `Completed file ingestion for case ${caseRef}`);
            if (onComplete) onComplete();
          }, 400);
        }, 500);
      }, 500);
    }, 400);
  }
}));
