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

interface SandboxContextType {
  cities: City[];
  selectedCity: City | null;
  activeTool: typeof InterventionType[keyof typeof InterventionType] | null;
  interventions: LocalIntervention[];
  simulationResult: SimulationResult | null;
  isSimulating: boolean;
  
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

    interventions.forEach(inv => {
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

    // Generate AI Insights locally
    const insights: string[] = [];
    if (tempDelta < -1) insights.push(`Urban cooling measures are effective, reducing local heat island by ${Math.abs(tempDelta).toFixed(1)}°C.`);
    if (tempDelta > 1) insights.push(`Warning: Interventions are exacerbating urban heat. Consider adding green infrastructure.`);
    if (gwDelta > 5) insights.push(`Significant improvement in groundwater recharge potential detected.`);
    if (gwDelta < -2) insights.push(`Critical alert: Industrial or surface activities are depleting the water table.`);
    if (aqiDelta > 40) insights.push(`Air quality degradation is severe. Health advisories recommended.`);
    if (insights.length === 0) insights.push("Current interventions have a marginal impact. Scale up efforts for noticeable change.");

    return {
      cityId: selectedCity.id,
      temperatureDelta: tempDelta,
      groundwaterDelta: gwDelta,
      riskScoreDelta: riskDelta,
      airQualityDelta: aqiDelta,
      projectedTemperature: selectedCity.temperature + tempDelta,
      projectedGroundwater: Math.max(0, Math.min(100, selectedCity.groundwater + gwDelta)),
      projectedRiskScore: newRisk,
      aiInsights: insights,
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
    setInterventions(prev => [...prev, { ...inv, id: Math.random().toString(36).substring(7) }]);
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
