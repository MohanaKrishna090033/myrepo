import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { City, InterventionType, SimulationResult, GeoAnalysis, GeoSimulationContext } from '@workspace/api-client-react';
import { useGetCities, getGeoAnalysis, calculateSimulation } from '@workspace/api-client-react';
import { HARDCODED_CITIES, TOOLS } from '../lib/constants';

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

  selectCity: (cityId: string | null) => void;
  setActiveTool: (tool: typeof InterventionType[keyof typeof InterventionType] | null) => void;
  addIntervention: (intervention: Omit<LocalIntervention, 'id'>) => void;
  removeIntervention: (id: string) => void;
  updateIntervention: (id: string, lat: number, lng: number) => void;
  clearInterventions: () => void;
}

const SandboxContext = createContext<SandboxContextType | undefined>(undefined);

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
      .then(data => {
        setGeoAnalysis(data);
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.warn('[GeoAnalysis] fetch failed:', err);
          setGeoAnalysis(null);
        }
      })
      .finally(() => setGeoLoading(false));
  }, [selectedCity?.id]);

  // Run simulation via backend API (debounced) with geo context
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

  const clearInterventions = () => setInterventions([]);

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
      selectCity,
      setActiveTool,
      addIntervention,
      removeIntervention,
      updateIntervention,
      clearInterventions
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

// ---------------------------------------------------------------------------
// Local simulation fallback (used when backend API is unavailable)
// ---------------------------------------------------------------------------
function buildLocalResult(city: City, invs: LocalIntervention[]): SimulationResult {
  let tempDelta = 0, gwDelta = 0, aqiDelta = 0;
  const counts: Record<string, number> = {};
  invs.forEach(inv => {
    counts[inv.type] = (counts[inv.type] || 0) + 1;
    let dt = 0, dgw = 0, daqi = 0;
    switch (inv.type) {
      case 'tree': dt = -0.3; dgw = 0.5; break;
      case 'fountain': dgw = 2.0; break;
      case 'solar': dt = -0.1; break;
      case 'green_roof': dt = -0.4; dgw = 0.3; break;
      case 'permeable_pavement': dt = -0.1; dgw = 3.0; break;
      case 'factory': dt = 1.5; dgw = -2.0; daqi = 30; break;
      case 'stubble_burning': dt = 0.8; dgw = -1.0; daqi = 50; break;
      case 'fireworks': dt = 0.2; daqi = 20; break;
    }
    tempDelta += dt; gwDelta += dgw; aqiDelta += daqi;
  });
  tempDelta = Math.max(-15, Math.min(15, tempDelta));
  gwDelta = Math.max(-50, Math.min(50, gwDelta));
  const riskDelta = tempDelta * 2 - gwDelta * 0.5 + aqiDelta * 0.1;
  const bd = Object.entries(counts).map(([type, count]) => {
    const tool = TOOLS.find(t => t.type === type);
    return { type, effect: tool?.name ?? type, temperatureImpact: 0, groundwaterImpact: 0 };
  });
  return {
    cityId: city.id,
    temperatureDelta: tempDelta,
    groundwaterDelta: gwDelta,
    riskScoreDelta: riskDelta,
    airQualityDelta: aqiDelta,
    projectedTemperature: city.temperature + tempDelta,
    projectedGroundwater: Math.max(0, Math.min(100, city.groundwater + gwDelta)),
    projectedRiskScore: Math.max(0, Math.min(100, city.riskScore + riskDelta)),
    aiInsights: [`Local fallback: ${city.name} simulation running offline.`],
    interventionBreakdown: bd,
    geoAdjusted: false,
  } as unknown as SimulationResult;
}
