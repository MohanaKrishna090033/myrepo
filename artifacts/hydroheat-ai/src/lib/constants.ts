import type { City, InterventionType } from "@workspace/api-client-react";

export const HARDCODED_CITIES: City[] = [
  { id: "delhi", name: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090, temperature: 42, groundwater: 23, riskScore: 88, population: 32941000, heatIslandIntensity: 5.2, airQualityIndex: 285, humidity: 45, rainfall: 714 },
  { id: "mumbai", name: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777, temperature: 35, groundwater: 41, riskScore: 65, population: 20667656, heatIslandIntensity: 3.8, airQualityIndex: 187, humidity: 78, rainfall: 2167 },
  { id: "bangalore", name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, temperature: 31, groundwater: 52, riskScore: 55, population: 13193000, heatIslandIntensity: 2.9, airQualityIndex: 143, humidity: 65, rainfall: 970 },
  { id: "chennai", name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, temperature: 38, groundwater: 35, riskScore: 72, population: 10971000, heatIslandIntensity: 4.1, airQualityIndex: 168, humidity: 72, rainfall: 1400 },
  { id: "kolkata", name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, temperature: 36, groundwater: 45, riskScore: 68, population: 15134000, heatIslandIntensity: 3.5, airQualityIndex: 215, humidity: 80, rainfall: 1856 },
  { id: "hyderabad", name: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867, temperature: 37, groundwater: 38, riskScore: 74, population: 10004000, heatIslandIntensity: 3.7, airQualityIndex: 156, humidity: 58, rainfall: 812 },
  { id: "ahmedabad", name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, temperature: 44, groundwater: 19, riskScore: 91, population: 8253000, heatIslandIntensity: 5.8, airQualityIndex: 245, humidity: 32, rainfall: 782 },
  { id: "pune", name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, temperature: 33, groundwater: 58, riskScore: 48, population: 7276000, heatIslandIntensity: 2.5, airQualityIndex: 124, humidity: 62, rainfall: 722 },
  { id: "jaipur", name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, temperature: 43, groundwater: 15, riskScore: 93, population: 3909000, heatIslandIntensity: 6.1, airQualityIndex: 267, humidity: 28, rainfall: 626 },
  { id: "surat", name: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311, temperature: 39, groundwater: 31, riskScore: 77, population: 7360000, heatIslandIntensity: 4.2, airQualityIndex: 198, humidity: 70, rainfall: 1143 },
  { id: "lucknow", name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, temperature: 40, groundwater: 27, riskScore: 82, population: 3681000, heatIslandIntensity: 4.8, airQualityIndex: 237, humidity: 52, rainfall: 893 },
  { id: "chandigarh", name: "Chandigarh", state: "Punjab", lat: 30.7333, lng: 76.7794, temperature: 36, groundwater: 48, riskScore: 52, population: 1158000, heatIslandIntensity: 2.8, airQualityIndex: 132, humidity: 55, rainfall: 1113 },
  { id: "bhopal", name: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, temperature: 38, groundwater: 44, riskScore: 63, population: 2415000, heatIslandIntensity: 3.3, airQualityIndex: 167, humidity: 57, rainfall: 1146 },
  { id: "nagpur", name: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882, temperature: 41, groundwater: 33, riskScore: 78, population: 2984000, heatIslandIntensity: 4.5, airQualityIndex: 182, humidity: 44, rainfall: 1205 },
  { id: "patna", name: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, temperature: 37, groundwater: 62, riskScore: 60, population: 2684000, heatIslandIntensity: 3.2, airQualityIndex: 221, humidity: 69, rainfall: 1198 }
];

export interface ToolDef {
  type: typeof InterventionType[keyof typeof InterventionType];
  name: string;
  icon: string;
  colorClass: string;
  impactDesc: string;
  category: 'positive' | 'negative';
}

export const TOOLS: ToolDef[] = [
  { type: 'tree', name: 'Trees', icon: '🌳', colorClass: 'text-green-400 border-green-500/50', impactDesc: '-0.3°C, +0.5% Ground Water', category: 'positive' },
  { type: 'fountain', name: 'Fountain', icon: '⛲', colorClass: 'text-cyan-400 border-cyan-500/50', impactDesc: '+2.0% Ground Water', category: 'positive' },
  { type: 'solar', name: 'Solar', icon: '☀️', colorClass: 'text-yellow-400 border-yellow-500/50', impactDesc: '-0.1°C', category: 'positive' },
  { type: 'green_roof', name: 'Green Roof', icon: '🏠', colorClass: 'text-emerald-400 border-emerald-500/50', impactDesc: '-0.4°C, +0.3% Ground Water', category: 'positive' },
  { type: 'permeable_pavement', name: 'Permeable', icon: '🪨', colorClass: 'text-stone-400 border-stone-500/50', impactDesc: '+3.0% Ground Water, -0.1°C', category: 'positive' },
  { type: 'factory', name: 'Factory', icon: '🏭', colorClass: 'text-red-400 border-red-500/50', impactDesc: '+1.5°C, -2.0% Ground Water', category: 'negative' },
  { type: 'stubble_burning', name: 'Stubble Fire', icon: '🌾', colorClass: 'text-orange-400 border-orange-500/50', impactDesc: '+0.8°C, -1.0% Ground Water', category: 'negative' },
  { type: 'fireworks', name: 'Fireworks', icon: '🎆', colorClass: 'text-rose-400 border-rose-500/50', impactDesc: '+0.2°C', category: 'negative' },
];

export const MAP_CENTER: [number, number] = [20.5937, 78.9629];
export const INITIAL_ZOOM = 5;
