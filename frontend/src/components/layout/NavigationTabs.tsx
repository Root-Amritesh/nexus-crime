import React from 'react';
import { 
  LayoutDashboard, Map, Network, FileSearch, PlusCircle 
} from 'lucide-react';
import { useCaseStore } from '../../state/useCaseStore';

export const NavigationTabs: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    graphData,
    firEntities,
    manualIngestedRecords
  } = useCaseStore();

  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
      description: 'Case summary and metrics',
    },
    {
      id: 'map' as const,
      label: 'Map View',
      icon: Map,
      badge: null,
      description: 'Incident and tower locations',
    },
    {
      id: 'graph' as const,
      label: 'View Connections',
      icon: Network,
      badge: graphData.nodes.length > 0 ? `${graphData.nodes.length}` : null,
      description: 'Relationships between people and phones',
    },
    {
      id: 'fir' as const,
      label: 'Find Names & Phones',
      icon: FileSearch,
      badge: firEntities.length > 0 ? `${firEntities.length}` : null,
      description: 'Extracted details from reports',
    },
    {
      id: 'upload' as const,
      label: 'Add Information',
      icon: PlusCircle,
      badge: manualIngestedRecords.length > 0 ? `${manualIngestedRecords.length}` : null,
      description: 'Enter reports, call logs, and documents',
    },
  ];

  return (
    <nav className="bg-white border-b border-[#D9DCD8] px-6">
      <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#556B5D] text-white font-semibold'
                  : 'bg-transparent text-[#666B67] hover:text-[#1C1F1D] hover:bg-[#F5F5F2]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#666B67]'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[#EBEBE6] text-[#1C1F1D]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavigationTabs;
