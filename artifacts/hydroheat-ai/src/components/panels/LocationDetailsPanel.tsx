import { motion, AnimatePresence } from 'framer-motion';
import { ThermometerSun, Droplets, Wind, AlertTriangle, Users, Leaf, Waves, Layers, Satellite, Cloud, Loader2 } from 'lucide-react';
import { useSandbox } from '../../context/SandboxContext';
import { AnimatedNumber } from '../ui/animated-number';
import { FuturePredictionChart } from '../charts/FuturePredictionChart';

function NDVIBar({ value }: { value: number }) {
  const pct = Math.round(((value + 0.1) / 1.05) * 100);
  const color = value < 0.15 ? '#ef4444' : value < 0.30 ? '#f97316' : value < 0.50 ? '#eab308' : value < 0.70 ? '#84cc16' : '#22c55e';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-white/40 mb-1">
        <span>-0.1</span><span>NDVI</span><span>1.0</span>
      </div>
      <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-red-700/40 via-yellow-500/30 to-green-500/40 rounded-full" />
        <motion.div
          className="h-full rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', damping: 20 }}
          style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
        />
      </div>
    </div>
  );
}

function WaterBodyBadge({ name, type, distanceKm, influence }: { name: string; type: string; distanceKm: number; influence: string }) {
  const col = influence === 'High' ? 'border-cyan-400/50 text-cyan-300 bg-cyan-500/10' :
    influence === 'Moderate' ? 'border-blue-400/40 text-blue-300 bg-blue-500/10' :
    influence === 'Low' ? 'border-blue-900/40 text-blue-500 bg-blue-900/10' :
    'border-white/10 text-white/30 bg-black/20';
  return (
    <div className={`flex items-center justify-between rounded-lg border p-2.5 ${col}`}>
      <div className="flex items-center gap-2">
        <Waves className="w-3.5 h-3.5 shrink-0" />
        <div>
          <div className="text-xs font-bold leading-tight truncate max-w-[140px]" title={name}>{name}</div>
          <div className="text-[10px] opacity-60">{type}</div>
        </div>
      </div>
      <div className="text-right text-[10px]">
        <div className="font-mono font-bold">{distanceKm.toFixed(0)}km</div>
        <div className="opacity-60">{influence}</div>
      </div>
    </div>
  );
}

export function LocationDetailsPanel() {
  const { selectedCity, simulationResult, isSimulating, geoAnalysis, geoLoading } = useSandbox();

  if (!selectedCity) return null;

  const currentRisk = simulationResult?.projectedRiskScore ?? selectedCity.riskScore;
  const tempDelta = simulationResult?.temperatureDelta ?? 0;

  const feelsLike = geoAnalysis
    ? (geoAnalysis.realWeather.temperature + (geoAnalysis.realWeather.humidity > 70 ? 3 : -2)).toFixed(1)
    : (selectedCity.temperature + (selectedCity.humidity > 70 ? 3 : -2)).toFixed(0);
  const windSpeed = geoAnalysis ? geoAnalysis.realWeather.windSpeed.toFixed(0) : Math.round(8 + selectedCity.heatIslandIntensity * 2);
  const soilM = geoAnalysis ? geoAnalysis.realWeather.soilMoisturePercent : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: -400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -400, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed left-4 top-[80px] bottom-[180px] w-[360px] z-[100] glass-panel-glow rounded-xl flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-5 border-b border-primary/20 bg-primary/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <ThermometerSun className="w-32 h-32 text-primary" />
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <h2 className="text-3xl font-bold font-sans tracking-wide text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{selectedCity.name}</h2>
              <div className="flex items-center gap-2 text-sm text-primary/80 font-mono mt-1">
                <span>{selectedCity.state}</span>
                <span className="opacity-50">•</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {(selectedCity.population / 1000000).toFixed(1)}M</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {isSimulating && (
                <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/50 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-widest">Live</span>
                </div>
              )}
              {geoLoading && (
                <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/30 px-2 py-1 rounded-full">
                  <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Satellite</span>
                </div>
              )}
              {geoAnalysis && !geoLoading && (
                <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 px-2 py-1 rounded-full">
                  <Satellite className="w-3 h-3 text-green-400" />
                  <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest">Geo-Locked</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">

          {/* Primary Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`bg-black/40 border rounded-xl p-4 relative overflow-hidden transition-all duration-300 ${tempDelta !== 0 ? 'animate-flash border-orange-500/50' : 'border-white/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-orange-400">
                  <ThermometerSun className="w-4 h-4" />
                  <span className="text-xs font-mono uppercase font-bold tracking-wider">Temp</span>
                </div>
                {tempDelta !== 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tempDelta > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                    {tempDelta > 0 ? '↑' : '↓'} {Math.abs(tempDelta).toFixed(1)}°
                  </span>
                )}
              </div>
              <div className="text-4xl font-bold font-mono text-white tracking-tighter">
                <AnimatedNumber value={simulationResult?.projectedTemperature ?? selectedCity.temperature} decimals={1} suffix="°" />
              </div>
              {geoAnalysis && (
                <div className="text-[10px] font-mono text-white/40 mt-1">
                  Live: {geoAnalysis.realWeather.temperature.toFixed(1)}°C
                </div>
              )}
            </div>

            <div className={`bg-black/40 border rounded-xl p-4 relative overflow-hidden transition-all duration-300 ${(simulationResult?.groundwaterDelta ?? 0) !== 0 ? 'animate-flash border-cyan-500/50' : 'border-white/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Droplets className="w-4 h-4" />
                  <span className="text-xs font-mono uppercase font-bold tracking-wider">Ground W.</span>
                </div>
                {(simulationResult?.groundwaterDelta ?? 0) !== 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${(simulationResult?.groundwaterDelta ?? 0) < 0 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {(simulationResult?.groundwaterDelta ?? 0) > 0 ? '↑' : '↓'} {Math.abs(simulationResult?.groundwaterDelta ?? 0).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="text-4xl font-bold font-mono text-white tracking-tighter">
                <AnimatedNumber value={simulationResult?.projectedGroundwater ?? selectedCity.groundwater} decimals={1} suffix="%" />
              </div>
            </div>
          </div>

          {/* Risk Gauge */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-white/80">
                <AlertTriangle className={`w-4 h-4 ${currentRisk > 70 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`} />
                <span className="text-xs font-mono uppercase tracking-widest font-bold">Climate Risk</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                <AnimatedNumber value={currentRisk} decimals={0} />
                <span className="text-sm text-white/40">/100</span>
              </div>
            </div>
            <div className="h-4 w-full bg-black/80 rounded-full overflow-hidden relative border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 via-yellow-500/30 to-red-500/30" />
              <motion.div
                className="h-full relative"
                initial={{ width: 0 }}
                animate={{ width: `${currentRisk}%` }}
                transition={{ type: "spring", damping: 20 }}
                style={{ background: `linear-gradient(90deg, #22c55e 0%, #eab308 50%, #ef4444 100%)` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/50 blur-[2px]" />
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_#fff]" />
              </motion.div>
            </div>
          </div>

          {/* NDVI Vegetation Section */}
          {geoAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-black/30 border border-green-500/20 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-green-500/15 pb-2">
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-mono text-green-400 uppercase tracking-widest font-bold">NDVI Vegetation</span>
                </div>
                <span className="text-xs font-mono text-white/60">{geoAnalysis.ndvi.toFixed(3)}</span>
              </div>

              <NDVIBar value={geoAnalysis.ndvi} />

              <div className="flex justify-between items-center pt-1">
                <div>
                  <div className="text-[11px] text-white/80 font-bold">{geoAnalysis.ndviClass}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">Health: {geoAnalysis.ndviHealthScore}/100</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/40">Drought Index</div>
                  <div className="text-sm font-mono font-bold" style={{ color: geoAnalysis.droughtIndex > 60 ? '#ef4444' : geoAnalysis.droughtIndex > 35 ? '#f97316' : '#22c55e' }}>
                    {geoAnalysis.droughtIndex}/100
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Water Body Detection */}
          {geoAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-black/30 border border-blue-500/20 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-blue-500/15 pb-2">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-mono text-blue-400 uppercase tracking-widest font-bold">Water Bodies</span>
                </div>
                <span className="text-[10px] font-mono text-white/40">{geoAnalysis.waterBodyCount} within 100km</span>
              </div>

              {geoAnalysis.nearestWaterBody ? (
                <WaterBodyBadge
                  name={geoAnalysis.nearestWaterBody.name}
                  type={geoAnalysis.nearestWaterBody.type}
                  distanceKm={geoAnalysis.nearestWaterBody.distanceKm}
                  influence={geoAnalysis.nearestWaterBody.influenceLevel}
                />
              ) : (
                <div className="text-xs text-white/30 italic">No major water body detected within 100km</div>
              )}

              <div className="flex items-center gap-2">
                <div className="text-[10px] text-white/40">GW Recharge Potential:</div>
                <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-blue-400 transition-all duration-700"
                    style={{ width: `${(geoAnalysis.simulationModifiers.groundwaterRechargePotential * 100).toFixed(0)}%` }}
                  />
                </div>
                <div className="text-[10px] text-blue-300 font-mono font-bold">
                  {(geoAnalysis.simulationModifiers.groundwaterRechargePotential * 100).toFixed(0)}%
                </div>
              </div>
            </motion.div>
          )}

          {/* ISRO LULC Analysis */}
          {geoAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-black/30 border border-violet-500/20 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2 border-b border-violet-500/15 pb-2">
                <Layers className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-mono text-violet-400 uppercase tracking-widest font-bold">ISRO LULC Analysis</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-white/40">Land Use Class:</span>
                  <span className="text-white font-bold">{geoAnalysis.isroAnalysis.lulcClass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Sub-Class:</span>
                  <span className="text-white/70 text-right max-w-[180px] truncate" title={geoAnalysis.isroAnalysis.lulcSubClass}>{geoAnalysis.isroAnalysis.lulcSubClass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Soil Type:</span>
                  <span className="text-white/70 truncate max-w-[140px]" title={geoAnalysis.soilType}>{geoAnalysis.soilType.split(' (')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Surface Albedo:</span>
                  <span className="text-yellow-300">{geoAnalysis.isroAnalysis.surfaceAlbedo.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Heat Island:</span>
                  <span className={geoAnalysis.isroAnalysis.heatIslandCategory.includes('Severe') ? 'text-red-400' : geoAnalysis.isroAnalysis.heatIslandCategory.includes('High') ? 'text-orange-400' : 'text-green-400'}>
                    {geoAnalysis.isroAnalysis.heatIslandCategory}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Carbon Stock:</span>
                  <span className="text-green-300">{geoAnalysis.isroAnalysis.carbonSequestrationKgPerHa >= 1000 ? (geoAnalysis.isroAnalysis.carbonSequestrationKgPerHa / 1000).toFixed(0) + ' t/ha' : geoAnalysis.isroAnalysis.carbonSequestrationKgPerHa + ' kg/ha'}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Real Weather from Open-Meteo */}
          {geoAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <Cloud className="w-4 h-4 text-cyan-300/60" />
                <h3 className="text-xs font-mono text-white/50 uppercase tracking-[0.2em]">Live Weather · Open-Meteo</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-white/5">
                  <ThermometerSun className="w-5 h-5 text-orange-300" />
                  <div>
                    <div className="text-white/50 text-[10px] uppercase">Feels Like</div>
                    <div className="text-white font-bold">{feelsLike}°C</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-white/5">
                  <Wind className="w-5 h-5 text-cyan-200" />
                  <div>
                    <div className="text-white/50 text-[10px] uppercase">Wind</div>
                    <div className="text-white font-bold">{windSpeed} km/h</div>
                  </div>
                </div>
                {soilM !== null && (
                  <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-white/5">
                    <Droplets className="w-5 h-5 text-blue-300" />
                    <div>
                      <div className="text-white/50 text-[10px] uppercase">Soil Moisture</div>
                      <div className={`font-bold ${soilM < 15 ? 'text-red-400' : soilM < 30 ? 'text-yellow-400' : 'text-blue-300'}`}>{soilM.toFixed(1)}%</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-white/5">
                  <Cloud className="w-5 h-5 text-indigo-300" />
                  <div>
                    <div className="text-white/50 text-[10px] uppercase">Humidity</div>
                    <div className="text-white font-bold">{geoAnalysis.realWeather.humidity.toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Fallback weather when no geo data */}
          {!geoAnalysis && !geoLoading && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono text-primary/60 uppercase tracking-[0.2em] border-b border-primary/20 pb-2">Environment Status</h3>
              <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-white/5">
                  <ThermometerSun className="w-5 h-5 text-orange-300" />
                  <div>
                    <div className="text-white/50 text-[10px] uppercase">Feels Like</div>
                    <div className="text-white font-bold">{feelsLike}°C</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-white/5">
                  <Wind className="w-5 h-5 text-cyan-200" />
                  <div>
                    <div className="text-white/50 text-[10px] uppercase">Wind</div>
                    <div className="text-white font-bold">{windSpeed} km/h</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <FuturePredictionChart />

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
