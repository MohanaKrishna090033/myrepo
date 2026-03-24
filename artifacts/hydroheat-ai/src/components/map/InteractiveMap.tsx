import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSandbox } from '../../context/SandboxContext';
import { MAP_CENTER, INITIAL_ZOOM, TOOLS } from '../../lib/constants';

// Fix Leaflet default icon issue in React
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
        addIntervention({
          type: activeTool,
          lat: e.latlng.lat,
          lng: e.latlng.lng
        });
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

export function InteractiveMap() {
  const { cities, selectCity, interventions, updateIntervention } = useSandbox();

  const getMarkerIcon = (risk: number) => {
    let size = 20;
    let className = 'city-marker ';
    if (risk > 70) className += 'city-marker-high';
    else if (risk > 40) className += 'city-marker-medium';
    else className += 'city-marker-low';

    return L.divIcon({
      className: 'bg-transparent',
      html: `<div class="${className}" style="width:${size}px; height:${size}px;"></div>`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
    });
  };

  const getInterventionIcon = (type: string) => {
    const tool = TOOLS.find(t => t.type === type);
    return L.divIcon({
      className: 'bg-transparent',
      html: `<div class="intervention-marker ${tool?.colorClass}">${tool?.icon || '📍'}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
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

        {cities.map((city) => (
          <Marker 
            key={city.id} 
            position={[city.lat, city.lng]} 
            icon={getMarkerIcon(city.riskScore)}
            eventHandlers={{
              click: () => selectCity(city.id)
            }}
          >
            <Popup className="cyber-popup">
              <div className="font-mono text-sm">
                <strong className="text-primary text-base">{city.name}</strong><br/>
                Risk Score: {city.riskScore}/100<br/>
                Temp: {city.temperature}°C
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
                const marker = e.target;
                const pos = marker.getLatLng();
                updateIntervention(inv.id, pos.lat, pos.lng);
              }
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
