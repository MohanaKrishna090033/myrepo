import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { City, InterventionType, SimulationResult, InterventionEffect } from '@workspace/api-client-react';
import { useGetCities } from '@workspace/api-client-react';
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

  const selectedCity = useMemo(() => 
    cities.find(c => c.id === selectedCityId) || null
  , [cities, selectedCityId]);

  // Local Simulation Engine
  const simulationResult = useMemo(() => {
    if (!selectedCity) return null;
    if (interventions.length === 0) {
      return {
        cityId: selectedCity.id,
        temperatureDelta: 0,
        groundwaterDelta: 0,
        riskScoreDelta: 0,
        airQualityDelta: 0,
        projectedTemperature: selectedCity.temperature,
        projectedGroundwater: selectedCity.groundwater,
        projectedRiskScore: selectedCity.riskScore,
        aiInsights: [],
        interventionBreakdown: []
      } as SimulationResult;
    }

    let tempDelta = 0;
    let gwDelta = 0;
    let aqiDelta = 0;
    
    const breakdowns: Record<string, InterventionEffect> = {};
    const counts: Record<string, number> = {};

    interventions.forEach(inv => {
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
      
      tempDelta += dt;
      gwDelta += dgw;
      aqiDelta += daqi;

      if (!breakdowns[inv.type]) {
        const toolDef = TOOLS.find(t => t.type === inv.type);
        breakdowns[inv.type] = {
          type: inv.type,
          effect: toolDef?.name || inv.type,
          temperatureImpact: 0,
          groundwaterImpact: 0
        };
      }
      breakdowns[inv.type].temperatureImpact += dt;
      breakdowns[inv.type].groundwaterImpact += dgw;
    });

    // Cap changes
    tempDelta = Math.max(-15, Math.min(15, tempDelta));
    gwDelta = Math.max(-50, Math.min(50, gwDelta));

    let newRisk = selectedCity.riskScore + (tempDelta * 2) - (gwDelta * 0.5) + (aqiDelta * 0.1);
    newRisk = Math.max(0, Math.min(100, newRisk));
    const riskDelta = newRisk - selectedCity.riskScore;

    const popM = (selectedCity.population / 1000000).toFixed(1);

    // Generate AI Insights locally
    const insights: string[] = [];
    
    // General assessment
    if (tempDelta < -1) insights.push(`Urban cooling measures are highly effective in ${selectedCity.name}, reducing the local heat island by ${Math.abs(tempDelta).toFixed(1)}°C. Predicted risk dropping by ${Math.abs(riskDelta).toFixed(1)} pts.`);
    else if (tempDelta > 1) insights.push(`Critical Warning: Heating interventions in ${selectedCity.name} are exacerbating UHI by +${tempDelta.toFixed(1)}°C. Immediate green infrastructure recommended.`);
    else if (gwDelta > 5) insights.push(`Strong groundwater recharge observed for ${selectedCity.name}. The water table is projected to recover by +${gwDelta.toFixed(1)}%.`);
    else if (gwDelta < -2) insights.push(`Alert: Surface activities are depleting ${selectedCity.name}'s water table by ${Math.abs(gwDelta).toFixed(1)}%.`);
    else if (aqiDelta > 40) insights.push(`Air quality degradation is severe. ${selectedCity.name}'s AQI increased by ${aqiDelta}. Health advisories recommended for its ${popM}M residents.`);
    else insights.push(`${selectedCity.name} (${selectedCity.state}) baseline scenario: Current mix of interventions yields a net temperature shift of ${tempDelta > 0 ? '+' : ''}${tempDelta.toFixed(1)}°C.`);

    // Specific insights
    if (counts['tree']) {
      const N = counts['tree'];
      insights.push(`Planting ${N} trees near ${selectedCity.name} (${selectedCity.state}) could reduce the urban heat island by ${(N * 0.3).toFixed(1)}°C over 5 years. Evapotranspiration from these trees would improve local humidity by ~${N*2}% and sequester approximately ${N*22}kg of CO₂ annually.`);
    }
    if (counts['fountain']) {
      const N = counts['fountain'];
      insights.push(`${N} water fountain(s) near ${selectedCity.name} will create localized evaporative cooling zones. Estimated groundwater recharge improvement: +${(N * 2).toFixed(1)}% over the ${selectedCity.rainfall > 1000 ? 'high' : 'low'}-rainfall region.`);
    }
    if (counts['factory']) {
      const N = counts['factory'];
      insights.push(`Warning: Industrial expansion (${N} factories) in ${selectedCity.name} (Population: ${popM}M) will worsen the already ${selectedCity.riskScore > 80 ? 'critical' : 'high'} risk score by ${(N * 3).toFixed(1)} points. Particulate emissions could impact ${Math.round(selectedCity.population/500000)} lakh residents.`);
    }
    if (counts['solar']) {
      const N = counts['solar'];
      insights.push(`${N} solar installation(s) reduce waste heat from conventional power by ${(N*0.4).toFixed(1)}°C equivalent. Combined with ${selectedCity.name}'s annual radiation of ${Math.round(selectedCity.rainfall*0.8)} kWh/m², this is highly effective.`);
    }
    if (counts['stubble_burning']) {
      const N = counts['stubble_burning'];
      insights.push(`Critical Alert: Stubble burning at these ${N} location(s) near ${selectedCity.name} releases ~${(N*2.3).toFixed(1)} tonnes of particulates. AQI will spike by +${N*50} points, reaching hazardous levels. Groundwater tables depleted by ${Math.abs(N*1.0).toFixed(1)}%.`);
    }
    if (counts['green_roof']) {
      const N = counts['green_roof'];
      insights.push(`${N} green roof installation(s) in ${selectedCity.name} provide insulation that reduces building cooling load by ~${N*8}%. Storm water retention improves by ${(N*0.3).toFixed(1)}%.`);
    }
    if (counts['permeable_pavement']) {
      const N = counts['permeable_pavement'];
      insights.push(`Permeable pavement at ${N} site(s) allows natural infiltration — critical for ${selectedCity.name} which receives ${selectedCity.rainfall}mm annual rainfall. Projected groundwater recharge: +${(N*3).toFixed(1)}%.`);
    }
    if (counts['fireworks']) {
      const N = counts['fireworks'];
      insights.push(`Fireworks at ${N} location(s) release metal oxides and sulfur compounds. Short-term AQI spike of +${N*20} expected. Avoid in ${selectedCity.name}'s already ${selectedCity.airQualityIndex > 200 ? 'poor' : 'moderate'} air quality zone.`);
    }

    // Recommendation
    if (tempDelta > 0) {
      insights.push(`Recommended Next Action: Deploy Green Roofs or Trees in high-density areas to counteract the +${tempDelta.toFixed(1)}°C heating trend.`);
    } else if (gwDelta < 0) {
      insights.push(`Recommended Next Action: Invest in Permeable Pavements or Fountains to reverse the ${gwDelta.toFixed(1)}% groundwater deficit.`);
    } else {
      insights.push(`Recommended Next Action: Continue expanding solar and tree coverage to maintain positive momentum in the region.`);
    }

    return {
      cityId: selectedCity.id,
      temperatureDelta: tempDelta,
      groundwaterDelta: gwDelta,
      riskScoreDelta: riskDelta,
      airQualityDelta: aqiDelta,
      projectedTemperature: selectedCity.temperature + tempDelta,
      projectedGroundwater: Math.max(0, Math.min(100, selectedCity.groundwater + gwDelta)),
      projectedRiskScore: newRisk,
      aiInsights: insights.slice(0, 4), // keep it max 4
      interventionBreakdown: Object.values(breakdowns)
    } as SimulationResult;
  }, [selectedCity, interventions]);

  // Fake simulation loading effect
  useEffect(() => {
    if (interventions.length > 0) {
      setIsSimulating(true);
      const timer = setTimeout(() => setIsSimulating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [interventions.length]);

  const selectCity = (id: string | null) => {
    setSelectedCityId(id);
    if (id !== selectedCityId) {
      setInterventions([]); // clear when changing city
    }
  };

  const addIntervention = (inv: Omit<LocalIntervention, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setInterventions(prev => [...prev, { ...inv, id }]);
    
    setLastPlacedIntervention({ type: inv.type, lat: inv.lat, lng: inv.lng });
    setPlacementEffects(prev => [...prev, { id, type: inv.type, lat: inv.lat, lng: inv.lng, timestamp: Date.now() }]);
    
    setTimeout(() => {
      setLastPlacedIntervention(null);
    }, 3000);
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
