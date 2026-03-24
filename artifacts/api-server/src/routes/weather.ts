import { Router, type IRouter } from "express";
import { GetWeatherResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const CONDITIONS = ["Clear Sky", "Partly Cloudy", "Mostly Cloudy", "Hazy", "Thunderstorms", "Dust Storm", "Fog"];
const WIND_DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

router.get("/weather/:lat/:lng", (req, res) => {
  const lat = parseFloat(req.params["lat"] ?? "20");
  const lng = parseFloat(req.params["lng"] ?? "79");

  const seed = Math.abs(lat * 1000 + lng * 100) % 100;
  const isHot = lat > 20 && lat < 30;
  const isCoastal = lng < 75 || lng > 85;

  const data = GetWeatherResponse.parse({
    lat,
    lng,
    temperature: parseFloat((20 + seed * 0.3 + (isHot ? 8 : 0)).toFixed(1)),
    humidity: parseFloat((40 + seed * 0.5 + (isCoastal ? 20 : 0)).toFixed(1)),
    windSpeed: parseFloat((5 + (seed % 20)).toFixed(1)),
    windDirection: WIND_DIRS[Math.floor(seed / 12) % WIND_DIRS.length]!,
    conditions: CONDITIONS[Math.floor(seed / 15) % CONDITIONS.length]!,
    uvIndex: parseFloat((3 + seed * 0.08).toFixed(1)),
    feelsLike: parseFloat((22 + seed * 0.25 + (isHot ? 6 : 0)).toFixed(1)),
    visibility: parseFloat((5 + seed * 0.1).toFixed(1)),
  });

  res.json(data);
});

export default router;
