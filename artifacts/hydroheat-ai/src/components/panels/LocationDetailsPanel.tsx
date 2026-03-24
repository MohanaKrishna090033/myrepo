import { motion, AnimatePresence } from 'framer-motion';
import { ThermometerSun, Droplets, Wind, CloudRain, AlertTriangle, Users, Sun, Navigation } from 'lucide-react';
import { useSandbox } from '../../context/SandboxContext';
import { AnimatedNumber } from '../ui/animated-number';
import { FuturePredictionChart } from '../charts/FuturePredictionChart';

export function LocationDetailsPanel() {
  const { selectedCity, simulationResult, isSimulating } = useSandbox();

  if (!selectedCity) return null;

  const currentRisk = simulationResult?.projectedRiskScore ?? selectedCity.riskScore;
  const tempDelta = simulationResult?.temperatureDelta ?? 0;

  // Weather derivations
  const feelsLike = selectedCity.temperature + (selectedCity.humidity > 70 ? 3 : -2);
  const uvIndex = Math.max(1, Math.min(11, Math.round(10 - selectedCity.groundwater * 0.05)));
  const windSpeed = Math.round(8 + selectedCity.heatIslandIntensity * 2);
  const visibility = selectedCity.airQualityIndex > 200 ? "Poor (2.1km)" : "Moderate (5.4km)";

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
                <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {(selectedCity.population / 1000000).toFixed(1)}M</span>
              </div>
            </div>
            {isSimulating && (
              <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/50 px-2 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-widest">Live</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
          
          {/* Primary Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`bg-black/40 border rounded-xl p-4 relative overflow-hidden group transition-all duration-300 ${tempDelta !== 0 ? 'animate-flash border-orange-500/50' : 'border-white/10'}`}>
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
            </div>

            <div className={`bg-black/40 border rounded-xl p-4 relative overflow-hidden group transition-all duration-300 ${(simulationResult?.groundwaterDelta ?? 0) !== 0 ? 'animate-flash border-cyan-500/50' : 'border-white/10'}`}>
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
                style={{
                  background: `linear-gradient(90deg, #22c55e 0%, #eab308 50%, #ef4444 100%)`
                }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/50 blur-[2px]" />
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_#fff]" />
              </motion.div>
            </div>
          </div>

          {/* Weather & Environment Tab */}
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
                <Sun className="w-5 h-5 text-yellow-300" />
                <div>
                  <div className="text-white/50 text-[10px] uppercase">UV Index</div>
                  <div className="text-white font-bold">{uvIndex} <span className="text-[10px] font-normal opacity-50">/11</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-white/5">
                <Wind className="w-5 h-5 text-cyan-200" />
                <div>
                  <div className="text-white/50 text-[10px] uppercase">Wind</div>
                  <div className="text-white font-bold">{windSpeed} km/h</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-white/5">
                <Navigation className="w-5 h-5 text-indigo-300" />
                <div>
                  <div className="text-white/50 text-[10px] uppercase">Visibility</div>
                  <div className="text-white font-bold text-[11px] truncate" title={visibility}>{visibility}</div>
                </div>
              </div>
            </div>
          </div>

          <FuturePredictionChart />

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
