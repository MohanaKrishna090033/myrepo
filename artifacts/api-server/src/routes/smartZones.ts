import { Router, type IRouter } from "express";
import { CITIES_DATA } from "./cities.js";

const router: IRouter = Router();

router.get("/smart-zones/:cityId", (req, res) => {
  const city = CITIES_DATA.find((c) => c.id === req.params["cityId"]);
  if (!city) {
    res.status(404).json({ error: "City not found" });
    return;
  }

  const zones: {
    id: string; name: string; type: string; lat: number; lng: number;
    radiusKm: number; severity: string; insight: string; recommendations: string[];
  }[] = [];

  const latOff = (n: number) => city.lat + n;
  const lngOff = (n: number) => city.lng + n;

  // High skyscraper / dense built-up zone
  if (city.skyskraperDensity > 40) {
    const severity = city.skyskraperDensity > 70 ? "critical" : city.skyskraperDensity > 55 ? "high" : "moderate";
    zones.push({
      id: `${city.id}_skyscraper`,
      name: `${city.name} CBD — High-Rise Zone`,
      type: "high_skyscraper_density",
      lat: latOff(0.02),
      lng: lngOff(0.02),
      radiusKm: 3.5,
      severity,
      insight: `${city.skyskraperDensity}% vertical density detected. Canyon effect amplifies heat by +${(city.skyskraperDensity * 0.04).toFixed(1)}°C. Low wind circulation traps pollutants (AQI impact: +${Math.round(city.skyskraperDensity * 0.8)}).`,
      recommendations: [
        "Install green roofs on high-rise buildings to offset heat absorption",
        "Apply cool road coatings on street canyons between skyscrapers",
        "Place vertical gardens / living walls on building facades",
        "Deploy shade trees at street level to break canyon airflow"
      ]
    });
  }

  // Low vegetation / heat island zone
  if (city.heatIslandIntensity > 3.0) {
    const severity = city.heatIslandIntensity > 5 ? "critical" : city.heatIslandIntensity > 4 ? "high" : "moderate";
    zones.push({
      id: `${city.id}_heat_island`,
      name: `${city.name} Industrial Fringe — Heat Island`,
      type: "heat_island",
      lat: latOff(-0.04),
      lng: lngOff(0.05),
      radiusKm: 4.0,
      severity,
      insight: `Urban heat island intensity: ${city.heatIslandIntensity}°C above rural surroundings. Surface temperature peaks at ${city.temperature + 3}°C in summer. This zone shows low vegetation index and high impervious surface coverage.`,
      recommendations: [
        `Plant ${Math.ceil(city.heatIslandIntensity * 50)} trees in this zone for immediate cooling`,
        "Convert abandoned lots to pocket parks and bioswales",
        "Apply reflective coating to all rooftops in this district",
        "Establish urban forest corridors connecting to nearby green areas"
      ]
    });
  }

  // Low vegetation zone
  zones.push({
    id: `${city.id}_low_veg`,
    name: `${city.name} Peri-Urban — Sparse Vegetation`,
    type: "low_vegetation",
    lat: latOff(0.06),
    lng: lngOff(-0.03),
    radiusKm: 5.0,
    severity: city.riskScore > 75 ? "high" : "moderate",
    insight: `Satellite analysis shows NDVI below 0.15 in this peri-urban fringe — classified as degraded scrubland. Low carbon sequestration (~${Math.round(city.riskScore * 30)} kg CO₂/ha/yr) and high erosion risk.`,
    recommendations: [
      "Mass plantation with native species (Neem, Peepal, Gulmohar)",
      "Create agroforestry buffers to generate rural income and green cover",
      "Establish community nurseries and tree adoption programs",
      `Target NDVI > 0.35 through ${Math.ceil(city.population / 50000)} tree plantation sites`
    ]
  });

  // Sewage / water contamination risk zone
  if (city.contaminationLevel > 45 || city.sewerageSystemHealth < 55) {
    const severity = city.contaminationLevel > 70 ? "critical" : city.contaminationLevel > 55 ? "high" : "moderate";
    zones.push({
      id: `${city.id}_sewage_risk`,
      name: `${city.name} Low-Income District — Sewage Risk`,
      type: "sewage_risk",
      lat: latOff(-0.03),
      lng: lngOff(-0.04),
      radiusKm: 3.0,
      severity,
      insight: `Sewerage system health: ${city.sewerageSystemHealth}/100. Estimated ${Math.round(city.population * 0.003).toLocaleString()} liters/day of untreated sewage leaks into soil and water bodies. Groundwater contamination index: ${city.contaminationLevel}/100.`,
      recommendations: [
        "Immediate: Install sewage treatment plants at outfall points",
        "Repair/replace collapsed sewer mains (estimated 40km replacement needed)",
        "Install real-time pipeline leak detection sensors",
        "Deploy permeable pavements to naturally filter surface contamination"
      ]
    });
  }

  // High runoff / flood zone
  if (city.floodRiskScore > 50 || city.rainfall > 1200) {
    const severity = city.floodRiskScore > 75 ? "critical" : city.floodRiskScore > 60 ? "high" : "moderate";
    zones.push({
      id: `${city.id}_flood_zone`,
      name: `${city.name} Riverside / Low-Lying — Flood Zone`,
      type: "flood_zone",
      lat: latOff(0.04),
      lng: lngOff(0.06),
      radiusKm: 4.5,
      severity,
      insight: `Flood risk score: ${city.floodRiskScore}/100. Rainfall: ${city.rainfall}mm/yr. Impervious surface coverage creates high runoff coefficient (~0.8). Last decade saw ${Math.round(city.floodRiskScore / 15)} major flood events causing severe damage.`,
      recommendations: [
        "Install rainfall harvesting systems across all rooftops in this zone",
        "Create wetland buffers and retention ponds at drainage outlets",
        "Upgrade stormwater drains to 2× current capacity",
        "Deploy permeable pavements on all non-arterial roads"
      ]
    });
  }

  // Industrial pollution zone
  if (city.airQualityIndex > 180) {
    zones.push({
      id: `${city.id}_industrial`,
      name: `${city.name} Industrial Corridor — Pollution Zone`,
      type: "industrial_zone",
      lat: latOff(-0.06),
      lng: lngOff(0.04),
      radiusKm: 5.5,
      severity: city.airQualityIndex > 250 ? "critical" : "high",
      insight: `AQI: ${city.airQualityIndex} — classified as Hazardous (PM2.5 > 150 μg/m³). Industrial cluster generates ~${Math.round(city.airQualityIndex * 2.5)} tonnes/day particulate matter. Wind dispersion radius: ~${Math.round(city.airQualityIndex * 0.05)}km.`,
      recommendations: [
        "Mandate ESP (Electrostatic Precipitators) on all industrial stacks",
        "Create 500m green buffer belt around industrial zones",
        "Install AQI monitoring stations at 1km intervals",
        "Deploy solar panels to reduce fossil fuel combustion"
      ]
    });
  }

  const summary = `Smart zone analysis of ${city.name} identified ${zones.length} critical zones requiring intervention. Priority areas: ${zones.filter(z => z.severity === "critical").map(z => z.name).join(", ") || "none at critical level, but " + zones.filter(z => z.severity === "high").map(z => z.name).join(", ")}. Total affected area: ~${zones.reduce((s, z) => s + Math.PI * z.radiusKm * z.radiusKm, 0).toFixed(0)} km².`;

  res.json({ cityId: city.id, zones, summary });
});

export default router;
