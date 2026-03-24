import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSandbox } from '../../context/SandboxContext';
import { MAP_CENTER, INITIAL_ZOOM, TOOLS } from '../../lib/constants';
import { CanvasLayerOverlay, WaterParticleSystem, SmartZoneOverlay } from './MapLayerOverlays';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapEvents() {
  const { activeTool, addIntervention, selectCity, selectedCity } = useSandbox();
  useMapEvents({
    click(e) {
      if (activeTool && selectedCity) {
        addIntervention({ type: activeTool, lat: e.latlng.lat, lng: e.latlng.lng });
      } else if (!activeTool) {
        selectCity(null);
      }
    }
  });
  return null;
}

function CityViewUpdater() {
  const map = useMap();
  const { selectedCity } = useSandbox();
  useEffect(() => {
    if (selectedCity) {
      map.flyTo([selectedCity.lat, selectedCity.lng], 12, { duration: 1.5 });
    } else {
      map.flyTo(MAP_CENTER, INITIAL_ZOOM, { duration: 1.5 });
    }
  }, [selectedCity, map]);
  return null;
}

function MapOverlay() {
  const map = useMap();
  const { placementEffects } = useSandbox();
  const [activeAnimations, setActiveAnimations] = useState<Array<{ id: string; type: string; x: number; y: number; timestamp: number }>>([]);

  useEffect(() => {
    if (placementEffects.length === 0) return;
    const latest = placementEffects[placementEffects.length - 1];
    if (Date.now() - latest.timestamp < 500) {
      const point = map.latLngToContainerPoint([latest.lat, latest.lng]);
      const anim = { id: latest.id, type: latest.type, x: point.x, y: point.y, timestamp: Date.now() };
      setActiveAnimations(prev => [...prev, anim]);
      setTimeout(() => setActiveAnimations(prev => prev.filter(a => a.id !== anim.id)), 2500);
    }
  }, [placementEffects, map]);

  if (activeAnimations.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[500] overflow-hidden">
      {activeAnimations.map((anim) => (
        <div key={anim.id} className="absolute" style={{ left: anim.x, top: anim.y, transform: 'translate(-50%, -50%)' }}>
          {anim.type === 'tree' && (
            <>
              <div className="absolute inset-0 rounded-full bg-green-500/30 border-2 border-green-500 animate-ripple w-8 h-8 -ml-4 -mt-4" />
              {[...Array(6)].map((_, i) => (
                <div key={i} className="absolute w-2 h-2 bg-green-400 rounded-full"
                  style={{ animation: `particle-fly 1s ease-out forwards`, '--tx': `${Math.cos(i * Math.PI / 3) * 60}px`, '--ty': `${Math.sin(i * Math.PI / 3) * 60}px` } as React.CSSProperties} />
              ))}
              <div className="absolute text-xl animate-float -ml-2 -mt-2">🌿</div>
            </>
          )}
          {anim.type === 'sewage_treatment' && (
            <>
              <div className="absolute inset-0 rounded-full bg-blue-500/20 border-2 border-blue-400 animate-ripple w-10 h-10 -ml-5 -mt-5" />
              <div className="absolute text-2xl animate-float -ml-3 -mt-3">🚰</div>
              {[0, 1].map(i => (
                <div key={i} className="absolute inset-0 rounded-full border-blue-400/40 animate-water w-10 h-10 -ml-5 -mt-5" style={{ animationDelay: `${i * 0.25}s` }} />
              ))}
            </>
          )}
          {anim.type === 'water_tank' && (
            <>
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 border-2 border-indigo-400 animate-ripple w-10 h-10 -ml-5 -mt-5" />
              <div className="absolute text-2xl animate-float -ml-3 -mt-3">🪣</div>
            </>
          )}
          {anim.type === 'rainfall_harvesting' && (
            <>
              <div className="absolute inset-0 rounded-full bg-sky-500/20 border-2 border-sky-400 animate-ripple w-12 h-12 -ml-6 -mt-6" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="absolute w-1.5 h-4 rounded-full bg-sky-400/70"
                  style={{ left: `${(i - 2) * 8}px`, animation: `${0.3 + i * 0.1}s ease-out rain-drop forwards` }} />
              ))}
            </>
          )}
          {anim.type === 'cool_road' && (
            <>
              <div className="absolute inset-0 rounded-lg bg-slate-500/20 border-2 border-slate-400 animate-ripple w-16 h-6 -ml-8 -mt-3" />
              <div className="absolute text-xl animate-float -ml-3 -mt-3">❄️</div>
            </>
          )}
          {anim.type === 'fountain' && (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className="absolute inset-0 rounded-full border-blue-400 animate-water w-8 h-8 -ml-4 -mt-4" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </>
          )}
          {anim.type === 'solar' && (
            <>
              <div className="absolute w-12 h-12 bg-yellow-400/50 rounded-full animate-star -ml-6 -mt-6" />
              <div className="absolute text-yellow-300 font-bold font-mono animate-float -ml-4 -mt-2">☀️</div>
            </>
          )}
          {anim.type === 'factory' && (
            <>
              {[0, 1, 2].map(i => (
                <div key={i} className="absolute w-10 h-10 bg-gray-600/80 rounded-full blur-md animate-smoke -ml-5" style={{ animationDelay: `${i * 0.3}s`, left: `${(i - 1) * 10}px` }} />
              ))}
            </>
          )}
          {anim.type === 'stubble_burning' && (
            <>
              <div className="absolute w-16 h-16 bg-orange-500/40 rounded-full blur-xl animate-ripple -ml-8 -mt-8" />
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute w-2 h-2 bg-red-500 rounded-full blur-[1px] animate-fire" style={{ animationDelay: `${Math.random() * 0.3}s`, left: `${(Math.random() - 0.5) * 40}px` }} />
              ))}
            </>
          )}
          {anim.type === 'fireworks' && (
            <>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute w-1 h-1 bg-pink-400 rounded-full shadow-[0_0_5px_#fff]"
                  style={{ animation: `particle-fly 0.8s ease-out forwards`, '--tx': `${Math.cos(i * Math.PI / 4) * 80}px`, '--ty': `${Math.sin(i * Math.PI / 4) * 80}px` } as React.CSSProperties} />
              ))}
              <div className="absolute w-2 h-2 bg-yellow-300 animate-ripple rounded-full -ml-1 -mt-1 shadow-[0_0_10px_#fff]" />
            </>
          )}
          {anim.type === 'green_roof' && (
            <div className="absolute w-16 h-16 border-4 border-emerald-400/50 rounded-lg animate-ripple -ml-8 -mt-8" />
          )}
          {anim.type === 'permeable_pavement' && (
            <div className="absolute w-16 h-16 border-2 border-stone-400/50 bg-blue-500/20 rounded-full animate-ripple -ml-8 -mt-8" style={{ animationDirection: 'reverse' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// Render canvas-based overlays inside MapContainer
function OverlayRenderer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    containerRef.current = container as HTMLDivElement;
  }, [map]);

  return (
    <>
      <CanvasLayerOverlay />
      <WaterParticleSystem />
      <SmartZoneOverlay />
    </>
  );
}

export function InteractiveMap() {
  const { cities, selectCity, selectedCity, interventions, updateIntervention } = useSandbox();

  const getMarkerIcon = (city: typeof cities[0]) => {
    const size = 28;
    let className = 'city-marker ';
    if (city.riskScore > 70) className += 'city-marker-high';
    else if (city.riskScore > 40) className += 'city-marker-medium';
    else className += 'city-marker-low';
    if (selectedCity?.id === city.id) className += ' city-marker-selected';
    return L.divIcon({
      className: 'bg-transparent overflow-visible',
      html: `<div class="relative w-full h-full"><div class="${className}" style="width:${size}px; height:${size}px;"></div><div class="city-label-pill">${city.name}</div></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const getInterventionIcon = (type: string) => {
    const tool = TOOLS.find(t => t.type === type);
    return L.divIcon({
      className: 'bg-transparent',
      html: `<div class="intervention-marker ${tool?.colorClass}">${tool?.icon || '📍'}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={MAP_CENTER}
        zoom={INITIAL_ZOOM}
        zoomControl={false}
        className="w-full h-full"
        style={{ background: '#0a0a0a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapEvents />
        <CityViewUpdater />
        <MapOverlay />
        <OverlayRenderer />

        {cities.map((city) => (
          <Marker
            key={city.id}
            position={[city.lat, city.lng]}
            icon={getMarkerIcon(city)}
            eventHandlers={{ click: () => selectCity(city.id) }}
          >
            <Popup className="cyber-popup">
              <div className="font-mono text-sm">
                <strong className="text-primary text-base">{city.name}</strong><br />
                Risk: {city.riskScore}/100 | Temp: {city.temperature}°C<br />
                Contamination: {city.contaminationLevel}/100
              </div>
            </Popup>
          </Marker>
        ))}

        {interventions.map((inv) => (
          <Marker
            key={inv.id}
            position={[inv.lat, inv.lng]}
            icon={getInterventionIcon(inv.type)}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng();
                updateIntervention(inv.id, pos.lat, pos.lng);
              }
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
