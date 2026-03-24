import { Router, type IRouter } from "express";
import { CalculateSimulationBody, CalculateSimulationResponse } from "@workspace/api-zod";
import { CITIES_DATA } from "./cities.js";

const router: IRouter = Router();

interface InterventionProfile {
  temperatureImpact: number;
  groundwaterImpact: number;
  airQualityImpact: number;
  effect: string;
}

const BASE_EFFECTS: Record<string, InterventionProfile> = {
  tree:                { temperatureImpact: -0.30, groundwaterImpact: 0.50,  airQualityImpact: -5,  effect: "Shade + evapotranspiration cooling; roots enhance groundwater recharge" },
  fountain:            { temperatureImpact: -0.15, groundwaterImpact: 2.00,  airQualityImpact: -3,  effect: "Evaporative cooling; managed recharge improves local water table" },
  solar:               { temperatureImpact: -0.10, groundwaterImpact: 0.00,  airQualityImpact: -2,  effect: "Reduces waste heat from conventional generation; no water impact" },
  green_roof:          { temperatureImpact: -0.40, groundwaterImpact: 0.30,  airQualityImpact: -4,  effect: "Insulation + evapotranspiration; mild stormwater retention" },
  permeable_pavement:  { temperatureImpact: -0.10, groundwaterImpact: 3.00,  airQualityImpact: -1,  effect: "Natural infiltration; excellent groundwater recharge, reduces runoff" },
  factory:             { temperatureImpact:  1.50, groundwaterImpact: -2.00, airQualityImpact: 30,  effect: "Industrial waste heat + groundwater extraction + stack emissions" },
  stubble_burning:     { temperatureImpact:  0.80, groundwaterImpact: -1.00, airQualityImpact: 50,  effect: "CO₂ + particulate release; destroys soil organic matter & moisture" },
  fireworks:           { temperatureImpact:  0.20, groundwaterImpact:  0.00, airQualityImpact: 20,  effect: "Metal oxide + sulfur particulates; short-duration AQI spike" },
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
      break;
    case "fountain":
      p.groundwaterImpact *= gwMult;
      break;
    case "permeable_pavement":
      p.temperatureImpact *= geoCtx.permeablePavementEffectiveness ?? 1;
      p.groundwaterImpact *= (geoCtx.permeablePavementEffectiveness ?? 1) * gwMult;
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
      break;
    case "stubble_burning":
      // Worse when soil is already dry / low recharge potential
      p.groundwaterImpact *= 1 / Math.max(0.3, gwMult);
      p.airQualityImpact *= Math.max(1, geoCtx.heatIslandSeverity ?? 1);
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
  geoAdjusted: boolean,
  geoCtx?: { ndvi?: number; landUseClass?: string; waterBodyDistanceKm?: number; soilMoisturePercent?: number }
): string[] {
  const insights: string[] = [];
  const greenTypes = ["tree", "fountain", "solar", "green_roof", "permeable_pavement"];
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

  const popM = (city.population / 1e6).toFixed(1);
  const ndvi = geoCtx?.ndvi;
  const lulc = geoCtx?.landUseClass;
  const waterKm = geoCtx?.waterBodyDistanceKm;
  const soilM = geoCtx?.soilMoisturePercent;

  // City baseline context
  const riskLabel = city.riskScore > 80 ? "critical" : city.riskScore > 60 ? "high" : "moderate";
  const gwLabel = city.groundwater < 25 ? "critically depleted" : city.groundwater < 40 ? "below sustainable level" : "moderate";

  // Tree insight
  if (treeN > 0) {
    const co2Seq = (treeN * 22).toFixed(0);
    const humidityBoost = (treeN * 2).toFixed(0);
    const ndviNote = ndvi !== undefined && ndvi < 0.2 ? ` This area's low NDVI (${ndvi.toFixed(2)}) makes tree effectiveness ${(1 + (0.25 - ndvi) * 2.5).toFixed(1)}× higher than average.` : "";
    insights.push(`🌳 Planting ${treeN} tree${treeN > 1 ? 's' : ''} near ${city.name} (${city.state}) could reduce the local heat island by ${Math.abs(tempDelta).toFixed(1)}°C through evapotranspiration and shade. Local humidity improves by ~${humidityBoost}%, sequestering ~${co2Seq}kg CO₂/year.${ndviNote}`);
  }

  // Fountain / water insight
  if (fountainN > 0) {
    const waterNote = waterKm !== undefined ? ` Located ${waterKm.toFixed(0)}km from a water body, recharge efficiency is ${waterKm < 10 ? "high (natural water table support)" : waterKm < 30 ? "moderate" : "low — deep bore recharge advised"}.` : "";
    insights.push(`⛲ ${fountainN} fountain${fountainN > 1 ? 's' : ''} create localized evaporative cooling zones in ${city.name} — a city with ${gwLabel} groundwater (${city.groundwater}%). Estimated recharge improvement: +${gwDelta.toFixed(1)}% over 3 years.${waterNote}`);
  }

  // Permeable pavement insight
  if (permeableN > 0) {
    const rainNote = city.rainfall > 1000 ? `high rainfall (${city.rainfall}mm/yr) zone — excellent infiltration conditions` : `low-rainfall (${city.rainfall}mm/yr) zone — install at high-runoff areas near drains`;
    insights.push(`🪨 Permeable pavement at ${permeableN} site${permeableN > 1 ? 's' : ''} allows natural infiltration in ${city.name}'s ${rainNote}. Projected groundwater recharge: +${gwDelta.toFixed(1)}%. Reduces flash flood risk by eliminating surface runoff.`);
  }

  // Solar insight
  if (solarN > 0) {
    const uhiNote = city.heatIslandIntensity > 4 ? `High urban heat island intensity (${city.heatIslandIntensity}°C above surroundings) makes cooling-offset from solar especially impactful.` : "";
    insights.push(`☀️ ${solarN} solar installation${solarN > 1 ? 's' : ''} reduce waste heat from conventional power by ${(solarN * 0.4).toFixed(1)}°C equivalent in ${city.name}. ${uhiNote} AQI improves by ${Math.abs(aqiDelta).toFixed(0)} points as fossil generation decreases.`);
  }

  // Green roof insight
  if (greenRoofN > 0) {
    insights.push(`🏠 ${greenRoofN} green roof${greenRoofN > 1 ? 's' : ''} in ${city.name} provide insulation that reduces building cooling load by ~${(greenRoofN * 8).toFixed(0)}%. Storm water retention improves by ${gwDelta.toFixed(1)}%, reducing drain overflow events.`);
  }

  // Factory insight
  if (factoryN > 0) {
    const popAffected = Math.round(city.population / 500000);
    const lulcNote = lulc === "Built-up" ? " Dense urban LULC classification amplifies industrial impact." : "";
    insights.push(`🏭 Warning: ${factoryN} industrial unit${factoryN > 1 ? 's' : ''} in ${city.name} (pop. ${popM}M) adds +${tempDelta.toFixed(1)}°C to an already ${riskLabel} risk zone. Particulate emissions could impact ${popAffected} lakh residents. AQI spikes by +${aqiDelta.toFixed(0)} to hazardous levels.${lulcNote}`);
  }

  // Stubble burning insight
  if (stubbleN > 0) {
    const soilNote = soilM !== undefined && soilM < 15 ? ` Soil moisture is already critically low (${soilM.toFixed(1)}%) — burning will exacerbate drought conditions.` : "";
    insights.push(`🌾 Critical Alert: Stubble burning at ${stubbleN} location${stubbleN > 1 ? 's' : ''} near ${city.name} releases ~${(stubbleN * 2.3).toFixed(1)} tonnes of PM2.5 particulates. AQI spikes by +${aqiDelta.toFixed(0)} to reach hazardous levels. Groundwater depleted by ${Math.abs(gwDelta).toFixed(1)}% as soil organic layer is destroyed.${soilNote}`);
  }

  // Combined effect insight
  if (greenCount > 0 && harmfulCount > 0) {
    const offsetRatio = (greenCount / harmfulCount).toFixed(1);
    insights.push(`⚖️ Offset ratio: ${greenCount} green : ${harmfulCount} harmful interventions (${offsetRatio}:1). You need ${harmfulCount * 3 - greenCount > 0 ? harmfulCount * 3 - greenCount : 'no additional'} more green interventions to fully neutralize the damage.`);
  }

  // Overall climate shift
  if (Math.abs(tempDelta) > 1.5 || Math.abs(gwDelta) > 5 || Math.abs(riskDelta) > 10) {
    const direction = riskDelta < 0 ? `improving resilience by ${Math.abs(riskDelta).toFixed(0)} risk points` : `increasing vulnerability by ${riskDelta.toFixed(0)} risk points`;
    const geoNote = geoAdjusted ? " (geo-adjusted based on local NDVI, soil moisture, and water body proximity)" : "";
    insights.push(`📊 Combined intervention effect: temperature ${tempDelta > 0 ? '+' : ''}${tempDelta.toFixed(1)}°C, groundwater ${gwDelta > 0 ? '+' : ''}${gwDelta.toFixed(1)}%, ${direction}${geoNote}. By 2035, ${city.name}'s risk profile ${riskDelta < 0 ? 'improves to' : 'worsens to'} ${Math.max(0, Math.min(100, city.riskScore + riskDelta)).toFixed(0)}/100.`);
  }

  // Fallback
  if (insights.length === 0) {
    insights.push(`${city.name} baseline: risk score ${city.riskScore}/100 (${riskLabel}), groundwater ${gwLabel} at ${city.groundwater}%. Place interventions on the map to simulate their impact.`);
    insights.push("💡 Trees are the most cost-effective urban cooling tool — a single mature tree cools ~0.5°C and sequesters 22kg CO₂/year. Start with high-density placement near city center.");
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

  const countedByType: Record<string, number> = {};
  for (const intervention of body.interventions) {
    const count = intervention.count ?? 1;
    const baseProfile = BASE_EFFECTS[intervention.type];
    if (!baseProfile) continue;

    const profile = applyGeoMultipliers(intervention.type, baseProfile, geoCtx ?? undefined);
    tempDelta += profile.temperatureImpact * count;
    gwDelta += profile.groundwaterImpact * count;
    aqiDelta += profile.airQualityImpact * count;
    countedByType[intervention.type] = (countedByType[intervention.type] ?? 0) + count;
  }

  tempDelta = Math.max(-15, Math.min(15, tempDelta));
  gwDelta = Math.max(-50, Math.min(50, gwDelta));
  const riskDelta = tempDelta * 2.5 - gwDelta * 0.8 + aqiDelta * 0.2;

  const breakdownEntries = Object.entries(countedByType).map(([type, count]) => {
    const base = BASE_EFFECTS[type]!;
    const adj = applyGeoMultipliers(type, base, geoCtx ?? undefined);
    return {
      type,
      effect: base.effect,
      temperatureImpact: parseFloat((adj.temperatureImpact * count).toFixed(2)),
      groundwaterImpact: parseFloat((adj.groundwaterImpact * count).toFixed(2)),
    };
  });

  const interventionCounted = Object.entries(countedByType).map(([type, count]) => ({ type, count }));
  const insights = generateGeoAwareInsights(
    city, interventionCounted, tempDelta, gwDelta, riskDelta, aqiDelta,
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
    aiInsights: insights,
    interventionBreakdown: breakdownEntries,
    geoAdjusted,
  });

  res.json(result);
});

export default router;
