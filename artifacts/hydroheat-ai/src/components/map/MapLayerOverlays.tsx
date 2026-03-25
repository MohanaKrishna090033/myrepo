import { useEffect, useRef } from 'react';
import { useMap, Circle, Tooltip } from 'react-leaflet';
import { useSandbox } from '../../context/SandboxContext';
import type { SmartZoneType } from '../../lib/constants';

// Canvas-based heat / overlay renderer
export function CanvasLayerOverlay() {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { selectedCity, activeLayer, simulationResult, interventions } = useSandbox();

  const sewageSources = interventions.filter(i => i.type === 'sewage_untreated');

  useEffect(() => {
    if (!selectedCity || activeLayer === 'none') {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;
    ctx.clearRect(0, 0, size.x, size.y);

    const cityPoint = map.latLngToContainerPoint([selectedCity.lat, selectedCity.lng]);
    const radiusPx = map.latLngToContainerPoint([selectedCity.lat + 0.15, selectedCity.lng]).y;
    const pxRadius = Math.abs(cityPoint.y - radiusPx) * 4;

    if (activeLayer === 'heat') {
      const temp = selectedCity.temperature;
      const intensity = (temp - 25) / 25;
      const r = Math.round(255 * Math.min(1, intensity));
      const g = Math.round(120 * Math.max(0, 1 - intensity));
      const gradient = ctx.createRadialGradient(cityPoint.x, cityPoint.y, 0, cityPoint.x, cityPoint.y, pxRadius);
      gradient.addColorStop(0, `rgba(${r}, ${g}, 0, 0.55)`);
      gradient.addColorStop(0.4, `rgba(${r}, ${Math.round(g / 2)}, 0, 0.35)`);
      gradient.addColorStop(1, `rgba(${r}, 0, 0, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size.x, size.y);
    }

    if (activeLayer === 'vegetation') {
      const ndviScore = 1 - (selectedCity.riskScore / 100);
      const g = Math.round(200 * ndviScore + 55);
      const gradient = ctx.createRadialGradient(cityPoint.x, cityPoint.y, 0, cityPoint.x, cityPoint.y, pxRadius);
      gradient.addColorStop(0, `rgba(0, ${g}, 30, 0.5)`);
      gradient.addColorStop(0.5, `rgba(0, ${g}, 30, 0.25)`);
      gradient.addColorStop(1, 'rgba(0, 100, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size.x, size.y);
    }

    if (activeLayer === 'contamination') {
      const level = selectedCity.contaminationLevel / 100;
      const gradient = ctx.createRadialGradient(cityPoint.x, cityPoint.y, 0, cityPoint.x, cityPoint.y, pxRadius);
      gradient.addColorStop(0, `rgba(180, 150, 0, ${0.45 * level})`);
      gradient.addColorStop(0.5, `rgba(120, 100, 0, ${0.3 * level})`);
      gradient.addColorStop(1, 'rgba(80, 60, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size.x, size.y);

      const leakage = simulationResult?.sewageLeakageRate ?? 0;
      if (leakage > 0) {
        const numLines = Math.min(8, Math.ceil(leakage / 5000));
        for (let i = 0; i < numLines; i++) {
          const angle = (i / numLines) * Math.PI * 2;
          const endX = cityPoint.x + Math.cos(angle) * pxRadius * 0.6;
          const endY = cityPoint.y + Math.sin(angle) * pxRadius * 0.6;
          ctx.beginPath();
          ctx.moveTo(cityPoint.x, cityPoint.y);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = `rgba(200, 170, 0, ${0.3 * level})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 8]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    if (activeLayer === 'pollution') {
      const aqi = selectedCity.airQualityIndex;
      const level = Math.min(1, aqi / 400);
      const gradient = ctx.createRadialGradient(cityPoint.x, cityPoint.y, 0, cityPoint.x, cityPoint.y, pxRadius * 1.2);
      gradient.addColorStop(0, `rgba(100, 100, 100, ${0.5 * level})`);
      gradient.addColorStop(0.5, `rgba(80, 80, 80, ${0.3 * level})`);
      gradient.addColorStop(1, 'rgba(60, 60, 60, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size.x, size.y);
    }

    if (activeLayer === 'water') {
      const gw = selectedCity.groundwater / 100;
      const contamFactor = sewageSources.length > 0
        ? Math.min(1, sewageSources.length * 0.4)
        : 0;

      if (contamFactor === 0) {
        // Clean water — blue gradient
        const gradient = ctx.createRadialGradient(cityPoint.x, cityPoint.y, 0, cityPoint.x, cityPoint.y, pxRadius);
        gradient.addColorStop(0, `rgba(0, 120, 255, ${0.4 * gw})`);
        gradient.addColorStop(0.5, `rgba(0, 80, 200, ${0.25 * gw})`);
        gradient.addColorStop(1, 'rgba(0, 50, 150, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size.x, size.y);
      } else {
        // Contaminated — shift from blue toward brown/red
        const cleanAlpha = Math.max(0, 1 - contamFactor);
        const contamAlpha = contamFactor;

        const cleanGrad = ctx.createRadialGradient(cityPoint.x, cityPoint.y, 0, cityPoint.x, cityPoint.y, pxRadius);
        cleanGrad.addColorStop(0, `rgba(0, 120, 255, ${0.4 * gw * cleanAlpha})`);
        cleanGrad.addColorStop(0.5, `rgba(0, 80, 200, ${0.25 * gw * cleanAlpha})`);
        cleanGrad.addColorStop(1, 'rgba(0, 50, 150, 0)');
        ctx.fillStyle = cleanGrad;
        ctx.fillRect(0, 0, size.x, size.y);

        const contamGrad = ctx.createRadialGradient(cityPoint.x, cityPoint.y, 0, cityPoint.x, cityPoint.y, pxRadius);
        contamGrad.addColorStop(0, `rgba(160, 60, 0, ${0.55 * contamAlpha})`);
        contamGrad.addColorStop(0.35, `rgba(180, 80, 10, ${0.4 * contamAlpha})`);
        contamGrad.addColorStop(0.7, `rgba(120, 40, 0, ${0.2 * contamAlpha})`);
        contamGrad.addColorStop(1, 'rgba(80, 20, 0, 0)');
        ctx.fillStyle = contamGrad;
        ctx.fillRect(0, 0, size.x, size.y);

        // Water contamination label
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = 'rgba(255, 100, 50, 0.85)';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ WATER CONTAMINATED', cityPoint.x, cityPoint.y - 20);
        ctx.textAlign = 'left';
      }
    }

    if (activeLayer === 'flood') {
      const floodRisk = selectedCity.floodRiskScore / 100;
      const gradient = ctx.createRadialGradient(cityPoint.x, cityPoint.y, 0, cityPoint.x, cityPoint.y, pxRadius * 0.8);
      gradient.addColorStop(0, `rgba(0, 180, 220, ${0.5 * floodRisk})`);
      gradient.addColorStop(0.5, `rgba(0, 120, 180, ${0.3 * floodRisk})`);
      gradient.addColorStop(1, 'rgba(0, 80, 140, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size.x, size.y);
    }
  }, [selectedCity, activeLayer, simulationResult, interventions, map, sewageSources.length]);

  useEffect(() => {
    const handler = () => {
      if (canvasRef.current) {
        const size = map.getSize();
        canvasRef.current.width = size.x;
        canvasRef.current.height = size.y;
      }
    };
    map.on('resize', handler);
    return () => { map.off('resize', handler); };
  }, [map]);

  if (activeLayer === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 200, mixBlendMode: 'screen' }}
    />
  );
}

// Animated water/sewage particles
export function WaterParticleSystem() {
  const map = useMap();
  const { selectedCity, activeLayer, simulationResult } = useSandbox();
  const animRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!selectedCity || (activeLayer !== 'water' && activeLayer !== 'contamination')) {
      cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;

    const cityPoint = map.latLngToContainerPoint([selectedCity.lat, selectedCity.lng]);
    const isContam = activeLayer === 'contamination';

    const spawnParticle = () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.8;
      const maxLife = 80 + Math.random() * 120;
      particlesRef.current.push({
        x: cityPoint.x + (Math.random() - 0.5) * 20,
        y: cityPoint.y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + (isContam ? 0.2 : 0),
        life: maxLife,
        maxLife,
        color: isContam ? `rgba(200, 170, 30,` : `rgba(0, 160, 255,`,
      });
    };

    let frameCount = 0;
    const animate = () => {
      ctx.clearRect(0, 0, size.x, size.y);
      frameCount++;

      if (frameCount % 3 === 0) spawnParticle();
      if (particlesRef.current.length > 80) particlesRef.current.splice(0, 5);

      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        const alpha = (p.life / p.maxLife) * 0.7;
        const radius = isContam ? 2.5 : 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${alpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animRef.current);
      particlesRef.current = [];
    };
  }, [selectedCity, activeLayer, simulationResult, map]);

  if (activeLayer !== 'water' && activeLayer !== 'contamination') return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 210 }}
    />
  );
}

// Animated sewage contamination spread overlay — always active when sewage sources exist
export function SewageContaminationOverlay() {
  const map = useMap();
  const { interventions, waterWastagePercent, geoAnalysis } = useSandbox();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);

  const sewageSources = interventions.filter(i => i.type === 'sewage_untreated');
  const waterBodyDistKm = geoAnalysis?.nearestWaterBody?.distanceKm ?? 999;
  const waterBodyName = geoAnalysis?.nearestWaterBody?.name ?? 'nearby water body';
  const waterBodyIsClose = waterBodyDistKm < 6;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (sewageSources.length === 0) {
      cancelAnimationFrame(animRef.current);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;

    const RING_DURATION = 3200;
    const NUM_RINGS = 5;
    const BASE_MAX_RADIUS = 160 + waterWastagePercent * 0.8;

    const animate = () => {
      ctx.clearRect(0, 0, size.x, size.y);
      const now = Date.now();

      for (const source of sewageSources) {
        const point = map.latLngToContainerPoint([source.lat, source.lng]);
        const maxRadius = BASE_MAX_RADIUS;

        // Static sewage gradient pool
        const poolGrad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, maxRadius * 0.7);
        poolGrad.addColorStop(0, 'rgba(100, 50, 5, 0.65)');
        poolGrad.addColorStop(0.25, 'rgba(120, 60, 5, 0.50)');
        poolGrad.addColorStop(0.55, 'rgba(90, 45, 0, 0.28)');
        poolGrad.addColorStop(0.8, 'rgba(60, 30, 0, 0.10)');
        poolGrad.addColorStop(1, 'rgba(40, 20, 0, 0)');
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.arc(point.x, point.y, maxRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Animated expanding contamination rings
        for (let r = 0; r < NUM_RINGS; r++) {
          const offset = (r / NUM_RINGS) * RING_DURATION;
          const phase = ((now - offset) % RING_DURATION) / RING_DURATION;
          const ringRadius = maxRadius * phase;
          const alpha = 0.75 * (1 - phase);

          ctx.beginPath();
          ctx.arc(point.x, point.y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(160, 80, 8, ${alpha})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          if (phase < 0.3) {
            const innerFill = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, ringRadius);
            innerFill.addColorStop(0, `rgba(140, 60, 0, ${0.15 * (1 - phase / 0.3)})`);
            innerFill.addColorStop(1, 'rgba(100, 40, 0, 0)');
            ctx.fillStyle = innerFill;
            ctx.beginPath();
            ctx.arc(point.x, point.y, ringRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Animated flow lines radiating outward
        const NUM_FLOW_LINES = 8;
        for (let i = 0; i < NUM_FLOW_LINES; i++) {
          const angle = (i / NUM_FLOW_LINES) * Math.PI * 2;
          const flowPhase = ((now + i * (RING_DURATION / NUM_FLOW_LINES)) % RING_DURATION) / RING_DURATION;
          const flowDist = maxRadius * 0.85 * flowPhase;
          const flowAlpha = 0.5 * (1 - flowPhase);

          const endX = point.x + Math.cos(angle) * flowDist;
          const endY = point.y + Math.sin(angle) * flowDist;

          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = `rgba(140, 65, 5, ${flowAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 7]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Water body contamination warning — directional pulse if close
        if (waterBodyIsClose) {
          const threatPhase = ((now * 0.5) % RING_DURATION) / RING_DURATION;
          const threatRadius = maxRadius * 1.4 * threatPhase;
          const threatAlpha = 0.6 * (1 - threatPhase);

          ctx.beginPath();
          ctx.arc(point.x, point.y, threatRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(220, 40, 10, ${threatAlpha})`;
          ctx.lineWidth = 3.5;
          ctx.stroke();

          // Water body alert label
          const labelY = point.y - maxRadius - 22;
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = 'rgba(255, 80, 30, 0.95)';
          ctx.textAlign = 'center';
          ctx.fillText(`⚠ ${waterBodyName} AT RISK (${waterBodyDistKm.toFixed(1)}km)`, point.x, labelY);
          ctx.textAlign = 'left';
        }

        // Sewage source marker
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180, 80, 0, 0.9)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 140, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = 'rgba(255, 160, 50, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('☣ SEWAGE', point.x, point.y - 14);
        ctx.textAlign = 'left';
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [sewageSources.length, map, waterWastagePercent, waterBodyIsClose, waterBodyDistKm, waterBodyName]);

  useEffect(() => {
    const handler = () => {
      if (canvasRef.current) {
        const size = map.getSize();
        canvasRef.current.width = size.x;
        canvasRef.current.height = size.y;
      }
    };
    map.on('resize zoomend moveend', handler);
    return () => { map.off('resize zoomend moveend', handler); };
  }, [map]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 215, mixBlendMode: 'multiply' }}
    />
  );
}

// Factory contamination spread overlay — active when factories are placed
export function FactoryContaminationOverlay() {
  const map = useMap();
  const { interventions, geoAnalysis } = useSandbox();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);

  const factories = interventions.filter(i => i.type === 'factory');
  const waterBodyDistKm = geoAnalysis?.nearestWaterBody?.distanceKm ?? 999;
  const waterBodyName = geoAnalysis?.nearestWaterBody?.name ?? 'nearby water body';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (factories.length === 0) {
      cancelAnimationFrame(animRef.current);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;

    const SMOKE_DURATION = 4000;
    const NUM_RINGS = 4;

    const animate = () => {
      ctx.clearRect(0, 0, size.x, size.y);
      const now = Date.now();

      for (const factory of factories) {
        const point = map.latLngToContainerPoint([factory.lat, factory.lng]);

        // Smoke/smog pool
        const poolGrad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 140);
        poolGrad.addColorStop(0, 'rgba(60, 60, 60, 0.55)');
        poolGrad.addColorStop(0.3, 'rgba(80, 50, 20, 0.40)');
        poolGrad.addColorStop(0.65, 'rgba(50, 30, 10, 0.20)');
        poolGrad.addColorStop(1, 'rgba(30, 15, 5, 0)');
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 140, 0, Math.PI * 2);
        ctx.fill();

        // Expanding smoke rings
        for (let r = 0; r < NUM_RINGS; r++) {
          const offset = (r / NUM_RINGS) * SMOKE_DURATION;
          const phase = ((now - offset) % SMOKE_DURATION) / SMOKE_DURATION;
          const ringRadius = 180 * phase;
          const alpha = 0.45 * (1 - phase);
          ctx.beginPath();
          ctx.arc(point.x, point.y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(100, 70, 30, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Factory marker
        ctx.beginPath();
        ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 100, 20, 0.9)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 150, 50, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = 'rgba(255, 180, 80, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('🏭 FACTORY', point.x, point.y - 13);
        ctx.textAlign = 'left';

        // Water body risk warning if close
        if (waterBodyDistKm < 8) {
          const threatPhase = ((now * 0.4) % SMOKE_DURATION) / SMOKE_DURATION;
          const threatRadius = 200 * threatPhase;
          const threatAlpha = 0.5 * (1 - threatPhase);
          ctx.beginPath();
          ctx.arc(point.x, point.y, threatRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 120, 20, ${threatAlpha})`;
          ctx.lineWidth = 3;
          ctx.stroke();

          const labelY = point.y - 155;
          ctx.font = 'bold 10px monospace';
          ctx.fillStyle = 'rgba(255, 140, 30, 0.9)';
          ctx.textAlign = 'center';
          ctx.fillText(`⚠ ${waterBodyName} POLLUTION RISK (${waterBodyDistKm.toFixed(1)}km)`, point.x, labelY);
          ctx.textAlign = 'left';
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [factories.length, map, waterBodyDistKm, waterBodyName]);

  useEffect(() => {
    const handler = () => {
      if (canvasRef.current) {
        const size = map.getSize();
        canvasRef.current.width = size.x;
        canvasRef.current.height = size.y;
      }
    };
    map.on('resize zoomend moveend', handler);
    return () => { map.off('resize zoomend moveend', handler); };
  }, [map]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 214, mixBlendMode: 'multiply' }}
    />
  );
}

// Smart zone severity → color
const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  moderate: '#eab308',
  low: '#22c55e',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  moderate: '🟡',
  low: '🟢',
};

const ZONE_SHORT_LABEL: Record<string, string> = {
  high_skyscraper_density: 'High density + canyon effect → cool roofs + street trees',
  heat_island: 'High heat + low vegetation → green roofs + trees + reflective surfaces',
  low_vegetation: 'Low NDVI → mass plantation + urban forest corridors',
  sewage_risk: 'Poor sewage health → install treatment plants + permeable pavement',
  flood_zone: 'High runoff + flood risk → rainwater harvesting + permeable pavements',
  industrial_zone: 'Industrial pollution + high AQI → green buffer belt + solar panels',
};

// Smart zone visualization using react-leaflet circles with hover tooltips
export function SmartZoneOverlay() {
  const { showSmartZones, smartZones } = useSandbox();

  if (!showSmartZones || smartZones.length === 0) return null;

  return (
    <>
      {smartZones.map(zone => {
        const color = SEVERITY_COLOR[zone.severity] ?? '#ffffff';
        const badge = SEVERITY_BADGE[zone.severity] ?? '⚪';
        const shortLabel = ZONE_SHORT_LABEL[zone.type as SmartZoneType] ?? zone.insight.slice(0, 80);
        const fillOpacity = zone.severity === 'critical' ? 0.22 : zone.severity === 'high' ? 0.16 : 0.11;

        return (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lng]}
            radius={zone.radiusKm * 1000}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity,
              weight: zone.severity === 'critical' ? 2.5 : 1.5,
              opacity: 0.8,
              dashArray: '6 4',
            }}
          >
            <Tooltip
              sticky
              className="smart-zone-tooltip"
              offset={[10, 0]}
            >
              <div style={{ fontFamily: 'monospace', minWidth: 220, maxWidth: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{badge}</span>
                  <span style={{ fontWeight: 'bold', fontSize: 12, color }}>{zone.name.split(' — ')[1] ?? zone.name}</span>
                </div>
                <div style={{ fontSize: 11, color: '#d1d5db', marginBottom: 6, lineHeight: 1.5 }}>
                  {shortLabel}
                </div>
                {zone.recommendations.slice(0, 2).map((r, i) => (
                  <div key={i} style={{ fontSize: 10, color: '#9ca3af', display: 'flex', gap: 4, marginTop: 3 }}>
                    <span style={{ color }}>→</span>
                    <span>{r}</span>
                  </div>
                ))}
                <div style={{ marginTop: 6, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 10, color: '#6b7280', fontStyle: 'italic' }}>
                  Severity: <span style={{ color, fontWeight: 'bold', textTransform: 'uppercase' }}>{zone.severity}</span> · {zone.radiusKm}km radius
                </div>
              </div>
            </Tooltip>
          </Circle>
        );
      })}
    </>
  );
}
