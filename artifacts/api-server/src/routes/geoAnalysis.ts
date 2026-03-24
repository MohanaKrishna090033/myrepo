import { Router, type IRouter } from "express";
import { analyzeGeoLocation } from "../lib/geoIntelligence.js";

const router: IRouter = Router();

// Simple in-memory cache to avoid hammering Open-Meteo on every drag
const cache = new Map<string, { data: Awaited<ReturnType<typeof analyzeGeoLocation>>; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

router.get("/geo-analysis/:lat/:lng", async (req, res) => {
  const lat = parseFloat(req.params["lat"] ?? "20");
  const lng = parseFloat(req.params["lng"] ?? "78");

  if (isNaN(lat) || isNaN(lng) || lat < 6 || lat > 38 || lng < 67 || lng > 100) {
    res.status(400).json({ error: "Coordinates out of India bounding box (lat 6–38, lng 67–100)" });
    return;
  }

  // Round to 2 decimal places for cache key (~1.1km grid)
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    res.setHeader("X-Cache", "HIT");
    res.json(cached.data);
    return;
  }

  try {
    const analysis = await analyzeGeoLocation(lat, lng);
    cache.set(key, { data: analysis, ts: Date.now() });
    // Prune cache if it gets large
    if (cache.size > 500) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) cache.delete(oldest[0]);
    }
    res.setHeader("X-Cache", "MISS");
    res.json(analysis);
  } catch (err) {
    req.log.error({ err }, "Geo analysis failed");
    res.status(500).json({ error: "Geo analysis failed", details: String(err) });
  }
});

export default router;
