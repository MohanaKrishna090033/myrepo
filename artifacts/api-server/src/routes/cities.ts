import { Router, type IRouter } from "express";
import { GetCitiesResponse, GetCityByIdResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const CITIES_DATA = [
  {
    id: "delhi", name: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090,
    temperature: 42, groundwater: 23, riskScore: 88, population: 32941000,
    heatIslandIntensity: 5.2, airQualityIndex: 285, humidity: 45, rainfall: 714,
    waterWastageIndex: 78, contaminationLevel: 72, infrastructureStress: 89,
    skyskraperDensity: 61, sustainabilityScore: 18, sewerageSystemHealth: 31,
    floodRiskScore: 62, populationDensity: 11320,
  },
  {
    id: "mumbai", name: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777,
    temperature: 35, groundwater: 41, riskScore: 65, population: 20667656,
    heatIslandIntensity: 3.8, airQualityIndex: 187, humidity: 78, rainfall: 2167,
    waterWastageIndex: 54, contaminationLevel: 48, infrastructureStress: 82,
    skyskraperDensity: 74, sustainabilityScore: 35, sewerageSystemHealth: 52,
    floodRiskScore: 85, populationDensity: 20680,
  },
  {
    id: "bangalore", name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946,
    temperature: 31, groundwater: 52, riskScore: 55, population: 13193000,
    heatIslandIntensity: 2.9, airQualityIndex: 143, humidity: 65, rainfall: 970,
    waterWastageIndex: 42, contaminationLevel: 35, infrastructureStress: 68,
    skyskraperDensity: 52, sustainabilityScore: 48, sewerageSystemHealth: 61,
    floodRiskScore: 38, populationDensity: 4381,
  },
  {
    id: "chennai", name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707,
    temperature: 38, groundwater: 35, riskScore: 72, population: 10971000,
    heatIslandIntensity: 4.1, airQualityIndex: 168, humidity: 72, rainfall: 1400,
    waterWastageIndex: 62, contaminationLevel: 58, infrastructureStress: 74,
    skyskraperDensity: 44, sustainabilityScore: 30, sewerageSystemHealth: 45,
    floodRiskScore: 72, populationDensity: 7088,
  },
  {
    id: "kolkata", name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639,
    temperature: 36, groundwater: 45, riskScore: 68, population: 15134000,
    heatIslandIntensity: 3.5, airQualityIndex: 215, humidity: 80, rainfall: 1856,
    waterWastageIndex: 66, contaminationLevel: 63, infrastructureStress: 76,
    skyskraperDensity: 38, sustainabilityScore: 26, sewerageSystemHealth: 38,
    floodRiskScore: 88, populationDensity: 24252,
  },
  {
    id: "hyderabad", name: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867,
    temperature: 37, groundwater: 38, riskScore: 74, population: 10004000,
    heatIslandIntensity: 3.7, airQualityIndex: 156, humidity: 58, rainfall: 812,
    waterWastageIndex: 58, contaminationLevel: 52, infrastructureStress: 71,
    skyskraperDensity: 49, sustainabilityScore: 33, sewerageSystemHealth: 48,
    floodRiskScore: 54, populationDensity: 18480,
  },
  {
    id: "ahmedabad", name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714,
    temperature: 44, groundwater: 19, riskScore: 91, population: 8253000,
    heatIslandIntensity: 5.8, airQualityIndex: 245, humidity: 32, rainfall: 782,
    waterWastageIndex: 85, contaminationLevel: 78, infrastructureStress: 88,
    skyskraperDensity: 35, sustainabilityScore: 14, sewerageSystemHealth: 29,
    floodRiskScore: 31, populationDensity: 8214,
  },
  {
    id: "pune", name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567,
    temperature: 33, groundwater: 58, riskScore: 48, population: 7276000,
    heatIslandIntensity: 2.5, airQualityIndex: 124, humidity: 62, rainfall: 722,
    waterWastageIndex: 38, contaminationLevel: 28, infrastructureStress: 55,
    skyskraperDensity: 41, sustainabilityScore: 55, sewerageSystemHealth: 65,
    floodRiskScore: 42, populationDensity: 5762,
  },
  {
    id: "jaipur", name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873,
    temperature: 43, groundwater: 15, riskScore: 93, population: 3909000,
    heatIslandIntensity: 6.1, airQualityIndex: 267, humidity: 28, rainfall: 626,
    waterWastageIndex: 88, contaminationLevel: 82, infrastructureStress: 91,
    skyskraperDensity: 22, sustainabilityScore: 11, sewerageSystemHealth: 24,
    floodRiskScore: 19, populationDensity: 6636,
  },
  {
    id: "surat", name: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311,
    temperature: 39, groundwater: 31, riskScore: 77, population: 7360000,
    heatIslandIntensity: 4.2, airQualityIndex: 198, humidity: 70, rainfall: 1143,
    waterWastageIndex: 69, contaminationLevel: 66, infrastructureStress: 78,
    skyskraperDensity: 31, sustainabilityScore: 25, sewerageSystemHealth: 36,
    floodRiskScore: 65, populationDensity: 13200,
  },
  {
    id: "lucknow", name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462,
    temperature: 40, groundwater: 27, riskScore: 82, population: 3681000,
    heatIslandIntensity: 4.8, airQualityIndex: 237, humidity: 52, rainfall: 893,
    waterWastageIndex: 76, contaminationLevel: 71, infrastructureStress: 84,
    skyskraperDensity: 28, sustainabilityScore: 19, sewerageSystemHealth: 33,
    floodRiskScore: 58, populationDensity: 2468,
  },
  {
    id: "chandigarh", name: "Chandigarh", state: "Punjab", lat: 30.7333, lng: 76.7794,
    temperature: 36, groundwater: 48, riskScore: 52, population: 1158000,
    heatIslandIntensity: 2.8, airQualityIndex: 132, humidity: 55, rainfall: 1113,
    waterWastageIndex: 34, contaminationLevel: 22, infrastructureStress: 44,
    skyskraperDensity: 18, sustainabilityScore: 62, sewerageSystemHealth: 72,
    floodRiskScore: 35, populationDensity: 9252,
  },
  {
    id: "bhopal", name: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126,
    temperature: 38, groundwater: 44, riskScore: 63, population: 2415000,
    heatIslandIntensity: 3.3, airQualityIndex: 167, humidity: 57, rainfall: 1146,
    waterWastageIndex: 55, contaminationLevel: 48, infrastructureStress: 66,
    skyskraperDensity: 24, sustainabilityScore: 38, sewerageSystemHealth: 52,
    floodRiskScore: 46, populationDensity: 3433,
  },
  {
    id: "nagpur", name: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882,
    temperature: 41, groundwater: 33, riskScore: 78, population: 2984000,
    heatIslandIntensity: 4.5, airQualityIndex: 182, humidity: 44, rainfall: 1205,
    waterWastageIndex: 64, contaminationLevel: 57, infrastructureStress: 72,
    skyskraperDensity: 27, sustainabilityScore: 28, sewerageSystemHealth: 44,
    floodRiskScore: 44, populationDensity: 2405,
  },
  {
    id: "patna", name: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376,
    temperature: 37, groundwater: 62, riskScore: 60, population: 2684000,
    heatIslandIntensity: 3.2, airQualityIndex: 221, humidity: 69, rainfall: 1198,
    waterWastageIndex: 61, contaminationLevel: 55, infrastructureStress: 69,
    skyskraperDensity: 15, sustainabilityScore: 31, sewerageSystemHealth: 35,
    floodRiskScore: 79, populationDensity: 1803,
  },
];

router.get("/cities", (_req, res) => {
  const data = GetCitiesResponse.parse(CITIES_DATA);
  res.json(data);
});

router.get("/cities/:cityId", (req, res) => {
  const city = CITIES_DATA.find((c) => c.id === req.params["cityId"]);
  if (!city) {
    res.status(404).json({ error: "City not found" });
    return;
  }
  const data = GetCityByIdResponse.parse(city);
  res.json(data);
});

export default router;
export { CITIES_DATA };
