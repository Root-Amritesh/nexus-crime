import React from 'react';
import { useCaseStore } from '../../state/useCaseStore';
import { Radio, Users, MapPin, Network, Phone, CreditCard } from 'lucide-react';

export const CaseStatsCards: React.FC = () => {
  const { activeCase, suspects, crimeScenes, towers, graphData } = useCaseStore();

  const totalCalls = activeCase?.stats?.calls_analyzed ?? graphData.edges.filter(e => e.type === 'CALLED').length;
  const totalMoney = activeCase?.stats?.transactions_analyzed ?? graphData.edges.filter(e => e.type === 'TRANSACTED_WITH').length;

  const stats = [
    {
      title: 'Cell Towers',
      value: towers.length,
      unit: towers.length === 1 ? 'tower' : 'towers',
      icon: Radio,
    },
    {
      title: 'Key People',
      value: suspects.length,
      unit: suspects.length === 1 ? 'person' : 'people',
      icon: Users,
    },
    {
      title: 'Incident Places',
      value: crimeScenes.length,
      unit: crimeScenes.length === 1 ? 'location' : 'locations',
      icon: MapPin,
    },
    {
      title: 'Connections',
      value: graphData.edges.length,
      unit: graphData.edges.length === 1 ? 'link' : 'links',
      icon: Network,
    },
    {
      title: 'Call Records',
      value: totalCalls,
      unit: totalCalls === 1 ? 'call' : 'calls',
      icon: Phone,
    },
    {
      title: 'Money Transfers',
      value: totalMoney,
      unit: totalMoney === 1 ? 'transfer' : 'transfers',
      icon: CreditCard,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={i}
            className="bg-white border border-[#D9DCD8] rounded p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#666B67]">{stat.title}</span>
              <Icon className="w-3.5 h-3.5 text-[#556B5D]" />
            </div>
            <div className="text-2xl font-bold text-[#1C1F1D] my-1">
              {stat.value}
            </div>
            <div className="text-[11px] text-[#666B67]">
              {stat.value} {stat.unit}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CaseStatsCards;
