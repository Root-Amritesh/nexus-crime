import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Play, Pause, RotateCcw, MapPin, Radio, Navigation, PlusCircle 
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCaseStore } from '../../state/useCaseStore';
import { MOCK_DEVICE_TIMELINE } from '../../data/mockData';

// Fix Leaflet default icon path issue in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createIcon = (fill: string, stroke: string, size: number = 10) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${fill};border:2px solid ${stroke};box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const towerIcon = createIcon('#556B5D', '#FFFFFF', 12);
const sceneIcon = createIcon('#914B4B', '#FFFFFF', 14);
const trackIcon = createIcon('#A67C3D', '#FFFFFF', 10);

export const MapView: React.FC = () => {
  const { 
    towers, 
    crimeScenes, 
    suspects, 
    mapFilters, 
    setMapFilter, 
    setActiveTab
  } = useCaseStore();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<{
    towers: L.LayerGroup;
    scenes: L.LayerGroup;
    suspects: L.LayerGroup;
    tracks: L.LayerGroup;
    coverageCircles: L.LayerGroup;
  } | null>(null);

  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'tower' | 'scene' | 'suspect' | 'track';
    id: string;
    data: any;
  } | null>(null);

  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [timelineIndex, setTimelineIndex] = useState(0);

  const activeDevice = mapFilters.selectedTimelineDevice || (suspects[0]?.device_hash ?? '');
  const timelineEvents = MOCK_DEVICE_TIMELINE[activeDevice] || [];

  // Initialize Leaflet map with CartoDB Positron (Light) Tiles
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.6139, 77.2090], // Delhi-NCR center
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // CartoDB Positron clean light tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    layerGroupsRef.current = {
      towers: L.layerGroup().addTo(map),
      scenes: L.layerGroup().addTo(map),
      suspects: L.layerGroup().addTo(map),
      tracks: L.layerGroup().addTo(map),
      coverageCircles: L.layerGroup().addTo(map),
    };

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Layers
  useEffect(() => {
    if (!mapRef.current || !layerGroupsRef.current) return;
    const { towers: towerLayer, scenes: sceneLayer, tracks: trackLayer, coverageCircles } = layerGroupsRef.current;

    // Clear all
    towerLayer.clearLayers();
    sceneLayer.clearLayers();
    trackLayer.clearLayers();
    coverageCircles.clearLayers();

    // 1. Render Towers
    if (mapFilters.showTowers) {
      towers.forEach((t) => {
        const marker = L.marker([t.latitude, t.longitude], { icon: towerIcon })
          .on('click', () => {
            setSelectedEntity({ type: 'tower', id: t.tower_id, data: t });
          });
        towerLayer.addLayer(marker);

        // Tower Coverage Circle
        const circle = L.circle([t.latitude, t.longitude], {
          radius: t.coverage_radius_km * 1000,
          color: '#556B5D',
          weight: 1.2,
          dashArray: '3, 4',
          fillColor: '#556B5D',
          fillOpacity: 0.06,
        });
        coverageCircles.addLayer(circle);
      });
    }

    // 2. Render Crime Scenes
    if (mapFilters.showScenes) {
      crimeScenes.forEach((s) => {
        const marker = L.marker([s.latitude, s.longitude], { icon: sceneIcon })
          .on('click', () => {
            setSelectedEntity({ type: 'scene', id: s.scene_id, data: s });
          });
        sceneLayer.addLayer(marker);

        // Crime Scene 500m radius ring
        const sceneRadius = L.circle([s.latitude, s.longitude], {
          radius: 500,
          color: '#914B4B',
          weight: 1.5,
          fillColor: '#914B4B',
          fillOpacity: 0.12,
        });
        coverageCircles.addLayer(sceneRadius);
      });
    }

    // 3. Render Selected Device Tracks
    if (mapFilters.showTracks && timelineEvents.length > 0) {
      const latlngs = timelineEvents.slice(0, timelineIndex + 1).map(ev => [ev.lat, ev.lng] as [number, number]);

      if (latlngs.length > 1) {
        const polyline = L.polyline(latlngs, {
          color: '#A67C3D',
          weight: 2.5,
          opacity: 0.9,
          dashArray: '4, 4',
        });
        trackLayer.addLayer(polyline);
      }

      timelineEvents.slice(0, timelineIndex + 1).forEach((ev) => {
        const marker = L.marker([ev.lat, ev.lng], { icon: trackIcon })
          .on('click', () => {
            setSelectedEntity({ type: 'track', id: `${ev.time}`, data: ev });
          });
        trackLayer.addLayer(marker);
      });
    }

  }, [towers, crimeScenes, mapFilters, timelineEvents, timelineIndex]);

  // Playback timer
  useEffect(() => {
    let interval: any;
    if (isPlayingTimeline) {
      interval = setInterval(() => {
        setTimelineIndex(prev => {
          if (prev >= timelineEvents.length - 1) {
            setIsPlayingTimeline(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isPlayingTimeline, timelineEvents.length]);

  return (
    <div className="bg-white border border-[#D9DCD8] rounded p-6 space-y-4 font-sans">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#D9DCD8]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#1C1F1D]">
              Map View
            </h2>
            <span className="text-xs bg-[#F5F5F2] border border-[#D9DCD8] text-[#666B67] px-2.5 py-0.5 rounded font-medium">
              {crimeScenes.length} incident locations · {towers.length} cell towers
            </span>
          </div>
          <p className="text-xs text-[#666B67] mt-0.5">
            Geographic view of incident spots, cell tower signals, and phone movement tracks.
          </p>
        </div>

        {/* Toggle Controls */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <button
            onClick={() => setMapFilter('showTowers', !mapFilters.showTowers)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors cursor-pointer ${
              mapFilters.showTowers 
                ? 'bg-[#556B5D] text-white border-[#556B5D] font-medium' 
                : 'bg-[#F5F5F2] border-[#D9DCD8] text-[#666B67]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Cell Towers ({towers.length})</span>
          </button>

          <button
            onClick={() => setMapFilter('showScenes', !mapFilters.showScenes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors cursor-pointer ${
              mapFilters.showScenes 
                ? 'bg-[#914B4B] text-white border-[#914B4B] font-medium' 
                : 'bg-[#F5F5F2] border-[#D9DCD8] text-[#666B67]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Incident Places ({crimeScenes.length})</span>
          </button>

          <button
            onClick={() => setMapFilter('showTracks', !mapFilters.showTracks)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors cursor-pointer ${
              mapFilters.showTracks 
                ? 'bg-[#A67C3D] text-white border-[#A67C3D] font-medium' 
                : 'bg-[#F5F5F2] border-[#D9DCD8] text-[#666B67]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Movement Paths</span>
          </button>
        </div>
      </div>

      {crimeScenes.length === 0 && towers.length === 0 ? (
        <div className="py-16 px-6 text-center space-y-3">
          <div className="text-base font-semibold text-[#1C1F1D]">No map locations yet</div>
          <p className="text-xs text-[#666B67] max-w-md mx-auto leading-relaxed">
            Add tower logs, incident locations, or phone movements in the Add Information tab to see them plotted on this map.
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
        /* Main Layout: Map (8 cols) + Timeline / Inspector (4 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Leaflet Map Canvas (8 cols) */}
          <div className="lg:col-span-8 bg-[#F5F5F2] border border-[#D9DCD8] rounded relative h-[480px] overflow-hidden">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Map Legend */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white border border-[#D9DCD8] p-3 rounded text-xs space-y-1.5 text-[#1C1F1D] shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#914B4B]" />
                <span>Incident Spot</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#556B5D]" />
                <span>Cell Tower</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A67C3D]" />
                <span>Phone Movement Point</span>
              </div>
            </div>
          </div>

          {/* Timeline & Inspector Panel (4 cols) */}
          <div className="lg:col-span-4 space-y-4 text-xs">
            
            {/* Timeline Trajectory Player */}
            <div className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#D9DCD8] pb-2">
                <div className="flex items-center gap-1.5 font-bold text-[#1C1F1D]">
                  <Clock className="w-3.5 h-3.5 text-[#556B5D]" />
                  <span>Playback Movement</span>
                </div>
                <span className="text-[11px] text-[#666B67]">
                  {timelineIndex + 1} of {timelineEvents.length || 1} points
                </span>
              </div>
              {/* Simulated data badge — per PRD US-08, device timeline is a stretch goal */}
              <div className="flex items-center gap-1.5 p-1.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700">
                <span>⚠</span>
                <span>Simulated timeline — not yet wired to live evidence</span>
              </div>

              {/* Target Selector */}
              <div>
                <label className="text-[11px] text-[#666B67] block mb-1">Select Tracked Person</label>
                <select
                  value={activeDevice}
                  onChange={(e) => {
                    setMapFilter('selectedTimelineDevice', e.target.value);
                    setTimelineIndex(0);
                  }}
                  className="w-full bg-white border border-[#D9DCD8] rounded px-2.5 py-1.5 text-xs text-[#1C1F1D] focus:outline-none"
                >
                  {suspects.map((s) => (
                    <option key={s.device_hash} value={s.device_hash}>
                      {s.alias || s.device_hash}
                    </option>
                  ))}
                </select>
              </div>

              {/* Player Controls */}
              {timelineEvents.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[#556B5D] hover:bg-[#435449] text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      {isPlayingTimeline ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlayingTimeline ? 'Pause' : 'Play Movement'}</span>
                    </button>
                    <button
                      onClick={() => { setIsPlayingTimeline(false); setTimelineIndex(0); }}
                      className="p-2 rounded bg-white border border-[#D9DCD8] text-[#666B67] hover:text-[#1C1F1D] transition-colors"
                      title="Reset timeline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, timelineEvents.length - 1)}
                    value={timelineIndex}
                    onChange={(e) => setTimelineIndex(parseInt(e.target.value))}
                    className="w-full accent-[#556B5D] cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Selected Map Node Inspector */}
            <div className="bg-[#F5F5F2] border border-[#D9DCD8] rounded p-4 space-y-2">
              <div className="font-bold text-[#1C1F1D] border-b border-[#D9DCD8] pb-2">
                Selected Location Info
              </div>

              {selectedEntity ? (
                <div className="space-y-2">
                  <div>
                    <div className="text-[11px] text-[#666B67]">Type</div>
                    <div className="font-bold text-[#556B5D] uppercase">{selectedEntity.type}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#666B67]">Name / Identifier</div>
                    <div className="font-bold text-[#1C1F1D] truncate">{selectedEntity.data.name || selectedEntity.id}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-[#D9DCD8] text-xs space-y-1">
                    <div>
                      <span className="text-[#666B67]">Coordinates: </span>
                      <strong className="text-[#1C1F1D]">
                        {selectedEntity.data.latitude?.toFixed(4)}°N, {selectedEntity.data.longitude?.toFixed(4)}°E
                      </strong>
                    </div>
                    {selectedEntity.data.coverage_radius_km && (
                      <div>
                        <span className="text-[#666B67]">Coverage Radius: </span>
                        <strong className="text-[#556B5D]">{selectedEntity.data.coverage_radius_km} km</strong>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-[#666B67] text-xs py-2">
                  Click on any pin, cell tower, or incident location on the map to see details.
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default MapView;
