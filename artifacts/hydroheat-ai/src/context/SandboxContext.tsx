import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { City, InterventionType, SimulationResult, GeoAnalysis, GeoSimulationContext } from '@workspace/api-client-react';
import { useGetCities, getGetCitiesQueryKey, getGeoAnalysis, calculateSimulation } from '@workspace/api-client-react';
import { HARDCODED_CITIES, TOOLS, haversineKm, distanceToWaterMultiplier, type MapLayer } from '../lib/constants';

export interface LocalIntervention {
  id: string;
  type: string;
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

export interface EnvironmentScores {
  waterQualityScore: number;
  pollutionScore: number;
  sustainabilityScore: number;
}

interface SandboxContextType {
  cities: City[];
  selectedCity: City | null;
  activeTool: string | null;
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
  waterWastagePercent: number;
  rainwaterHarvestingEnabled: boolean;
  scores: EnvironmentScores | null;

  selectCity: (cityId: string | null) => void;
  setActiveTool: (tool: string | null) => void;
  addIntervention: (intervention: Omit<LocalIntervention, 'id'>) => void;
  removeIntervention: (id: string) => void;
  updateIntervention: (id: string, lat: number, lng: number) => void;
  clearInterventions: () => void;
  setActiveLayer: (layer: MapLayer) => void;
  toggleSmartZones: () => void;
  runAutoOptimize: (priority?: string) => Promise<void>;
  applyAutoOptimize: () => void;
  setToolTab: (tab: 'green' | 'water' | 'harmful') => void;
  setWaterWastagePercent: (v: number) => void;
  toggleRainwaterHarvesting: () => void;
}

const SandboxContext = createContext<SandboxContextType | undefined>(undefined);

const BASE_API = '/api';

export function SandboxProvider({ children }: { children: React.ReactNode }) {
  const { data: apiCities } = useGetCities({
    query: { queryKey: getGetCitiesQueryKey(), retry: 1, staleTime: Infinity }
  });

  const cities = Array.isArray(apiCities) && apiCities.length > 0 ? apiCities : HARDCODED_CITIES;

  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
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
  const [waterWastagePercent, setWaterWastagePercent] = useState(40);
  const [rainwaterHarvestingEnabled, setRainwaterHarvestingEnabled] = useState(false);

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
      .then((data: GeoAnalysis) => setGeoAnalysis(data))
      .catch((err: { name?: string }) => {
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
    geo: GeoAnalysis | null,
    wastage: number,
    rainHarvest: boolean,
  ) => {
    const apiInvs = invs.filter(i => i.type !== 'sewage_untreated');

    if (apiInvs.length === 0 && invs.length === 0) {
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
      apiInvs.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });

      const result = await calculateSimulation({
        cityId: city.id,
        interventions: Object.entries(counts).map(([type, count]) => ({
          type: type as typeof InterventionType[keyof typeof InterventionType],
          lat: apiInvs.find(i => i.type === type)?.lat ?? city.lat,
          lng: apiInvs.find(i => i.type === type)?.lng ?? city.lng,
          count,
        })),
        geoContext,
      });

      const localExtras = buildLocalExtras(city, invs, wastage, rainHarvest, geo);
      const merged: SimulationResult = {
        ...result,
        temperatureDelta: result.temperatureDelta + localExtras.tempDelta,
        groundwaterDelta: result.groundwaterDelta + localExtras.gwDelta,
        contaminationDelta: result.contaminationDelta + localExtras.contamDelta,
        waterWastageDelta: result.waterWastageDelta + localExtras.wasteDelta,
        floodRiskDelta: result.floodRiskDelta + localExtras.floodDelta,
        sewageLeakageRate: Math.max(result.sewageLeakageRate ?? 0, localExtras.sewageLeakage),
        aiInsights: [...(localExtras.aiInsights), ...(result.aiInsights ?? [])],
      };
      setSimulationResult(merged);
    } catch (err) {
      console.warn('[Simulation] API failed, using local fallback:', err);
      setSimulationResult(buildLocalResult(city, invs, wastage, rainHarvest, geo));
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
      runSimulation(selectedCity, interventions, geoAnalysis, waterWastagePercent, rainwaterHarvestingEnabled);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedCity?.id, interventions, geoAnalysis, waterWastagePercent, rainwaterHarvestingEnabled, runSimulation]);

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

  const toggleRainwaterHarvesting = () => {
    setRainwaterHarvestingEnabled(prev => !prev);
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
    // PRESERVE user-placed interventions — only ADD optimized ones
    const factories = interventions.filter(i => i.type === 'factory');
    const sewageSources = interventions.filter(i => i.type === 'sewage_untreated');
    const stubbleSites = interventions.filter(i => i.type === 'stubble_burning');

    const newInvs: LocalIntervention[] = [];
    for (const rec of autoOptimizeResult.recommendedInterventions) {
      for (let i = 0; i < rec.count; i++) {
        let baseLat = selectedCity.lat;
        let baseLng = selectedCity.lng;

        // Place trees adjacent to factories for maximum mitigation
        if (rec.type === 'tree' && factories.length > 0) {
          const src = factories[i % factories.length];
          baseLat = src.lat;
          baseLng = src.lng;
        }
        // Place trees adjacent to stubble burning sites
        else if (rec.type === 'tree' && stubbleSites.length > 0) {
          const src = stubbleSites[i % stubbleSites.length];
          baseLat = src.lat;
          baseLng = src.lng;
        }
        // Place sewage treatment plants near sewage sources
        else if (rec.type === 'sewage_treatment' && sewageSources.length > 0) {
          const src = sewageSources[i % sewageSources.length];
          baseLat = src.lat;
          baseLng = src.lng;
        }
        // Place permeable pavement near sewage/factory runoff areas
        else if (rec.type === 'permeable_pavement' && (sewageSources.length > 0 || factories.length > 0)) {
          const harmful = [...sewageSources, ...factories];
          const src = harmful[i % harmful.length];
          baseLat = src.lat;
          baseLng = src.lng;
        }

        const jitter = (Math.random() - 0.5) * 0.025;
        const jitter2 = (Math.random() - 0.5) * 0.025;
        newInvs.push({
          id: Math.random().toString(36).substring(7),
          type: rec.type,
          lat: baseLat + jitter,
          lng: baseLng + jitter2,
        });
      }
    }
    setInterventions(prev => [...prev, ...newInvs]);
  }, [autoOptimizeResult, selectedCity, interventions]);

  const scores = useMemo((): EnvironmentScores | null => {
    if (!selectedCity) return null;

    const contaminDelta = simulationResult?.contaminationDelta ?? 0;
    const airQualityDelta = simulationResult?.airQualityDelta ?? 0;

    const harmfulTypes = ['factory', 'sewage_untreated', 'stubble_burning', 'fireworks'];
    const greenTypes = ['tree', 'fountain', 'solar', 'green_roof', 'permeable_pavement', 'sewage_treatment', 'water_tank', 'cool_road', 'rainfall_harvesting'];
    const harmfulCount = interventions.filter(i => harmfulTypes.includes(i.type)).length;
    const greenCount = interventions.filter(i => greenTypes.includes(i.type)).length;

    const waterBodyDistKm = geoAnalysis?.nearestWaterBody?.distanceKm ?? 999;

    // Distance-based water contamination penalty from actual intervention positions
    let waterProximityPenalty = 0;
    for (const inv of interventions) {
      if (inv.type === 'sewage_untreated' || inv.type === 'factory') {
        const invDistFromCity = haversineKm(inv.lat, inv.lng, selectedCity.lat, selectedCity.lng);
        // Estimated distance from intervention to water body (lower bound approximation)
        const approxDistToWater = Math.max(0.5, waterBodyDistKm - invDistFromCity);
        const mult = distanceToWaterMultiplier(approxDistToWater);
        waterProximityPenalty += inv.type === 'sewage_untreated'
          ? 15 * (mult - 1)
          : 8 * (mult - 1);
      }
    }

    const waterQualityScore = Math.max(0, Math.min(100,
      (100 - selectedCity.contaminationLevel) - Math.max(0, contaminDelta) - waterProximityPenalty
    ));

    const pollutionScore = Math.max(0, Math.min(100,
      (100 - Math.min(100, selectedCity.airQualityIndex / 4)) - Math.max(0, airQualityDelta * 0.25)
    ));

    const sustainabilityScore = Math.max(0, Math.min(100,
      selectedCity.sustainabilityScore + (greenCount * 3) - (harmfulCount * 5)
    ));

    return { waterQualityScore, pollutionScore, sustainabilityScore };
  }, [selectedCity, simulationResult, interventions, geoAnalysis]);

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
      waterWastagePercent,
      rainwaterHarvestingEnabled,
      scores,
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
      setWaterWastagePercent,
      toggleRainwaterHarvesting,
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

// Local extras: apply sewage_untreated, water wastage, and rainwater harvesting
function buildLocalExtras(
  city: City,
  invs: LocalIntervention[],
  wastagePercent: number,
  rainHarvest: boolean,
  geo: GeoAnalysis | null,
): { tempDelta: number; gwDelta: number; contamDelta: number; wasteDelta: number; floodDelta: number; sewageLeakage: number; aiInsights: string[] } {
  let gwDelta = 0, contamDelta = 0, wasteDelta = 0, floodDelta = 0, tempDelta = 0;
  const aiInsights: string[] = [];

  // Water wastage slider effect
  const wastageNorm = wastagePercent / 100;
  gwDelta -= wastageNorm * 8;
  contamDelta += wastageNorm * 12;
  floodDelta += wastageNorm * 6;
  wasteDelta += wastagePercent * 0.3;
  if (wastagePercent > 60) {
    aiInsights.push(`⚠️ Warning: ${wastagePercent}% water wastage rate is critically high. Groundwater depletion accelerating — deploy Water Tanks or Permeable Pavement to reduce runoff.`);
  } else if (wastagePercent > 30) {
    aiInsights.push(`📊 Water wastage at ${wastagePercent}%. Moderate runoff and pollution increase detected. Consider reducing wastage below 20% for sustainable groundwater levels.`);
  }

  // Rainwater harvesting (Hyderabad ~800mm/year baseline)
  if (rainHarvest) {
    const rainfallMm = city.rainfall ?? 800;
    const rechargeFactor = rainfallMm / 800;
    gwDelta += 3.5 * rechargeFactor;
    wasteDelta -= 18;
    floodDelta -= 12;
    aiInsights.push(`✅ Rainwater harvesting active. Using ${rainfallMm}mm/year local data — groundwater recharge increased by ${(3.5 * rechargeFactor).toFixed(1)}%. Flood risk reduced.`);
  } else {
    gwDelta -= 1.2;
    wasteDelta += 8;
    aiInsights.push(`💧 Rainwater harvesting is OFF. ${city.rainfall ?? 800}mm/year of rainfall is being lost to surface runoff. Enable harvesting to improve recharge.`);
  }

  // Sewage untreated sources — distance-based contamination
  const sewageSources = invs.filter(i => i.type === 'sewage_untreated');
  const waterBodyDistKm = geo?.nearestWaterBody?.distanceKm ?? 999;
  const waterBodyName = geo?.nearestWaterBody?.name ?? 'nearby water body';

  let closestSewageToWater = Infinity;
  for (const sewage of sewageSources) {
    const invDistFromCity = haversineKm(sewage.lat, sewage.lng, city.lat, city.lng);
    const approxDistToWater = Math.max(0.5, waterBodyDistKm - invDistFromCity);
    if (approxDistToWater < closestSewageToWater) closestSewageToWater = approxDistToWater;
    const distMult = distanceToWaterMultiplier(approxDistToWater);
    gwDelta -= 4;
    contamDelta += 30 * distMult;
    floodDelta += 8;
    tempDelta += 0.3;
  }

  if (sewageSources.length > 0) {
    const soilType = geo?.landUseClass ?? 'Vertisol';
    aiInsights.push(`🚨 Critical: ${sewageSources.length} untreated sewage source${sewageSources.length > 1 ? 's' : ''} detected. Distance-based diffusion active (${soilType} soil). Impact multiplier: ${distanceToWaterMultiplier(closestSewageToWater).toFixed(1)}×.`);

    if (closestSewageToWater < 3) {
      aiInsights.push(`⚠️ CRITICAL ALERT: Sewage source is ~${closestSewageToWater.toFixed(1)}km from ${waterBodyName}. Water body contamination IMMINENT — pathogen load is irreversible. Deploy Sewage Treatment Plants NOW.`);
    } else if (closestSewageToWater < 6) {
      aiInsights.push(`⚠️ Warning: Sewage plume ~${closestSewageToWater.toFixed(1)}km from ${waterBodyName}. Contamination spread expected within 48–72 hours. Recommend: Sewage Treatment Plant or Permeable Pavement immediately.`);
    } else if (closestSewageToWater < 10) {
      aiInsights.push(`📊 Sewage source ~${closestSewageToWater.toFixed(1)}km from ${waterBodyName}. Risk is moderate — soil filtration may contain spread. Monitor and add Permeable Pavement to intercept runoff.`);
    }

    const sewageCount = sewageSources.length;
    const leakageLiters = Math.round(sewageCount * city.population * 0.0015 * (1 + wastagePercent / 100));
    aiInsights.push(`📊 Estimated sewage discharge: ${(leakageLiters / 1000).toFixed(0)}K L/day. Contamination radius: ~${(sewageCount * 1.2 * distanceToWaterMultiplier(closestSewageToWater)).toFixed(1)}km. Fix: Install STP or Permeable Pavement to filter pathogens.`);
  }

  const sewageLeakage = sewageSources.length > 0
    ? Math.round(sewageSources.length * city.population * 0.0015 * (1 + wastagePercent / 100))
    : 0;

  return { tempDelta, gwDelta, contamDelta, wasteDelta, floodDelta, sewageLeakage, aiInsights };
}

function buildLocalResult(city: City, invs: LocalIntervention[], wastagePercent: number, rainHarvest: boolean, geo: GeoAnalysis | null): SimulationResult {
  let tempDelta = 0, gwDelta = 0, aqiDelta = 0, wasteDelta = 0, contamDelta = 0, infraDelta = 0, floodDelta = 0;
  const counts: Record<string, number> = {};
  const waterBodyDistKm = geo?.nearestWaterBody?.distanceKm ?? 999;

  invs.forEach(inv => {
    counts[inv.type] = (counts[inv.type] || 0) + 1;
    const invDistFromCity = haversineKm(inv.lat, inv.lng, city.lat, city.lng);
    const approxDistToWater = Math.max(0.5, waterBodyDistKm - invDistFromCity);
    const distMult = distanceToWaterMultiplier(approxDistToWater);

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
      // Distance-scaled: sewage and factory cause more damage when close to water body
      case 'sewage_untreated': gwDelta -= 4; contamDelta += 30 * distMult; floodDelta += 8; tempDelta += 0.3; break;
      case 'factory': tempDelta += 1.5; gwDelta -= 2.0; aqiDelta += 30; contamDelta += 18 * distMult; infraDelta += 8; break;
      case 'stubble_burning': tempDelta += 0.8; gwDelta -= 1.0; aqiDelta += 50; contamDelta += 8; break;
      case 'fireworks': tempDelta += 0.2; aqiDelta += 20; break;
    }
  });

  const extras = buildLocalExtras(city, invs, wastagePercent, rainHarvest, geo);
  tempDelta += extras.tempDelta;
  gwDelta += extras.gwDelta;
  contamDelta += extras.contamDelta;
  wasteDelta += extras.wasteDelta;
  floodDelta += extras.floodDelta;

  tempDelta = Math.max(-15, Math.min(15, tempDelta));
  gwDelta = Math.max(-50, Math.min(50, gwDelta));
  const riskDelta = tempDelta * 2 - gwDelta * 0.5 + aqiDelta * 0.1;
  const bd = Object.entries(counts).map(([type, count]) => {
    const tool = TOOLS.find(t => t.type === type);
    return { type, effect: tool?.name ?? type, temperatureImpact: 0, groundwaterImpact: 0, contaminationImpact: 0, waterWastageImpact: 0 };
  });
  const sewageLeakage = extras.sewageLeakage || Math.max(0, (city.population * 0.002) * ((city.contaminationLevel + contamDelta) / 100));
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
    aiInsights: extras.aiInsights,
    interventionBreakdown: bd,
    geoAdjusted: false,
  } as unknown as SimulationResult;
}
