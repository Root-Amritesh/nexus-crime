import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, FileSearch, Route, PlusCircle 
} from 'lucide-react';
import { useCaseStore } from '../../state/useCaseStore';
import type { GraphNode, GraphEdge, RelationshipType } from '../../types';

export const GraphView: React.FC = () => {
  const { 
    graphData, 
    graphFilters, 
    setGraphFilter, 
    openExplainability,
    findShortestPath,
    setActiveTab
  } = useCaseStore();

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(graphData.nodes[0] || null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [sourceNodeId, setSourceNodeId] = useState<string>(graphData.nodes[0]?.id || '');
  const [targetNodeId, setTargetNodeId] = useState<string>(graphData.nodes[1]?.id || '');

  // Filter nodes & edges
  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter(n => {
      const matchesRisk = n.type === 'location' || n.risk_score >= graphFilters.minRisk;
      const matchesCommunity = graphFilters.selectedCommunity === null || n.community === graphFilters.selectedCommunity;
      const matchesSearch = 
        !graphFilters.searchQuery || 
        n.id.toLowerCase().includes(graphFilters.searchQuery.toLowerCase()) || 
        (n.label && n.label.toLowerCase().includes(graphFilters.searchQuery.toLowerCase()));
      return matchesRisk && matchesCommunity && matchesSearch;
    });
  }, [graphData.nodes, graphFilters]);

  const activeNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return graphData.edges.filter(e => {
      const nodesActive = activeNodeIds.has(e.source) && activeNodeIds.has(e.target);
      const matchesType = !graphFilters.selectedRelationshipType || e.type === graphFilters.selectedRelationshipType;
      return nodesActive && matchesType;
    });
  }, [graphData.edges, activeNodeIds, graphFilters.selectedRelationshipType]);

  // Layout node positions
  const nodePositions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    const count = graphData.nodes.length;
    graphData.nodes.forEach((n, idx) => {
      if (idx === 0) {
        pos[n.id] = { x: 50, y: 50 };
      } else {
        const angle = (2 * Math.PI * (idx - 1)) / (count - 1 || 1);
        const radius = n.type === 'location' ? 38 : 28;
        pos[n.id] = {
          x: 50 + radius * Math.cos(angle),
          y: 50 + radius * Math.sin(angle),
        };
      }
    });
    return pos;
  }, [graphData.nodes]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handleEdgeClick = (edge: GraphEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  const handleShortestPathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceNodeId && targetNodeId) {
      findShortestPath(sourceNodeId, targetNodeId);
    }
  };

  return (
    <div className="bg-white border border-[#D9DCD8] rounded p-6 space-y-4 font-sans">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#D9DCD8]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#1C1F1D]">
              View Connections
            </h2>
            <span className="text-xs bg-[#F5F5F2] border border-[#D9DCD8] text-[#666B67] px-2.5 py-0.5 rounded font-medium">
              {filteredNodes.length} people &amp; places · {filteredEdges.length} connections
            </span>
          </div>
          <p className="text-xs text-[#666B67] mt-0.5">
            Shows who called whom, who traveled together, and who shared transaction links.
          </p>
        </div>

        {/* Filter Bar */}
        {graphData.nodes.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#666B67] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search person or phone..."
                value={graphFilters.searchQuery}
                onChange={(e) => setGraphFilter('searchQuery', e.target.value)}
                className="bg-[#F5F5F2] border border-[#D9DCD8] focus:border-[#556B5D] rounded pl-8 pr-3 py-1.5 text-xs text-[#1C1F1D] focus:outline-none w-44"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#F5F5F2] border border-[#D9DCD8] rounded px-2.5 py-1.5 text-[#666B67]">
              <Filter className="w-3.5 h-3.5 text-[#666B67]" />
              <span>Link Type:</span>
              <select
                value={graphFilters.selectedRelationshipType || ''}
                onChange={(e) => setGraphFilter('selectedRelationshipType', (e.target.value as RelationshipType) || null)}
                className="bg-transparent text-xs text-[#1C1F1D] focus:outline-none cursor-pointer"
              >
                <option value="">All Connections</option>
                <option value="CALLED">Phone Calls</option>
                <option value="CO_LOCATED_AT">Visited Same Location</option>
                <option value="CO_MOVED_WITH">Traveled Together</option>
                <option value="TRANSACTED_WITH">Money Transfers</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {graphData.nodes.length === 0 ? (
        <div className="py-16 px-6 text-center space-y-3">
          <div className="text-base font-semibold text-[#1C1F1D]">No connections yet</div>
          <p className="text-xs text-[#666B67] max-w-md mx-auto leading-relaxed">
            Add case information such as call records, transactions, or police reports to see relationships between people, phones, and locations here.
          </p>
          <button
            onClick={() => setActiveTab('upload')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#556B5D] hover:bg-[#435449] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Add Information</span>
          </button>
        </div>
      ) : (
        /* Main Layout: SVG Graph Canvas (8 cols) + Inspector Panel (4 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Canvas (8 cols) */}
          <div className="lg:col-span-8 bg-[#F5F5F2] border border-[#D9DCD8] rounded p-3 relative h-[480px] overflow-hidden">
            
            {/* SVG Interactive Graph */}
            <svg className="w-full h-full" viewBox="0 0 100 100">
              
              {/* Edges */}
              {filteredEdges.map((edge) => {
                const s = nodePositions[edge.source];
                const t = nodePositions[edge.target];
                if (!s || !t) return null;

                const isSelected = selectedEdge && selectedEdge.source === edge.source && selectedEdge.target === edge.target;

                return (
                  <g key={`${edge.source}-${edge.target}-${edge.type}`} onClick={() => handleEdgeClick(edge)} className="cursor-pointer">
                    <line
                      x1={s.x}
                      y1={s.y}
                      x2={t.x}
                      y2={t.y}
                      stroke={isSelected ? '#556B5D' : '#B8BCB6'}
                      strokeWidth={isSelected ? 1.8 : 0.9}
                      strokeDasharray={edge.type === 'CO_MOVED_WITH' ? '2,2' : undefined}
                    />
                  </g>
                );
              })}

              {/* Nodes */}
              {filteredNodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;

                const isSelected = selectedNode && selectedNode.id === node.id;
                const isLocation = node.type === 'location';
                const isCritical = node.risk_score >= 0.80;

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => handleNodeClick(node)}
                    className="cursor-pointer"
                  >
                    {/* Outer selection ring */}
                    {isSelected && (
                      <circle
                        r={isLocation ? 5 : 6}
                        fill="none"
                        stroke="#556B5D"
                        strokeWidth="0.9"
                        strokeDasharray="1.5,1.5"
                      />
                    )}

                    {/* Node Circle */}
                    <circle
                      r={isLocation ? 3.2 : isCritical ? 4.5 : 3.8}
                      fill={isLocation ? '#A67C3D' : isCritical ? '#914B4B' : '#556B5D'}
                      stroke="#FFFFFF"
                      strokeWidth="0.8"
                    />

                    {/* Label */}
                    <text
                      y={isLocation ? 6 : 7}
                      textAnchor="middle"
                      fill="#1C1F1D"
                      fontSize="2.4"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {node.label || node.id.slice(0, 8)}
                    </text>
                  </g>
                );
              })}

            </svg>

            {/* Canvas Legend */}
            <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-white border border-[#D9DCD8] px-3 py-1.5 rounded text-[11px] font-medium text-[#666B67] shadow-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#914B4B]" />
                <span>High Involvement</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#556B5D]" />
                <span>Person / Phone</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A67C3D]" />
                <span>Location</span>
              </span>
            </div>

          </div>

          {/* Inspector Panel & Shortest Path (4 cols) */}
          <div className="lg:col-span-4 space-y-4 text-xs">
            
            {/* Inspector */}
            <div className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-4 space-y-3">
              <div className="font-bold text-[#1C1F1D] border-b border-[#D9DCD8] pb-2">
                Selected Item Details
              </div>

              {selectedNode ? (
                <div className="space-y-2.5">
                  <div>
                    <div className="text-[11px] text-[#666B67]">Name / Label</div>
                    <div className="font-bold text-[#1C1F1D] text-sm">{selectedNode.label || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#666B67]">Identifier</div>
                    <div className="font-mono text-[11px] text-[#1C1F1D]">{selectedNode.id}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded border border-[#D9DCD8]">
                    <div>
                      <div className="text-[10px] text-[#666B67]">Risk Level</div>
                      <div className="font-bold text-[#914B4B]">{(selectedNode.risk_score * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#666B67]">Connections</div>
                      <div className="font-bold text-[#556B5D]">{selectedNode.centrality.toFixed(2)}</div>
                    </div>
                  </div>

                  {selectedNode.type !== 'location' && (
                    <button
                      onClick={() => openExplainability(selectedNode.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[#556B5D] hover:bg-[#435449] text-white font-medium text-xs transition-colors cursor-pointer"
                    >
                      <FileSearch className="w-3.5 h-3.5" />
                      <span>Inspect Evidence Records</span>
                    </button>
                  )}
                </div>
              ) : selectedEdge ? (
                <div className="space-y-2.5">
                  <div>
                    <div className="text-[11px] text-[#666B67]">Connection Type</div>
                    <div className="font-bold text-[#1C1F1D]">{selectedEdge.type}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-[#D9DCD8] space-y-1 text-[11px]">
                    <div><span className="text-[#666B67]">From:</span> <strong className="text-[#1C1F1D]">{selectedEdge.source}</strong></div>
                    <div><span className="text-[#666B67]">To:</span> <strong className="text-[#1C1F1D]">{selectedEdge.target}</strong></div>
                    <div><span className="text-[#666B67]">Frequency / Weight:</span> <strong className="text-[#556B5D]">{selectedEdge.weight}</strong></div>
                  </div>
                </div>
              ) : (
                <div className="text-[#666B67] text-xs py-2">
                  Click on any person, phone, or connection line on the left to see details.
                </div>
              )}
            </div>

            {/* Shortest Path Engine */}
            <form onSubmit={handleShortestPathSubmit} className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-4 space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-[#1C1F1D] border-b border-[#D9DCD8] pb-2">
                <Route className="w-3.5 h-3.5 text-[#556B5D]" />
                <span>Find Path Between 2 People</span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-[#666B67] block mb-1">First Person / Phone</label>
                  <select
                    value={sourceNodeId}
                    onChange={(e) => setSourceNodeId(e.target.value)}
                    className="w-full bg-white border border-[#D9DCD8] rounded px-2.5 py-1.5 text-xs text-[#1C1F1D] focus:outline-none"
                  >
                    {graphData.nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.label || n.id}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#666B67] block mb-1">Second Person / Phone</label>
                  <select
                    value={targetNodeId}
                    onChange={(e) => setTargetNodeId(e.target.value)}
                    className="w-full bg-white border border-[#D9DCD8] rounded px-2.5 py-1.5 text-xs text-[#1C1F1D] focus:outline-none"
                  >
                    {graphData.nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.label || n.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 rounded bg-[#556B5D] hover:bg-[#435449] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Find Connection Path
              </button>
            </form>

          </div>

        </div>
      )}

    </div>
  );
};

export default GraphView;
