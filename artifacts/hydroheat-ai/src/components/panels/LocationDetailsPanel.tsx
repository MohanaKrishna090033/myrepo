import { motion, AnimatePresence } from 'framer-motion';
import { ThermometerSun, Droplets, Wind, CloudRain, AlertTriangle, Users } from 'lucide-react';
import { useSandbox } from '../../context/SandboxContext';
import { AnimatedNumber } from '../ui/animated-number';
import { FuturePredictionChart } from '../charts/FuturePredictionChart';

export function LocationDetailsPanel() {
  const { selectedCity, simulationResult, isSimulating } = useSandbox();

  return (
    <AnimatePresence>
      {selectedCity && (
        <motion.div 
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed left-4 top-[80px] bottom-[180px] w-[340px] z-[100] glass-panel-glow rounded-xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-primary/20 bg-primary/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ThermometerSun className="w-24 h-24 text-primary" />
            </div>
            <h2 className="text-2xl font-bold font-sans tracking-wide text-white relative z-10">{selectedCity.name}</h2>
            <div className="flex items-center gap-2 text-sm text-primary/80 font-mono mt-1 relative z-10">
              <span>{selectedCity.state}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {(selectedCity.population / 1000000).toFixed(1)}M</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Primary Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/30 border border-white/10 rounded-lg p-3 relative overflow-hidden group hover:border-orange-500/50 transition-colors">
                <div className="flex items-center gap-2 text-orange-400 mb-1">
                  <ThermometerSun className="w-4 h-4" />
                  <span className="text-xs font-mono uppercase">Temp</span>
                </div>
                <div className="text-3xl font-bold font-mono text-white">
                  <AnimatedNumber value={simulationResult?.projectedTemperature ?? selectedCity.temperature} decimals={1} suffix="°" />
                </div>
                {simulationResult && simulationResult.temperatureDelta !== 0 && (
                  <div className={`text-xs font-mono mt-1 ${simulationResult.temperatureDelta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {simulationResult.temperatureDelta > 0 ? '+' : ''}{simulationResult.temperatureDelta.toFixed(1)}°
                  </div>
                )}
                {isSimulating && <div className="absolute inset-0 bg-primary/10 animate-pulse" />}
              </div>

              <div className="bg-black/30 border border-white/10 rounded-lg p-3 relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
                <div className="flex items-center gap-2 text-cyan-400 mb-1">
                  <Droplets className="w-4 h-4" />
                  <span className="text-xs font-mono uppercase">Ground W.</span>
                </div>
                <div className="text-3xl font-bold font-mono text-white">
                  <AnimatedNumber value={simulationResult?.projectedGroundwater ?? selectedCity.groundwater} decimals={1} suffix="%" />
                </div>
                {simulationResult && simulationResult.groundwaterDelta !== 0 && (
                  <div className={`text-xs font-mono mt-1 ${simulationResult.groundwaterDelta < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {simulationResult.groundwaterDelta > 0 ? '+' : ''}{simulationResult.groundwaterDelta.toFixed(1)}%
                  </div>
                )}
                {isSimulating && <div className="absolute inset-0 bg-primary/10 animate-pulse" />}
              </div>
            </div>

            {/* Risk Gauge */}
            <div className="bg-black/30 border border-white/10 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2 text-white/70">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-mono uppercase">Climate Risk Index</span>
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  <AnimatedNumber value={simulationResult?.projectedRiskScore ?? selectedCity.riskScore} decimals={0} />/100
                </div>
              </div>
              
              <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 opacity-30" />
                <motion.div 
                  className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${simulationResult?.projectedRiskScore ?? selectedCity.riskScore}%` }}
                  transition={{ type: "spring", damping: 20 }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white shadow-[0_0_10px_#fff]" />
                </motion.div>
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 gap-3 text-sm font-mono">
              <div className="flex flex-col gap-1 bg-black/20 p-2 rounded border border-white/5">
                <span className="text-white/50 text-[10px] uppercase">UHI Intensity</span>
                <span className="text-red-300">+{selectedCity.heatIslandIntensity}°C</span>
              </div>
              <div className="flex flex-col gap-1 bg-black/20 p-2 rounded border border-white/5">
                <span className="text-white/50 text-[10px] uppercase">AQI</span>
                <span className={selectedCity.airQualityIndex > 200 ? 'text-red-400' : 'text-yellow-400'}>
                  {Math.round((simulationResult?.airQualityDelta ?? 0) + selectedCity.airQualityIndex)}
                </span>
              </div>
              <div className="flex flex-col gap-1 bg-black/20 p-2 rounded border border-white/5">
                <span className="text-white/50 text-[10px] uppercase flex items-center gap-1"><Wind className="w-3 h-3"/> Humidity</span>
                <span className="text-cyan-200">{selectedCity.humidity}%</span>
              </div>
              <div className="flex flex-col gap-1 bg-black/20 p-2 rounded border border-white/5">
                <span className="text-white/50 text-[10px] uppercase flex items-center gap-1"><CloudRain className="w-3 h-3"/> Rainfall</span>
                <span className="text-blue-300">{selectedCity.rainfall}mm</span>
              </div>
            </div>

            <FuturePredictionChart />

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
