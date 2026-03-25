import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useSandbox } from '../../context/SandboxContext';
import { ZONE_COLORS, type SmartZoneType } from '../../lib/constants';

// Canvas-based heat / overlay renderer
export function CanvasLayerOverlay() {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { selectedCity, activeLayer, simulationResult } = useSandbox();

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
      const gradient = ctx.createRadialGradient(cityPoint.x, cityPoint.y, 0, cityPoint.x, cityPoint.y, pxRadius);
      gradient.addColorStop(0, `rgba(0, 120, 255, ${0.4 * gw})`);
      gradient.addColorStop(0.5, `rgba(0, 80, 200, ${0.25 * gw})`);
      gradient.addColorStop(1, 'rgba(0, 50, 150, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size.x, size.y);
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
  }, [selectedCity, activeLayer, simulationResult, map]);

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
  const { interventions, waterWastagePercent } = useSandbox();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);

  const sewageSources = interventions.filter(i => i.type === 'sewage_untreated');

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

          // Outer contamination ring
          ctx.beginPath();
          ctx.arc(point.x, point.y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(160, 80, 8, ${alpha})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Inner brown fill that shrinks as rings expand
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

        // Animated flow lines radiating outward (contamination spreading)
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

        // Sewage source marker (center dot)
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180, 80, 0, 0.9)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 140, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Biohazard label
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
  }, [sewageSources.length, map, waterWastagePercent]);

  // Resize handler
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

// Smart zone visualization circles
export function SmartZoneOverlay() {
  const map = useMap();
  const { showSmartZones, smartZones } = useSandbox();
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!showSmartZones || !svgRef.current) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    const size = map.getSize();
    svg.setAttribute('width', String(size.x));
    svg.setAttribute('height', String(size.y));

    for (const zone of smartZones) {
      const center = map.latLngToContainerPoint([zone.lat, zone.lng]);
      const edgePoint = map.latLngToContainerPoint([zone.lat + zone.radiusKm / 111, zone.lng]);
      const radiusPx = Math.abs(center.y - edgePoint.y);

      const color = ZONE_COLORS[zone.type as SmartZoneType] ?? '#ffffff';
      const opacity = zone.severity === 'critical' ? 0.35 : zone.severity === 'high' ? 0.25 : 0.18;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(center.x));
      circle.setAttribute('cy', String(center.y));
      circle.setAttribute('r', String(radiusPx));
      circle.setAttribute('fill', color);
      circle.setAttribute('fill-opacity', String(opacity));
      circle.setAttribute('stroke', color);
      circle.setAttribute('stroke-width', '1.5');
      circle.setAttribute('stroke-opacity', '0.7');
      circle.setAttribute('stroke-dasharray', '4 3');
      svg.appendChild(circle);

      if (zone.severity === 'critical') {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', String(center.x));
        ring.setAttribute('cy', String(center.y));
        ring.setAttribute('r', String(radiusPx * 1.1));
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', color);
        ring.setAttribute('stroke-width', '2');
        ring.setAttribute('stroke-opacity', '0.4');
        svg.appendChild(ring);
      }

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(center.x));
      text.setAttribute('y', String(center.y - radiusPx - 6));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', color);
      text.setAttribute('font-size', '10');
      text.setAttribute('font-family', 'monospace');
      text.setAttribute('font-weight', 'bold');
      text.textContent = zone.name.split(' — ')[1] ?? zone.name;
      svg.appendChild(text);
    }
  }, [showSmartZones, smartZones, map]);

  useEffect(() => {
    const handler = () => {
      if (svgRef.current) {
        const size = map.getSize();
        svgRef.current.setAttribute('width', String(size.x));
        svgRef.current.setAttribute('height', String(size.y));
      }
    };
    map.on('moveend zoomend resize', handler);
    return () => { map.off('moveend zoomend resize', handler); };
  }, [map]);

  if (!showSmartZones) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 220 }}
    />
  );
}
