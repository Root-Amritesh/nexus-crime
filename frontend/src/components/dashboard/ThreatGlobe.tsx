import React, { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';

export interface ThreatGlobeProps {
  /** Canvas size in pixels */
  size?: number;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Idle auto-rotation speed in deg/s (default: 0.35) */
  idleRotationSpeed?: number;
  /** Highlight color when hovered over a country landmass (default: #8C3F3F archive red) */
  highlightColor?: string;
  /** Default landmass base color (default: #222222 archive dark) */
  baseColor?: string;
  /** Landmass border line color (default: #383838) */
  borderColor?: string;
  /** Globe sphere/ocean background (default: #151515) */
  backgroundColor?: string;
  /** Optional callback fired when cursor hovers over or leaves a country */
  onCountryHover?: (countryName: string | null, feature?: any) => void;
  /** Optional custom CSS classes for the wrapper */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}

export const ThreatGlobe: React.FC<ThreatGlobeProps> = ({
  size,
  width,
  height,
  idleRotationSpeed = 0.35,
  highlightColor = '#8C3F3F',
  baseColor = '#222222',
  borderColor = '#383838',
  backgroundColor = 'rgba(0,0,0,0)',
  onCountryHover,
  className = '',
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);
  const hoveredFeatureRef = useRef<any>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Calculate dimensions
    const containerWidth = width || size || containerRef.current.clientWidth || 480;
    const containerHeight = height || size || containerRef.current.clientHeight || 480;

    // 1. Initialize Globe.gl instance with Classified Digital Archive theme
    const globe = (Globe as any)()(containerRef.current)
      .width(containerWidth)
      .height(containerHeight)
      .backgroundColor(backgroundColor)
      .showGlobe(true)
      .showAtmosphere(true)
      .atmosphereColor('#65745D')
      .atmosphereAltitude(0.08)
      .polygonCapColor((feat: any) => {
        return feat === hoveredFeatureRef.current ? highlightColor : baseColor;
      })
      .polygonSideColor(() => 'rgba(40, 40, 40, 0.6)')
      .polygonStrokeColor((feat: any) => {
        return feat === hoveredFeatureRef.current ? '#8C3F3F' : borderColor;
      })
      .polygonAltitude((feat: any) => {
        return feat === hoveredFeatureRef.current ? 0.05 : 0.01;
      })
      .polygonsTransitionDuration(140);

    globeInstanceRef.current = globe;

    // Configure camera & controls
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = idleRotationSpeed;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.7;
    controls.minDistance = 180;
    controls.maxDistance = 600;

    // Center on India / South Asia region (20.5937 N, 78.9629 E)
    globe.pointOfView({ lat: 22.0, lng: 79.0, altitude: 2.2 }, 1000);

    // 2. Fetch GeoJSON world countries
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(countriesData => {
        globe.polygonsData(countriesData.features);
      })
      .catch(err => {
        console.warn('Failed to load GeoJSON', err);
      });

    // 3. Country hover interaction
    globe.onPolygonHover((polygon: any) => {
      hoveredFeatureRef.current = polygon;
      const countryName = polygon ? (polygon.properties?.NAME || polygon.properties?.ADMIN || 'Selected Territory') : null;
      setHoveredCountry(countryName);

      if (polygon) {
        controls.autoRotate = false;
      } else {
        controls.autoRotate = true;
      }

      globe.polygonCapColor(globe.polygonCapColor());
      globe.polygonStrokeColor(globe.polygonStrokeColor());
      globe.polygonAltitude(globe.polygonAltitude());

      if (onCountryHover) {
        onCountryHover(countryName, polygon);
      }
    });

    // 4. Resize observer
    const handleResize = () => {
      if (!containerRef.current || !globeInstanceRef.current) return;
      const newW = width || size || containerRef.current.clientWidth;
      const newH = height || size || containerRef.current.clientHeight;
      if (newW && newH) {
        globeInstanceRef.current.width(newW).height(newH);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (globeInstanceRef.current) {
        try {
          const renderer = globeInstanceRef.current.renderer();
          if (renderer && renderer.dispose) {
            renderer.dispose();
          }
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
        } catch (e) {
          // cleanup
        }
      }
    };
  }, [width, height, size, idleRotationSpeed, highlightColor, baseColor, borderColor, backgroundColor]);

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden ${className}`}
      style={style}
    >
      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Hovered Territory Tag (Classified Archive Stamp) */}
      {hoveredCountry && (
        <div className="absolute top-3 left-3 z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-[#1C1C1C] border border-[#8C3F3F] rounded-xs px-2.5 py-1 shadow-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-xs bg-[#8C3F3F]" />
            <span className="text-[11px] font-mono font-bold text-[#E8E4D8] uppercase tracking-wider">
              {hoveredCountry}
            </span>
          </div>
        </div>
      )}

      {/* Ambient Coordinate Grid Indicator */}
      <div className="absolute bottom-2 right-2 z-10 pointer-events-none text-[9px] font-mono text-[#9A9A91] bg-[#1C1C1C]/90 px-2 py-0.5 rounded-xs border border-[#2B2B2B]">
        GEOSPATIAL ARCHIVE · WGS84
      </div>
    </div>
  );
};
