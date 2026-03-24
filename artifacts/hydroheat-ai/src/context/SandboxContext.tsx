import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { City, InterventionType, SimulationResult, GeoAnalysis, GeoSimulationContext } from '@workspace/api-client-react';
import { useGetCities, getGeoAnalysis, calculateSimulation } from '@workspace/api-client-react';
import { HARDCODED_CITIES, TOOLS, type MapLayer } from '../lib/constants';

export interface LocalIntervention {
  id: string;
  type: typeof InterventionType[keyof typeof InterventionType];
  lat: number;
  lng: number;
}

export interface PlacementEffect {
  id: string;
  type: string;
  lat: number;
  lng: number;
  timestamp: number;
}

export interface SmartZone {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  radiusKm: number;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  insight: string;
  recommendations: string[];
}

export interface AutoOptimizeResult {
  recommendedInterventions: { type: string; count: number; reason: string; priority: number }[];
  rationale: string;
  projectedImpact: { temperatureDelta: number; groundwaterDelta: number; riskScoreDelta: number; contaminationDelta: number };
}

interface SandboxContextType {
  cities: City[];
  selectedCity: City | null;
  activeTool: typeof InterventionType[keyof typeof InterventionType] | null;
  interventions: LocalIntervention[];
  simulationResult: SimulationResult | null;
  isSimulating: boolean;
  lastPlacedIntervention: { type: string; lat: number; lng: number } | null;
  placementEffects: PlacementEffect[];
  geoAnalysis: GeoAnalysis | null;
  geoLoading: boolean;
  activeLayer: MapLayer;
  showSmartZones: boolean;
  smartZones: SmartZone[];
  smartZonesLoading: boolean;
  autoOptimizing: boolean;
  autoOptimizeResult: AutoOptimizeResult | null;
  toolTab: 'green' | 'water' | 'harmful';

  selectCity: (cityId: string | null) => void;
  setActiveTool: (tool: typeof InterventionType[keyof typeof InterventionType] | null) => void;
  addIntervention: (intervention: Omit<LocalIntervention, 'id'>) => void;
  removeIntervention: (id: string) => void;
  updateIntervention: (id: string, lat: number, lng: number) => void;
  clearInterventions: () => void;
  setActiveLayer: (layer: MapLayer) => void;
  toggleSmartZones: () => void;
  runAutoOptimize: (priority?: string) => Promise<void>;
  applyAutoOptimize: () => void;
  setToolTab: (tab: 'green' | 'water' | 'harmful') => void;
}

const SandboxContext = createContext<SandboxContextType | undefined>(undefined);

const BASE_API = '/api';

export function SandboxProvider({ children }: { children: React.ReactNode }) {
  const { data: apiCities } = useGetCities({
    query: { retry: 1, staleTime: Infinity }
  });

  const cities = apiCities && apiCities.length > 0 ? apiCities : HARDCODED_CITIES;

  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<typeof InterventionType[keyof typeof InterventionType] | null>(null);
  const [interventions, setInterventions] = useState<LocalIntervention[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastPlacedIntervention, setLastPlacedIntervention] = useState<{ type: string; lat: number; lng: number } | null>(null);
  const [placementEffects, setPlacementEffects] = useState<PlacementEffect[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [geoAnalysis, setGeoAnalysis] = useState<GeoAnalysis | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('none');
  const [showSmartZones, setShowSmartZones] = useState(false);
  const [smartZones, setSmartZones] = useState<SmartZone[]>([]);
  const [smartZonesLoading, setSmartZonesLoading] = useState(false);
  const [autoOptimizing, setAutoOptimizing] = useState(false);
  const [autoOptimizeResult, setAutoOptimizeResult] = useState<AutoOptimizeResult | null>(null);
  const [toolTab, setToolTab] = useState<'green' | 'water' | 'harmful'>('green');

  const selectedCity = cities.find(c => c.id === selectedCityId) || null;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoAbortRef = useRef<AbortController | null>(null);

  // Fetch geo-analysis when city is selected
  useEffect(() => {
    if (!selectedCity) {
      setGeoAnalysis(null);
      return;
    }
    if (geoAbortRef.current) geoAbortRef.current.abort();
    geoAbortRef.current = new AbortController();
    setGeoLoading(true);

    getGeoAnalysis(selectedCity.lat, selectedCity.lng, { signal: geoAbortRef.current.signal })
      .then(data => setGeoAnalysis(data))
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.warn('[GeoAnalysis] fetch failed:', err);
          setGeoAnalysis(null);
        }
      })
      .finally(() => setGeoLoading(false));
  }, [selectedCity?.id]);

  // Fetch smart zones when toggled on
  useEffect(() => {
    if (!showSmartZones || !selectedCity) return;
    setSmartZonesLoading(true);
    fetch(`${BASE_API}/smart-zones/${selectedCity.id}`)
      .then(r => r.json())
      .then(data => setSmartZones(data.zones ?? []))
      .catch(() => setSmartZones([]))
      .finally(() => setSmartZonesLoading(false));
  }, [showSmartZones, selectedCity?.id]);

  // Run simulation
  const runSimulation = useCallback(async (
    city: City,
    invs: LocalIntervention[],
    geo: GeoAnalysis | null
  ) => {
    if (invs.length === 0) {
      setSimulationResult({
        cityId: city.id,
        temperatureDelta: 0,
        groundwaterDelta: 0,
        riskScoreDelta: 0,
        airQualityDelta: 0,
        projectedTemperature: city.temperature,
        projectedGroundwater: city.groundwater,
        projectedRiskScore: city.riskScore,
        waterWastageDelta: 0,
        contaminationDelta: 0,
        infrastructureStressDelta: 0,
        floodRiskDelta: 0,
        sewageLeakageRate: Math.round(city.population * 0.002 * (city.contaminationLevel / 100) * (1 - city.sewerageSystemHealth / 200)),
        aiInsights: [],
        interventionBreakdown: [],
        geoAdjusted: false,
      } as unknown as SimulationResult);
      setIsSimulating(false);
      return;
    }

    setIsSimulating(true);
    try {
      const geoContext: GeoSimulationContext | undefined = geo?.simulationModifiers
        ? {
            ndvi: geo.ndvi,
            waterBodyDistanceKm: geo.nearestWaterBody?.distanceKm ?? 999,
            landUseClass: geo.landUseClass,
            soilMoisturePercent: geo.realWeather.soilMoisturePercent,
            urbanDensityPercent: geo.urbanDensityPercent,
            treeEffectivenessMultiplier: geo.simulationModifiers.treeEffectivenessMultiplier,
            permeablePavementEffectiveness: geo.simulationModifiers.permeablePavementEffectiveness,
            groundwaterRechargePotential: geo.simulationModifiers.groundwaterRechargePotential,
          }
        : undefined;

      const counts: Record<string, number> = {};
      invs.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });

      const result = await calculateSimulation({
        cityId: city.id,
        interventions: Object.entries(counts).map(([type, count]) => ({
          type: type as typeof InterventionType[keyof typeof InterventionType],
          lat: invs.find(i => i.type === type)?.lat ?? city.lat,
          lng: invs.find(i => i.type === type)?.lng ?? city.lng,
          count,
        })),
        geoContext,
      });
      setSimulationResult(result);
    } catch (err) {
      console.warn('[Simulation] API failed, using local fallback:', err);
      setSimulationResult(buildLocalResult(city, invs));
    } finally {
      setIsSimulating(false);
    }
  }, []);

  // Debounce simulation updates
  useEffect(() => {
    if (!selectedCity) {
      setSimulationResult(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSimulation(selectedCity, interventions, geoAnalysis);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedCity?.id, interventions, geoAnalysis, runSimulation]);

  const selectCity = (id: string | null) => {
    setSelectedCityId(id);
    if (id !== selectedCityId) {
      setInterventions([]);
      setSimulationResult(null);
      setAutoOptimizeResult(null);
      setSmartZones([]);
    }
  };

  const addIntervention = (inv: Omit<LocalIntervention, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setInterventions(prev => [...prev, { ...inv, id }]);
    setLastPlacedIntervention({ type: inv.type, lat: inv.lat, lng: inv.lng });
    setPlacementEffects(prev => [...prev, { id, type: inv.type, lat: inv.lat, lng: inv.lng, timestamp: Date.now() }]);
    setTimeout(() => setLastPlacedIntervention(null), 3000);
  };

  const removeIntervention = (id: string) => {
    setInterventions(prev => prev.filter(i => i.id !== id));
  };

  const updateIntervention = (id: string, lat: number, lng: number) => {
    setInterventions(prev => prev.map(i => i.id === id ? { ...i, lat, lng } : i));
  };

  const clearInterventions = () => {
    setInterventions([]);
    setAutoOptimizeResult(null);
  };

  const toggleSmartZones = () => {
    setShowSmartZones(prev => !prev);
  };

  const runAutoOptimize = useCallback(async (priority = 'balanced') => {
    if (!selectedCity) return;
    setAutoOptimizing(true);
    try {
      const res = await fetch(`${BASE_API}/simulation/auto-optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityId: selectedCity.id, priority, maxInterventions: 8 }),
      });
      const data = await res.json();
      setAutoOptimizeResult(data);
    } catch (err) {
      console.warn('[AutoOptimize] failed:', err);
    } finally {
      setAutoOptimizing(false);
    }
  }, [selectedCity?.id]);

  const applyAutoOptimize = useCallback(() => {
    if (!autoOptimizeResult || !selectedCity) return;
    clearInterventions();
    const newInvs: LocalIntervention[] = [];
    for (const rec of autoOptimizeResult.recommendedInterventions) {
      for (let i = 0; i < rec.count; i++) {
        const jitter = (Math.random() - 0.5) * 0.04;
        const jitter2 = (Math.random() - 0.5) * 0.04;
        newInvs.push({
          id: Math.random().toString(36).substring(7),
          type: rec.type as typeof InterventionType[keyof typeof InterventionType],
          lat: selectedCity.lat + jitter,
          lng: selectedCity.lng + jitter2,
        });
      }
    }
    setInterventions(newInvs);
  }, [autoOptimizeResult, selectedCity]);

  return (
    <SandboxContext.Provider value={{
      cities,
      selectedCity,
      activeTool,
      interventions,
      simulationResult,
      isSimulating,
      lastPlacedIntervention,
      placementEffects,
      geoAnalysis,
      geoLoading,
      activeLayer,
      showSmartZones,
      smartZones,
      smartZonesLoading,
      autoOptimizing,
      autoOptimizeResult,
      toolTab,
      selectCity,
      setActiveTool,
      addIntervention,
      removeIntervention,
      updateIntervention,
      clearInterventions,
      setActiveLayer,
      toggleSmartZones,
      runAutoOptimize,
      applyAutoOptimize,
      setToolTab,
    }}>
      {children}
    </SandboxContext.Provider>
  );
}

export function useSandbox() {
  const context = useContext(SandboxContext);
  if (context === undefined) {
    throw new Error('useSandbox must be used within a SandboxProvider');
  }
  return context;
}

function buildLocalResult(city: City, invs: LocalIntervention[]): SimulationResult {
  let tempDelta = 0, gwDelta = 0, aqiDelta = 0, wasteDelta = 0, contamDelta = 0, infraDelta = 0, floodDelta = 0;
  const counts: Record<string, number> = {};
  invs.forEach(inv => {
    counts[inv.type] = (counts[inv.type] || 0) + 1;
    switch (inv.type) {
      case 'tree': tempDelta -= 0.3; gwDelta += 0.5; contamDelta -= 3; break;
      case 'fountain': gwDelta += 2.0; wasteDelta += 3; break;
      case 'solar': tempDelta -= 0.1; infraDelta -= 2; break;
      case 'green_roof': tempDelta -= 0.4; gwDelta += 0.3; floodDelta -= 3; break;
      case 'permeable_pavement': tempDelta -= 0.1; gwDelta += 3.0; contamDelta -= 5; floodDelta -= 8; break;
      case 'sewage_treatment': gwDelta += 1.5; contamDelta -= 22; infraDelta -= 6; break;
      case 'water_tank': wasteDelta -= 10; floodDelta -= 5; gwDelta += 0.8; break;
      case 'cool_road': tempDelta -= 0.25; break;
      case 'rainfall_harvesting': gwDelta += 2.5; wasteDelta -= 15; floodDelta -= 10; break;
      case 'factory': tempDelta += 1.5; gwDelta -= 2.0; aqiDelta += 30; contamDelta += 18; break;
      case 'stubble_burning': tempDelta += 0.8; gwDelta -= 1.0; aqiDelta += 50; contamDelta += 8; break;
      case 'fireworks': tempDelta += 0.2; aqiDelta += 20; break;
    }
  });
  tempDelta = Math.max(-15, Math.min(15, tempDelta));
  gwDelta = Math.max(-50, Math.min(50, gwDelta));
  const riskDelta = tempDelta * 2 - gwDelta * 0.5 + aqiDelta * 0.1;
  const bd = Object.entries(counts).map(([type, count]) => {
    const tool = TOOLS.find(t => t.type === type);
    return { type, effect: tool?.name ?? type, temperatureImpact: 0, groundwaterImpact: 0, contaminationImpact: 0, waterWastageImpact: 0 };
  });
  const sewageLeakage = Math.max(0, (city.population * 0.002) * ((city.contaminationLevel + contamDelta) / 100));
  return {
    cityId: city.id,
    temperatureDelta: tempDelta,
    groundwaterDelta: gwDelta,
    riskScoreDelta: riskDelta,
    airQualityDelta: aqiDelta,
    projectedTemperature: city.temperature + tempDelta,
    projectedGroundwater: Math.max(0, Math.min(100, city.groundwater + gwDelta)),
    projectedRiskScore: Math.max(0, Math.min(100, city.riskScore + riskDelta)),
    waterWastageDelta: wasteDelta,
    contaminationDelta: contamDelta,
    infrastructureStressDelta: infraDelta,
    floodRiskDelta: floodDelta,
    sewageLeakageRate: sewageLeakage,
    aiInsights: [`Local fallback: ${city.name} simulation running offline.`],
    interventionBreakdown: bd,
    geoAdjusted: false,
  } as unknown as SimulationResult;
}
