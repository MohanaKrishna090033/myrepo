import { Router, type IRouter } from "express";
import { CalculateSimulationBody, CalculateSimulationResponse } from "@workspace/api-zod";
import { CITIES_DATA } from "./cities.js";

const router: IRouter = Router();

interface InterventionProfile {
  temperatureImpact: number;
  groundwaterImpact: number;
  airQualityImpact: number;
  waterWastageImpact: number;
  contaminationImpact: number;
  infrastructureStressImpact: number;
  floodRiskImpact: number;
  effect: string;
}

const BASE_EFFECTS: Record<string, InterventionProfile> = {
  tree: {
    temperatureImpact: -0.30, groundwaterImpact: 0.50, airQualityImpact: -5,
    waterWastageImpact: -2, contaminationImpact: -3, infrastructureStressImpact: -1, floodRiskImpact: -2,
    effect: "Shade + evapotranspiration cooling; roots enhance groundwater recharge; phytoremediation reduces contamination"
  },
  fountain: {
    temperatureImpact: -0.15, groundwaterImpact: 2.00, airQualityImpact: -3,
    waterWastageImpact: 3, contaminationImpact: -1, infrastructureStressImpact: 0, floodRiskImpact: 0,
    effect: "Evaporative cooling; managed recharge improves local water table; slight water usage increase"
  },
  solar: {
    temperatureImpact: -0.10, groundwaterImpact: 0.00, airQualityImpact: -2,
    waterWastageImpact: 0, contaminationImpact: 0, infrastructureStressImpact: -2, floodRiskImpact: 0,
    effect: "Reduces waste heat from conventional generation; lowers grid stress; no water impact"
  },
  green_roof: {
    temperatureImpact: -0.40, groundwaterImpact: 0.30, airQualityImpact: -4,
    waterWastageImpact: -1, contaminationImpact: -2, infrastructureStressImpact: -3, floodRiskImpact: -3,
    effect: "Insulation + evapotranspiration; mild stormwater retention; reduces urban runoff"
  },
  permeable_pavement: {
    temperatureImpact: -0.10, groundwaterImpact: 3.00, airQualityImpact: -1,
    waterWastageImpact: -4, contaminationImpact: -5, infrastructureStressImpact: -2, floodRiskImpact: -8,
    effect: "Natural infiltration; excellent groundwater recharge; reduces runoff and flood risk; filters contaminants"
  },
  factory: {
    temperatureImpact: 1.50, groundwaterImpact: -2.00, airQualityImpact: 30,
    waterWastageImpact: 12, contaminationImpact: 18, infrastructureStressImpact: 8, floodRiskImpact: 2,
    effect: "Industrial waste heat + groundwater extraction + stack emissions; heavy water consumption; toxic effluent"
  },
  stubble_burning: {
    temperatureImpact: 0.80, groundwaterImpact: -1.00, airQualityImpact: 50,
    waterWastageImpact: 0, contaminationImpact: 8, infrastructureStressImpact: 0, floodRiskImpact: 1,
    effect: "CO₂ + particulate release; destroys soil organic matter; ash runoff contaminates water bodies"
  },
  fireworks: {
    temperatureImpact: 0.20, groundwaterImpact: 0.00, airQualityImpact: 20,
    waterWastageImpact: 0, contaminationImpact: 2, infrastructureStressImpact: 0, floodRiskImpact: 0,
    effect: "Metal oxide + sulfur particulates; short-duration AQI spike; chemical fallout on soil"
  },
  sewage_treatment: {
    temperatureImpact: 0, groundwaterImpact: 1.50, airQualityImpact: -3,
    waterWastageImpact: -8, contaminationImpact: -22, infrastructureStressImpact: -6, floodRiskImpact: -4,
    effect: "Treats wastewater before discharge; dramatically reduces groundwater contamination; prevents sewage leakage"
  },
  water_tank: {
    temperatureImpact: -0.05, groundwaterImpact: 0.80, airQualityImpact: 0,
    waterWastageImpact: -10, contaminationImpact: -2, infrastructureStressImpact: -4, floodRiskImpact: -5,
    effect: "Rainwater harvesting reduces dependence on groundwater; reduces pipeline pressure stress; flood buffering"
  },
  cool_road: {
    temperatureImpact: -0.25, groundwaterImpact: 0.20, airQualityImpact: -2,
    waterWastageImpact: -1, contaminationImpact: -1, infrastructureStressImpact: -3, floodRiskImpact: -2,
    effect: "Reflective surface coating reduces heat absorption; cooler pavement reduces urban heat island"
  },
  rainfall_harvesting: {
    temperatureImpact: -0.08, groundwaterImpact: 2.50, airQualityImpact: -1,
    waterWastageImpact: -15, contaminationImpact: -4, infrastructureStressImpact: -5, floodRiskImpact: -10,
    effect: "Captures monsoon runoff; reduces flood risk; replenishes aquifers; decreases demand on treatment plants"
  },
};

function applyGeoMultipliers(
  type: string,
  profile: InterventionProfile,
  geoCtx?: {
    treeEffectivenessMultiplier?: number;
    permeablePavementEffectiveness?: number;
    groundwaterRechargePotential?: number;
    solarEffectiveness?: number;
    factoryImpactMultiplier?: number;
    heatIslandSeverity?: number;
  }
): InterventionProfile {
  if (!geoCtx) return profile;
  const p = { ...profile };
  const gwMult = geoCtx.groundwaterRechargePotential ?? 1;

  switch (type) {
    case "tree":
      p.temperatureImpact *= geoCtx.treeEffectivenessMultiplier ?? 1;
      p.groundwaterImpact *= gwMult;
      p.contaminationImpact *= geoCtx.treeEffectivenessMultiplier ?? 1;
      break;
    case "fountain":
      p.groundwaterImpact *= gwMult;
      break;
    case "permeable_pavement":
      p.temperatureImpact *= geoCtx.permeablePavementEffectiveness ?? 1;
      p.groundwaterImpact *= (geoCtx.permeablePavementEffectiveness ?? 1) * gwMult;
      p.floodRiskImpact *= geoCtx.permeablePavementEffectiveness ?? 1;
      break;
    case "solar":
      p.temperatureImpact *= geoCtx.solarEffectiveness ?? 1;
      break;
    case "green_roof":
      p.temperatureImpact *= Math.max(1.0, geoCtx.heatIslandSeverity ?? 1);
      p.groundwaterImpact *= gwMult;
      break;
    case "factory":
      p.temperatureImpact *= geoCtx.factoryImpactMultiplier ?? 1;
      p.groundwaterImpact *= geoCtx.factoryImpactMultiplier ?? 1;
      p.airQualityImpact *= Math.max(1, (geoCtx.factoryImpactMultiplier ?? 1) * 0.8);
      p.contaminationImpact *= geoCtx.factoryImpactMultiplier ?? 1;
      break;
    case "stubble_burning":
      p.groundwaterImpact *= 1 / Math.max(0.3, gwMult);
      p.airQualityImpact *= Math.max(1, geoCtx.heatIslandSeverity ?? 1);
      break;
    case "rainfall_harvesting":
      p.groundwaterImpact *= gwMult * 1.2;
      p.floodRiskImpact *= geoCtx.permeablePavementEffectiveness ?? 1;
      break;
  }
  return p;
}

function generateGeoAwareInsights(
  city: (typeof CITIES_DATA)[0],
  interventions: { type: string; count: number }[],
  tempDelta: number,
  gwDelta: number,
  riskDelta: number,
  aqiDelta: number,
  contaminationDelta: number,
  waterWastageDelta: number,
  floodRiskDelta: number,
  geoAdjusted: boolean,
  geoCtx?: { ndvi?: number; landUseClass?: string; waterBodyDistanceKm?: number; soilMoisturePercent?: number }
): string[] {
  const insights: string[] = [];
  const greenTypes = ["tree", "fountain", "solar", "green_roof", "permeable_pavement", "sewage_treatment", "water_tank", "cool_road", "rainfall_harvesting"];
  const harmfulTypes = ["factory", "stubble_burning", "fireworks"];
  const greenCount = interventions.filter(i => greenTypes.includes(i.type)).reduce((s, i) => s + i.count, 0);
  const harmfulCount = interventions.filter(i => harmfulTypes.includes(i.type)).reduce((s, i) => s + i.count, 0);
  const treeN = interventions.find(i => i.type === "tree")?.count ?? 0;
  const fountainN = interventions.find(i => i.type === "fountain")?.count ?? 0;
  const permeableN = interventions.find(i => i.type === "permeable_pavement")?.count ?? 0;
  const factoryN = interventions.find(i => i.type === "factory")?.count ?? 0;
  const stubbleN = interventions.find(i => i.type === "stubble_burning")?.count ?? 0;
  const solarN = interventions.find(i => i.type === "solar")?.count ?? 0;
  const greenRoofN = interventions.find(i => i.type === "green_roof")?.count ?? 0;
  const sewageN = interventions.find(i => i.type === "sewage_treatment")?.count ?? 0;
  const waterTankN = interventions.find(i => i.type === "water_tank")?.count ?? 0;
  const coolRoadN = interventions.find(i => i.type === "cool_road")?.count ?? 0;
  const rainfallN = interventions.find(i => i.type === "rainfall_harvesting")?.count ?? 0;

  const popM = (city.population / 1e6).toFixed(1);
  const ndvi = geoCtx?.ndvi;
  const waterKm = geoCtx?.waterBodyDistanceKm;
  const soilM = geoCtx?.soilMoisturePercent;

  const riskLabel = city.riskScore > 80 ? "critical" : city.riskScore > 60 ? "high" : "moderate";
  const gwLabel = city.groundwater < 25 ? "critically depleted" : city.groundwater < 40 ? "below sustainable level" : "moderate";
  const contaminLabel = city.contaminationLevel > 70 ? "severely contaminated" : city.contaminationLevel > 50 ? "moderately contaminated" : "partially contaminated";

  if (treeN > 0) {
    const co2Seq = (treeN * 22).toFixed(0);
    const humidityBoost = (treeN * 2).toFixed(0);
    const ndviNote = ndvi !== undefined && ndvi < 0.2 ? ` Low NDVI (${ndvi.toFixed(2)}) makes tree effectiveness ${(1 + (0.25 - ndvi) * 2.5).toFixed(1)}× higher than average.` : "";
    insights.push(`🌳 Planting ${treeN} tree${treeN > 1 ? 's' : ''} near ${city.name} reduces heat island by ${Math.abs(tempDelta).toFixed(1)}°C via evapotranspiration. Humidity +${humidityBoost}%, CO₂ sequestration ~${co2Seq}kg/year. Root networks reduce soil contamination by ${Math.abs(contaminationDelta).toFixed(0)} index points.${ndviNote}`);
  }

  if (sewageN > 0) {
    const sewagePct = (sewageN * 22).toFixed(0);
    const leakReduction = (sewageN * 18000).toLocaleString();
    insights.push(`🚰 ${sewageN} sewage treatment plant${sewageN > 1 ? 's' : ''} in ${city.name} treats wastewater before discharge — reducing groundwater contamination by ${Math.abs(contaminationDelta).toFixed(0)} points (currently ${contaminLabel} at ${city.contaminationLevel}/100). Estimated ${leakReduction} liters/day of untreated sewage eliminated. This addresses the root cause of ${city.name}'s infrastructure stress (currently ${city.infrastructureStress}/100).`);
  }

  if (waterTankN > 0) {
    const storageMl = (waterTankN * 50000).toLocaleString();
    insights.push(`🪣 ${waterTankN} rainwater harvesting tank${waterTankN > 1 ? 's' : ''} capture monsoon runoff in ${city.name} (rainfall: ${city.rainfall}mm/yr). Storage capacity: ~${storageMl} liters. Water wastage index improves by ${Math.abs(waterWastageDelta).toFixed(0)} points. Reduces dependence on depleted groundwater (${gwLabel} at ${city.groundwater}%).`);
  }

  if (rainfallN > 0) {
    insights.push(`🌧️ ${rainfallN} rainfall harvesting system${rainfallN > 1 ? 's' : ''} installed across ${city.name}. Flood risk reduced by ${Math.abs(floodRiskDelta).toFixed(0)} points from current score of ${city.floodRiskScore}/100. Aquifer recharge improves by +${gwDelta.toFixed(1)}%. Each system intercepts ~85,000 liters per monsoon season.`);
  }

  if (coolRoadN > 0) {
    insights.push(`🛣️ ${coolRoadN} cool road installation${coolRoadN > 1 ? 's' : ''} apply reflective coating to ${city.name}'s urban surface. Albedo increases from ~0.18 to ~0.35, reducing surface temperature by ${Math.abs(tempDelta).toFixed(1)}°C. Heat island intensity (currently ${city.heatIslandIntensity}°C above surroundings) decreases significantly in treated corridors.`);
  }

  if (fountainN > 0) {
    const waterNote = waterKm !== undefined ? ` Located ${waterKm.toFixed(0)}km from a water body — recharge efficiency is ${waterKm < 10 ? "high" : waterKm < 30 ? "moderate" : "low — deep bore recharge advised"}.` : "";
    insights.push(`⛲ ${fountainN} fountain${fountainN > 1 ? 's' : ''} create evaporative cooling zones in ${city.name} — a city with ${gwLabel} groundwater (${city.groundwater}%). Recharge improvement: +${gwDelta.toFixed(1)}% over 3 years.${waterNote}`);
  }

  if (permeableN > 0) {
    const rainNote = city.rainfall > 1000 ? `high rainfall zone (${city.rainfall}mm/yr) — excellent infiltration` : `low-rainfall zone — install at drain heads`;
    insights.push(`🪨 Permeable pavement at ${permeableN} site${permeableN > 1 ? 's' : ''} allows natural infiltration in ${city.name}'s ${rainNote}. Groundwater recharge: +${gwDelta.toFixed(1)}%. Flood risk reduced by ${Math.abs(floodRiskDelta).toFixed(0)} points. Surface contamination filtered before entering aquifer.`);
  }

  if (solarN > 0) {
    const uhiNote = city.heatIslandIntensity > 4 ? `UHI intensity (${city.heatIslandIntensity}°C) makes solar cooling especially impactful.` : "";
    insights.push(`☀️ ${solarN} solar installation${solarN > 1 ? 's' : ''} reduce grid stress (infra stress: ${city.infrastructureStress}/100 → ${Math.max(0, city.infrastructureStress - solarN * 2)}/100). ${uhiNote} AQI improves by ${Math.abs(aqiDelta).toFixed(0)} points as fossil generation decreases.`);
  }

  if (greenRoofN > 0) {
    insights.push(`🏠 ${greenRoofN} green roof${greenRoofN > 1 ? 's' : ''} in ${city.name} reduce cooling load by ~${(greenRoofN * 8).toFixed(0)}%. Storm water retention improves flood resilience by ${Math.abs(floodRiskDelta).toFixed(0)} points. Each roof sequesters ~4.5kg CO₂/m²/year.`);
  }

  if (factoryN > 0) {
    const popAffected = Math.round(city.population / 500000);
    insights.push(`🏭 ⚠ WARNING: ${factoryN} industrial unit${factoryN > 1 ? 's' : ''} in ${city.name} (pop. ${popM}M) adds +${tempDelta.toFixed(1)}°C heat, +${contaminationDelta.toFixed(0)} contamination points (→ ${Math.min(100, city.contaminationLevel + contaminationDelta).toFixed(0)}/100), and drains groundwater by ${Math.abs(gwDelta).toFixed(1)}%. AQI spikes +${aqiDelta.toFixed(0)} — impacts ${popAffected} lakh residents. Industrial effluent entering drainage adds ~${(factoryN * 25000).toLocaleString()} L/day untreated sewage.`);
  }

  if (stubbleN > 0) {
    const soilNote = soilM !== undefined && soilM < 15 ? ` Soil moisture critically low (${soilM.toFixed(1)}%) — burning worsens drought.` : "";
    insights.push(`🌾 🚨 CRITICAL: Stubble burning at ${stubbleN} location${stubbleN > 1 ? 's' : ''} near ${city.name} releases ~${(stubbleN * 2.3).toFixed(1)} tonnes PM2.5. AQI spikes +${aqiDelta.toFixed(0)}. Ash runoff contaminates groundwater by +${contaminationDelta.toFixed(0)} points. Soil organic layer destroyed — permanent recharge capacity reduction.${soilNote}`);
  }

  if (greenCount > 0 && harmfulCount > 0) {
    const offsetRatio = (greenCount / harmfulCount).toFixed(1);
    insights.push(`⚖️ Intervention balance: ${greenCount} beneficial : ${harmfulCount} harmful (${offsetRatio}:1 ratio). Need ${Math.max(0, harmfulCount * 3 - greenCount)} more green interventions to fully neutralize damage.`);
  }

  if (Math.abs(tempDelta) > 0.5 || Math.abs(gwDelta) > 2 || Math.abs(contaminationDelta) > 5) {
    const geoNote = geoAdjusted ? " (geo-adjusted: NDVI, soil moisture & water proximity applied)" : "";
    insights.push(`📊 Simulation summary: Temp ${tempDelta > 0 ? '+' : ''}${tempDelta.toFixed(1)}°C | Groundwater ${gwDelta > 0 ? '+' : ''}${gwDelta.toFixed(1)}% | Contamination ${contaminationDelta > 0 ? '+' : ''}${contaminationDelta.toFixed(0)} pts | Water Wastage ${waterWastageDelta > 0 ? '+' : ''}${waterWastageDelta.toFixed(0)} pts${geoNote}. By 2035, risk profile: ${Math.max(0, Math.min(100, city.riskScore + riskDelta)).toFixed(0)}/100.`);
  }

  if (insights.length === 0) {
    insights.push(`${city.name} baseline status — Risk: ${city.riskScore}/100 (${riskLabel}) | Groundwater: ${gwLabel} (${city.groundwater}%) | Contamination: ${city.contaminationLevel}/100 | Infrastructure Stress: ${city.infrastructureStress}/100. Deploy interventions on the map to simulate urban interventions.`);
    if (city.sewerageSystemHealth < 50) {
      insights.push(`🚰 Sewage infrastructure alert: ${city.name}'s sewerage health is ${city.sewerageSystemHealth}/100. Estimated ${Math.round(city.population * 0.003)} liters/day of untreated sewage reaches groundwater. Sewage treatment plants and permeable pavements are priority interventions.`);
    }
    if (city.waterWastageIndex > 60) {
      insights.push(`💧 Water wastage is critical in ${city.name} (index: ${city.waterWastageIndex}/100). ~${Math.round(city.population * 180 / 1000)}M liters/day wasted through leaking pipes, overuse, and poor infrastructure. Rainwater harvesting and water tanks could reduce this by 30%.`);
    }
  }

  return insights;
}

router.post("/simulation/calculate", (req, res) => {
  const body = CalculateSimulationBody.parse(req.body);
  const city = CITIES_DATA.find((c) => c.id === body.cityId);

  if (!city) {
    res.status(404).json({ error: "City not found" });
    return;
  }

  const geoCtx = body.geoContext;
  const geoAdjusted = !!geoCtx;

  let tempDelta = 0;
  let gwDelta = 0;
  let aqiDelta = 0;
  let waterWastageDelta = 0;
  let contaminationDelta = 0;
  let infrastructureStressDelta = 0;
  let floodRiskDelta = 0;

  const countedByType: Record<string, number> = {};
  for (const intervention of body.interventions) {
    const count = intervention.count ?? 1;
    const baseProfile = BASE_EFFECTS[intervention.type];
    if (!baseProfile) continue;

    const profile = applyGeoMultipliers(intervention.type, baseProfile, geoCtx ?? undefined);
    tempDelta += profile.temperatureImpact * count;
    gwDelta += profile.groundwaterImpact * count;
    aqiDelta += profile.airQualityImpact * count;
    waterWastageDelta += profile.waterWastageImpact * count;
    contaminationDelta += profile.contaminationImpact * count;
    infrastructureStressDelta += profile.infrastructureStressImpact * count;
    floodRiskDelta += profile.floodRiskImpact * count;
    countedByType[intervention.type] = (countedByType[intervention.type] ?? 0) + count;
  }

  tempDelta = Math.max(-15, Math.min(15, tempDelta));
  gwDelta = Math.max(-50, Math.min(50, gwDelta));
  waterWastageDelta = Math.max(-60, Math.min(60, waterWastageDelta));
  contaminationDelta = Math.max(-80, Math.min(80, contaminationDelta));
  infrastructureStressDelta = Math.max(-50, Math.min(50, infrastructureStressDelta));
  floodRiskDelta = Math.max(-60, Math.min(60, floodRiskDelta));
  const riskDelta = tempDelta * 2.5 - gwDelta * 0.8 + aqiDelta * 0.2 + contaminationDelta * 0.3;

  // Sewage leakage rate: higher contamination + lower sewage health = more leakage
  const projectedContamination = Math.max(0, Math.min(100, city.contaminationLevel + contaminationDelta));
  const sewageLeakageRate = Math.max(0,
    (city.population * 0.002) * (projectedContamination / 100) * (1 - city.sewerageSystemHealth / 200)
  );

  const breakdownEntries = Object.entries(countedByType).map(([type, count]) => {
    const base = BASE_EFFECTS[type]!;
    const adj = applyGeoMultipliers(type, base, geoCtx ?? undefined);
    return {
      type,
      effect: base.effect,
      temperatureImpact: parseFloat((adj.temperatureImpact * count).toFixed(2)),
      groundwaterImpact: parseFloat((adj.groundwaterImpact * count).toFixed(2)),
      contaminationImpact: parseFloat((adj.contaminationImpact * count).toFixed(2)),
      waterWastageImpact: parseFloat((adj.waterWastageImpact * count).toFixed(2)),
    };
  });

  const interventionCounted = Object.entries(countedByType).map(([type, count]) => ({ type, count }));
  const insights = generateGeoAwareInsights(
    city, interventionCounted, tempDelta, gwDelta, riskDelta, aqiDelta,
    contaminationDelta, waterWastageDelta, floodRiskDelta,
    geoAdjusted,
    geoCtx ? { ndvi: geoCtx.ndvi, landUseClass: geoCtx.landUseClass, waterBodyDistanceKm: geoCtx.waterBodyDistanceKm, soilMoisturePercent: geoCtx.soilMoisturePercent } : undefined
  );

  const result = CalculateSimulationResponse.parse({
    cityId: body.cityId,
    temperatureDelta: parseFloat(tempDelta.toFixed(2)),
    groundwaterDelta: parseFloat(gwDelta.toFixed(2)),
    riskScoreDelta: parseFloat(riskDelta.toFixed(2)),
    airQualityDelta: parseFloat(aqiDelta.toFixed(2)),
    projectedTemperature: parseFloat((city.temperature + tempDelta).toFixed(1)),
    projectedGroundwater: parseFloat(Math.max(0, Math.min(100, city.groundwater + gwDelta)).toFixed(1)),
    projectedRiskScore: parseFloat(Math.max(0, Math.min(100, city.riskScore + riskDelta)).toFixed(1)),
    waterWastageDelta: parseFloat(waterWastageDelta.toFixed(2)),
    contaminationDelta: parseFloat(contaminationDelta.toFixed(2)),
    infrastructureStressDelta: parseFloat(infrastructureStressDelta.toFixed(2)),
    floodRiskDelta: parseFloat(floodRiskDelta.toFixed(2)),
    sewageLeakageRate: parseFloat(sewageLeakageRate.toFixed(0)),
    aiInsights: insights,
    interventionBreakdown: breakdownEntries,
    geoAdjusted,
  });

  res.json(result);
});

// Auto-optimize endpoint
router.post("/simulation/auto-optimize", (req, res) => {
  const { cityId, priority = "balanced", maxInterventions = 8 } = req.body;
  const city = CITIES_DATA.find((c) => c.id === cityId);
  if (!city) {
    res.status(404).json({ error: "City not found" });
    return;
  }

  const recommendations: { type: string; count: number; reason: string; priority: number }[] = [];

  // Determine weights based on priority
  const weights = {
    temperature: priority === "temperature" ? 3 : priority === "balanced" ? 1 : 0.5,
    groundwater: priority === "groundwater" ? 3 : priority === "balanced" ? 1 : 0.5,
    air_quality: priority === "air_quality" ? 3 : priority === "balanced" ? 1 : 0.5,
    water_contamination: priority === "water_contamination" ? 3 : priority === "balanced" ? 1 : 0.5,
  };

  let priorityOrder = 1;

  // Sewage treatment — critical if contamination is high
  if (city.contaminationLevel > 55) {
    const count = Math.min(3, Math.ceil(city.contaminationLevel / 30));
    recommendations.push({
      type: "sewage_treatment", count,
      reason: `Groundwater contamination at ${city.contaminationLevel}/100 — ${count} treatment plants eliminate ~${(count * 18000).toLocaleString()} L/day of untreated sewage discharge`,
      priority: priorityOrder++
    });
  }

  // Trees — always beneficial, more if high temperature
  if (city.temperature > 35 || city.heatIslandIntensity > 3.5) {
    const count = Math.min(4, Math.ceil(city.heatIslandIntensity));
    recommendations.push({
      type: "tree", count,
      reason: `Heat island intensity of ${city.heatIslandIntensity}°C demands urban greenery — ${count} tree clusters provide ${(count * 0.3).toFixed(1)}°C cooling and 22kg CO₂/tree/year`,
      priority: priorityOrder++
    });
  }

  // Rainfall harvesting — if flood risk or rainfall is high
  if (city.floodRiskScore > 50 || city.rainfall > 1000) {
    const count = Math.min(3, Math.ceil(city.floodRiskScore / 30));
    recommendations.push({
      type: "rainfall_harvesting", count,
      reason: `Flood risk score ${city.floodRiskScore}/100 with ${city.rainfall}mm/yr rainfall — ${count} harvesting systems capture monsoon runoff, reducing flood events and recharging aquifers`,
      priority: priorityOrder++
    });
  }

  // Permeable pavement — if groundwater is low
  if (city.groundwater < 40) {
    const count = Math.min(3, Math.ceil((40 - city.groundwater) / 10));
    recommendations.push({
      type: "permeable_pavement", count,
      reason: `Groundwater at ${city.groundwater}% (${city.groundwater < 25 ? "critical" : "below sustainable"}) — ${count} permeable pavement zones restore +${(count * 3).toFixed(0)}% recharge and filter surface contaminants`,
      priority: priorityOrder++
    });
  }

  // Solar — if infrastructure stress or AQI is high
  if (city.infrastructureStress > 70 || city.airQualityIndex > 200) {
    const count = Math.min(2, Math.ceil(city.airQualityIndex / 150));
    recommendations.push({
      type: "solar", count,
      reason: `AQI at ${city.airQualityIndex} (hazardous) and grid stress ${city.infrastructureStress}/100 — ${count} solar installations reduce fossil power dependency and cut AQI by ${(count * 2).toFixed(0)} points`,
      priority: priorityOrder++
    });
  }

  // Water tank — if water wastage is high
  if (city.waterWastageIndex > 55) {
    const count = Math.min(2, Math.ceil(city.waterWastageIndex / 50));
    recommendations.push({
      type: "water_tank", count,
      reason: `Water wastage index at ${city.waterWastageIndex}/100 — ${count} rooftop tank systems save ~${(count * 50000).toLocaleString()}L/day and reduce pipeline stress`,
      priority: priorityOrder++
    });
  }

  // Cool roads — if high temperature / skyscraper density
  if (city.temperature > 38 || city.skyskraperDensity > 45) {
    recommendations.push({
      type: "cool_road", count: 2,
      reason: `Urban temperature ${city.temperature}°C with ${city.skyskraperDensity}% high-rise density creates severe heat corridors — reflective road surfaces reduce surface temp by 0.5°C`,
      priority: priorityOrder++
    });
  }

  // Green roofs — if skyscraper density is high
  if (city.skyskraperDensity > 40) {
    recommendations.push({
      type: "green_roof", count: 2,
      reason: `${city.skyskraperDensity}% skyscraper density creates rooftop heat absorption — green roofs on tall buildings reduce UHI, add stormwater retention, and sequester carbon`,
      priority: priorityOrder++
    });
  }

  // Cap at maxInterventions
  const finalRecs = recommendations.slice(0, maxInterventions);

  // Compute projected impact
  let projTempDelta = 0, projGwDelta = 0, projRiskDelta = 0, projContamDelta = 0;
  for (const rec of finalRecs) {
    const profile = BASE_EFFECTS[rec.type];
    if (!profile) continue;
    projTempDelta += profile.temperatureImpact * rec.count;
    projGwDelta += profile.groundwaterImpact * rec.count;
    projContamDelta += profile.contaminationImpact * rec.count;
  }
  projRiskDelta = projTempDelta * 2.5 - projGwDelta * 0.8 + projContamDelta * 0.3;

  const rationale = `AI analysis of ${city.name} (Risk: ${city.riskScore}/100, Contamination: ${city.contaminationLevel}/100, Infra Stress: ${city.infrastructureStress}/100) identified ${finalRecs.length} priority interventions targeting ${priority === "balanced" ? "overall urban resilience" : priority.replace(/_/g, " ")}. These selections optimize the cost-to-impact ratio based on city-specific climate variables.`;

  res.json({
    cityId,
    recommendedInterventions: finalRecs,
    rationale,
    projectedImpact: {
      temperatureDelta: parseFloat(projTempDelta.toFixed(2)),
      groundwaterDelta: parseFloat(projGwDelta.toFixed(2)),
      riskScoreDelta: parseFloat(projRiskDelta.toFixed(2)),
      contaminationDelta: parseFloat(projContamDelta.toFixed(2)),
    }
  });
});

export default router;
