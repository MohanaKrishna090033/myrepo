import { Router, type IRouter } from "express";
import { CalculateSimulationBody, CalculateSimulationResponse } from "@workspace/api-zod";
import { CITIES_DATA } from "./cities.js";

const router: IRouter = Router();

const INTERVENTION_EFFECTS: Record<string, { temperatureImpact: number; groundwaterImpact: number; airQualityImpact: number; effect: string }> = {
  tree: { temperatureImpact: -0.3, groundwaterImpact: 0.5, airQualityImpact: -5, effect: "Reduces temperature via shade and evapotranspiration, improves groundwater recharge" },
  fountain: { temperatureImpact: -0.15, groundwaterImpact: 2.0, airQualityImpact: -3, effect: "Increases local humidity, improves groundwater levels through managed recharge" },
  solar: { temperatureImpact: -0.1, groundwaterImpact: 0.0, airQualityImpact: -2, effect: "Reduces urban energy use and waste heat, no direct groundwater impact" },
  green_roof: { temperatureImpact: -0.4, groundwaterImpact: 0.3, airQualityImpact: -4, effect: "Significant cooling via insulation and evapotranspiration, minor groundwater improvement" },
  permeable_pavement: { temperatureImpact: -0.1, groundwaterImpact: 3.0, airQualityImpact: -1, effect: "Excellent groundwater recharge through natural infiltration, reduces surface runoff" },
  factory: { temperatureImpact: 1.5, groundwaterImpact: -2.0, airQualityImpact: 30, effect: "Increases local heat output, depletes groundwater, worsens air quality significantly" },
  stubble_burning: { temperatureImpact: 0.8, groundwaterImpact: -1.0, airQualityImpact: 50, effect: "Releases particulates and CO2, depletes soil moisture, severe AQI spike" },
  fireworks: { temperatureImpact: 0.2, groundwaterImpact: 0.0, airQualityImpact: 20, effect: "Short-term AQI spike from smoke and metallic particles" },
};

function generateInsights(
  cityName: string,
  interventions: { type: string; count: number }[],
  tempDelta: number,
  gwDelta: number,
  riskDelta: number,
  aqiDelta: number
): string[] {
  const insights: string[] = [];
  const greenCount = interventions.filter(i => ["tree", "fountain", "solar", "green_roof", "permeable_pavement"].includes(i.type)).reduce((s, i) => s + i.count, 0);
  const harmfulCount = interventions.filter(i => ["factory", "stubble_burning", "fireworks"].includes(i.type)).reduce((s, i) => s + i.count, 0);

  if (tempDelta < -1) {
    insights.push(`Your interventions could reduce ${cityName}'s temperature by ${Math.abs(tempDelta).toFixed(1)}°C — a significant improvement for urban comfort.`);
  } else if (tempDelta > 1) {
    insights.push(`Warning: The placed sources add ${tempDelta.toFixed(1)}°C to ${cityName}'s already high temperature. Consider adding trees or green roofs to offset.`);
  }

  if (gwDelta > 3) {
    insights.push(`Groundwater levels could rise by ${gwDelta.toFixed(1)}% — helping secure water supply for thousands of residents.`);
  } else if (gwDelta < -3) {
    insights.push(`Alert: Industrial activity is depleting groundwater by ${Math.abs(gwDelta).toFixed(1)}% — long-term water security is at risk.`);
  }

  if (aqiDelta > 30) {
    insights.push(`Air quality is deteriorating significantly (AQI +${aqiDelta.toFixed(0)}). Respiratory health risks are elevated, especially for children and elderly.`);
  } else if (aqiDelta < -5) {
    insights.push(`Green interventions are improving air quality (AQI ${aqiDelta.toFixed(0)}). Residents will experience cleaner air.`);
  }

  if (riskDelta < -10) {
    insights.push(`Overall climate risk score drops by ${Math.abs(riskDelta).toFixed(0)} points. ${cityName} is becoming more resilient to climate change.`);
  } else if (riskDelta > 10) {
    insights.push(`Climate risk is increasing. The current trajectory puts ${cityName}'s infrastructure and population at heightened risk by 2035.`);
  }

  if (greenCount > 5) {
    insights.push(`${greenCount} green interventions create a cascading cooling effect — each one amplifies the others through microclimate improvement.`);
  }

  if (harmfulCount > 0 && greenCount > 0) {
    insights.push(`Offset ratio is ${greenCount}:${harmfulCount} (green:harmful). You need at least ${harmfulCount * 3} more green interventions to neutralize the damage.`);
  }

  if (insights.length === 0) {
    insights.push(`${cityName} baseline data shows critical urban heat island intensity. Start placing green interventions to see the impact.`);
    insights.push("Trees are the most cost-effective urban cooling solution — a single mature tree can cool the surrounding area by up to 0.5°C.");
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

  let tempDelta = 0;
  let gwDelta = 0;
  let aqiDelta = 0;
  const interventionBreakdown = [];

  const countedByType: Record<string, number> = {};
  for (const intervention of body.interventions) {
    const count = intervention.count ?? 1;
    const effects = INTERVENTION_EFFECTS[intervention.type];
    if (!effects) continue;

    tempDelta += effects.temperatureImpact * count;
    gwDelta += effects.groundwaterImpact * count;
    aqiDelta += effects.airQualityImpact * count;
    countedByType[intervention.type] = (countedByType[intervention.type] ?? 0) + count;
  }

  tempDelta = Math.max(-15, Math.min(15, tempDelta));
  gwDelta = Math.max(-50, Math.min(50, gwDelta));
  const riskDelta = tempDelta * 2.5 - gwDelta * 0.8 + aqiDelta * 0.2;

  const breakdownEntries = Object.entries(countedByType).map(([type, count]) => {
    const effects = INTERVENTION_EFFECTS[type]!;
    return {
      type,
      effect: effects.effect,
      temperatureImpact: parseFloat((effects.temperatureImpact * count).toFixed(2)),
      groundwaterImpact: parseFloat((effects.groundwaterImpact * count).toFixed(2)),
    };
  });

  const interventionCounted = Object.entries(countedByType).map(([type, count]) => ({ type, count }));
  const insights = generateInsights(city.name, interventionCounted, tempDelta, gwDelta, riskDelta, aqiDelta);

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
  });

  res.json(result);
});

export default router;
