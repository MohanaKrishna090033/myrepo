import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, CheckCircle2, AlertOctagon, Terminal, Download, ShieldAlert, Satellite, Zap, MapPin, Sparkles, Play, X } from 'lucide-react';
import { useSandbox } from '../../context/SandboxContext';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

const TypewriterText = ({ text }: { text: string }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.substring(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [text]);
  return <span>{displayed}<span className="animate-pulse opacity-40">_</span></span>;
};

function GeoModifierBadge({ label, value, positive }: { label: string; value: number; positive: boolean }) {
  const color = positive ? (value > 1.3 ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-green-300/60 bg-green-900/10 border-green-900/20') : (value > 1.3 ? 'text-red-400 bg-red-500/10 border-red-500/30' : 'text-orange-300/60 bg-orange-900/10 border-orange-900/20');
  return (
    <div className={`flex items-center justify-between px-2 py-1.5 rounded border text-[10px] font-mono ${color}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-bold">{value.toFixed(1)}×</span>
    </div>
  );
}

const PRIORITY_OPTIONS = [
  { id: 'balanced', label: 'Balanced', icon: '⚖️', desc: 'Optimize all metrics' },
  { id: 'temperature', label: 'Temp', icon: '🌡️', desc: 'Minimize heat' },
  { id: 'groundwater', label: 'Water', icon: '💧', desc: 'Restore aquifers' },
  { id: 'air_quality', label: 'Air', icon: '🌫️', desc: 'Improve AQI' },
  { id: 'water_contamination', label: 'Clean', icon: '☣️', desc: 'Reduce contamination' },
];

export function AIInsightsPanel() {
  const {
    selectedCity, simulationResult, isSimulating, interventions, geoAnalysis, geoLoading,
    autoOptimizing, autoOptimizeResult, runAutoOptimize, applyAutoOptimize
  } = useSandbox();

  const [priority, setPriority] = useState<string>('balanced');
  const [showAutoPanel, setShowAutoPanel] = useState(false);

  const handleExport = () => {
    if (!selectedCity || !simulationResult) return;
    const lines = [
      `HYDROHEAT AI — CLIMATE SIMULATION REPORT`,
      `City: ${selectedCity.name}, ${selectedCity.state}`,
      `Population: ${(selectedCity.population / 1e6).toFixed(1)}M`,
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      ``,
      `=== SIMULATION RESULTS ===`,
      `Temperature Delta: ${simulationResult.temperatureDelta > 0 ? '+' : ''}${simulationResult.temperatureDelta.toFixed(2)}°C`,
      `Groundwater Delta: ${simulationResult.groundwaterDelta > 0 ? '+' : ''}${simulationResult.groundwaterDelta.toFixed(2)}%`,
      `Risk Score Delta: ${simulationResult.riskScoreDelta > 0 ? '+' : ''}${simulationResult.riskScoreDelta.toFixed(2)}`,
      `AQI Delta: ${simulationResult.airQualityDelta > 0 ? '+' : ''}${simulationResult.airQualityDelta.toFixed(2)}`,
      `Water Wastage Delta: ${simulationResult.waterWastageDelta > 0 ? '+' : ''}${simulationResult.waterWastageDelta.toFixed(2)} pts`,
      `Contamination Delta: ${simulationResult.contaminationDelta > 0 ? '+' : ''}${simulationResult.contaminationDelta.toFixed(2)} pts`,
      `Flood Risk Delta: ${simulationResult.floodRiskDelta > 0 ? '+' : ''}${simulationResult.floodRiskDelta.toFixed(2)} pts`,
      `Sewage Leakage Rate: ${(simulationResult.sewageLeakageRate / 1000).toFixed(0)}K L/day`,
      `Geo-Adjusted Physics: ${simulationResult.geoAdjusted ? 'Yes' : 'No'}`,
      ``,
      `=== AI INSIGHTS ===`,
      ...simulationResult.aiInsights.map((s: string, i: number) => `${i + 1}. ${s}`),
      ...(geoAnalysis ? [
        ``,
        `=== GEO-INTELLIGENCE (ISRO LULC) ===`,
        `NDVI: ${geoAnalysis.ndvi.toFixed(3)} (${geoAnalysis.ndviClass})`,
        `Land Use: ${geoAnalysis.isroAnalysis.lulcClass} → ${geoAnalysis.isroAnalysis.lulcSubClass}`,
        `Nearest Water: ${geoAnalysis.nearestWaterBody?.name ?? 'None'} (${geoAnalysis.nearestWaterBody?.distanceKm.toFixed(1) ?? '-'}km)`,
        `Drought Index: ${geoAnalysis.droughtIndex}/100`,
        `Data Source: ${geoAnalysis.dataSource}`,
      ] : [])
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hydroheat-${selectedCity.name.toLowerCase()}-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported!", { description: `${selectedCity.name} climate analysis downloaded.` });
  };

  const handleAutoOptimize = async () => {
    await runAutoOptimize(priority);
    toast.success("AI optimization complete!", { description: "Click 'Apply' to place recommended interventions." });
  };

  const handleApply = () => {
    applyAutoOptimize();
    setShowAutoPanel(false);
    toast.success("Interventions applied!", { description: "AI-recommended interventions placed on map." });
  };

  const confidence = geoAnalysis
    ? Math.min(98, 72 + interventions.length * 3 + (geoAnalysis.ndviHealthScore > 0 ? 8 : 0))
    : Math.min(90, 70 + interventions.length * 3);

  const currentRisk = simulationResult?.projectedRiskScore ?? selectedCity?.riskScore ?? 0;
  const riskColor = currentRisk > 70 ? 'text-red-500 bg-red-500/10 border-red-500/30' :
    currentRisk > 50 ? 'text-orange-400 bg-orange-500/10 border-orange-500/30' :
    'text-green-400 bg-green-500/10 border-green-500/30';

  const mods = geoAnalysis?.simulationModifiers;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-4 top-[80px] bottom-[180px] w-[360px] z-[100] glass-panel-glow rounded-xl flex flex-col overflow-hidden border-accent/30 shadow-[0_0_20px_rgba(255,0,128,0.15)]"
      >
        {/* Header */}
        <div className="p-4 border-b border-accent/20 bg-gradient-to-r from-accent/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <BrainCircuit className="w-7 h-7 text-accent" />
              {(isSimulating || autoOptimizing) && <div className="absolute inset-0 bg-accent rounded-full blur-md animate-pulse" />}
            </div>
            <div>
              <h2 className="text-xl font-bold font-sans tracking-wide text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">AI ANALYSIS</h2>
              <div className="text-[10px] font-mono text-accent/80 uppercase tracking-[0.2em]">Neural Projection Matrix</div>
            </div>
          </div>
          {selectedCity && (
            <div className={`px-2 py-1 rounded border flex items-center gap-1.5 ${riskColor}`}>
              <ShieldAlert className="w-3 h-3" />
              <span className="text-[10px] font-mono font-bold uppercase">
                {currentRisk > 70 ? 'HIGH' : currentRisk > 50 ? 'MOD' : 'LOW'}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 p-5 overflow-y-auto font-mono text-sm relative scrollbar-hide">
          {!selectedCity ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4 opacity-50">
              <Terminal className="w-12 h-12 mb-4" />
              <p className="animate-pulse">AWAITING TARGET SELECTION...</p>
              <div className="w-full h-1 bg-white/5 rounded overflow-hidden">
                <div className="h-full bg-white/20 w-1/3 animate-[scan-line_2s_linear_infinite]" />
              </div>
            </div>
          ) : (
            <div className="space-y-5 pb-10">
              {/* AUTO-OPTIMIZE SECTION */}
              <div className="bg-black/40 border border-accent/30 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowAutoPanel(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold uppercase tracking-widest text-accent">Auto-Optimize</span>
                  </div>
                  <span className="text-[10px] text-white/40">{showAutoPanel ? '▲' : '▼'}</span>
                </button>

                {showAutoPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4 space-y-3 border-t border-accent/20"
                  >
                    <p className="text-[10px] text-white/50 pt-3 leading-relaxed">
                      AI selects optimal intervention mix based on {selectedCity.name}'s risk profile and city data.
                    </p>

                    {/* Priority Selector */}
                    <div className="grid grid-cols-5 gap-1">
                      {PRIORITY_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setPriority(opt.id)}
                          title={opt.desc}
                          className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border text-[9px] font-mono transition-all ${priority === opt.id ? 'border-accent bg-accent/20 text-accent' : 'border-white/10 text-white/40 hover:border-white/30'}`}
                        >
                          <span className="text-sm">{opt.icon}</span>
                          <span className="uppercase tracking-wider">{opt.label}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleAutoOptimize}
                      disabled={autoOptimizing}
                      className="w-full py-2.5 rounded-lg font-mono text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-all bg-accent/20 hover:bg-accent/40 text-accent border border-accent/50 disabled:opacity-50"
                    >
                      {autoOptimizing ? (
                        <>
                          <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                          ANALYZING...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          GENERATE PLAN
                        </>
                      )}
                    </button>

                    {/* Auto-optimize results */}
                    {autoOptimizeResult && !autoOptimizing && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="text-[10px] text-white/50 border-t border-white/10 pt-2 leading-relaxed">
                          {autoOptimizeResult.rationale}
                        </div>

                        {/* Projected impact */}
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                          {([
                            { label: 'Temp', val: autoOptimizeResult.projectedImpact.temperatureDelta, unit: '°C', good: (v: number) => v < 0 },
                            { label: 'GW', val: autoOptimizeResult.projectedImpact.groundwaterDelta, unit: '%', good: (v: number) => v > 0 },
                            { label: 'Risk', val: autoOptimizeResult.projectedImpact.riskScoreDelta, unit: '', good: (v: number) => v < 0 },
                            { label: 'Contam.', val: autoOptimizeResult.projectedImpact.contaminationDelta, unit: ' pts', good: (v: number) => v < 0 },
                          ] as const).map(m => (
                            <div key={m.label} className={`px-2 py-1.5 rounded border ${m.good(m.val) ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                              <div className="text-white/40 uppercase tracking-wider text-[9px]">{m.label}</div>
                              <div className="font-bold">{m.val > 0 ? '+' : ''}{m.val.toFixed(1)}{m.unit}</div>
                            </div>
                          ))}
                        </div>

                        {/* Recommended list */}
                        <div className="space-y-1">
                          {autoOptimizeResult.recommendedInterventions.map(r => (
                            <div key={r.type} className="flex items-start gap-2 p-2 rounded bg-black/30 border border-white/5">
                              <span className="text-[10px] font-mono text-white/30 shrink-0 pt-0.5">#{r.priority}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-white capitalize">{r.type.replace(/_/g, ' ')} × {r.count}</div>
                                <div className="text-[9px] text-white/40 leading-tight">{r.reason.split('—')[0]}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={handleApply}
                          className="w-full py-2 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50 transition-all"
                        >
                          <Play className="w-3.5 h-3.5" />
                          APPLY TO MAP
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* System Status */}
              <div className="bg-black/40 border border-accent/20 p-4 rounded-xl text-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -mr-10 -mt-10" />
                <div className="flex items-center justify-between mb-3 border-b border-accent/20 pb-2">
                  <span className="text-accent uppercase tracking-widest font-bold">System Status</span>
                  <span className={isSimulating ? 'text-yellow-400 animate-pulse font-bold' : 'text-green-400 font-bold'}>
                    {isSimulating ? 'CALCULATING...' : 'OPTIMIZED'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Confidence Score:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
                        <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${confidence}%` }} />
                      </div>
                      <span className="text-white font-bold">{confidence}%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Physics Mode:</span>
                    <div className="flex items-center gap-1.5">
                      {simulationResult?.geoAdjusted ? (
                        <>
                          <Satellite className="w-3 h-3 text-cyan-400" />
                          <span className="text-cyan-400 font-bold">Geo-Adjusted</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 text-yellow-400" />
                          <span className="text-yellow-400 font-bold">Baseline</span>
                        </>
                      )}
                    </div>
                  </div>

                  {geoAnalysis && !geoLoading && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Data Source:</span>
                      <span className="text-violet-300 font-bold text-[10px]">ISRO LULC + Open-Meteo</span>
                    </div>
                  )}

                  {simulationResult && simulationResult.sewageLeakageRate > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Sewage Leakage:</span>
                      <span className="text-red-400 font-bold">{(simulationResult.sewageLeakageRate / 1000).toFixed(0)}K L/day</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Geo Simulation Modifiers */}
              {mods && simulationResult?.geoAdjusted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-black/30 border border-cyan-500/20 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center gap-2 border-b border-cyan-500/15 pb-2 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">Geo Physics Multipliers</span>
                  </div>
                  <GeoModifierBadge label="🌳 Tree Effectiveness" value={mods.treeEffectivenessMultiplier} positive={true} />
                  <GeoModifierBadge label="🪨 Permeable Pavement" value={mods.permeablePavementEffectiveness} positive={true} />
                  <GeoModifierBadge label="☀️ Solar Effectiveness" value={mods.solarEffectiveness} positive={true} />
                  <GeoModifierBadge label="🏭 Factory Impact" value={mods.factoryImpactMultiplier} positive={false} />
                  <div className="flex items-center justify-between px-2 py-1.5 rounded border border-white/10 text-[10px] font-mono text-white/50">
                    <span>🌡 Heat Island Severity</span>
                    <span className={`font-bold ${mods.heatIslandSeverity > 2 ? 'text-red-400' : mods.heatIslandSeverity > 1.5 ? 'text-orange-400' : 'text-green-400'}`}>
                      {mods.heatIslandSeverity.toFixed(1)}/3.0
                    </span>
                  </div>
                </motion.div>
              )}

              {/* AI Insights */}
              {simulationResult && simulationResult.aiInsights.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    <div className="text-xs text-white/70 uppercase tracking-widest font-bold">Predictive Insights</div>
                  </div>

                  <AnimatePresence mode="popLayout">
                    {simulationResult.aiInsights.map((insight: string, idx: number) => {
                      const isWarning = insight.includes('Warning') || insight.includes('Critical') || insight.includes('Alert') || insight.includes('⚠') || insight.includes('🏭') || insight.includes('🌾');
                      const isData = insight.includes('📊') || insight.includes('⚖️');

                      return (
                        <motion.div
                          key={insight.substring(0, 30) + idx}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: idx * 0.12 + 0.1, type: "spring" }}
                          className={`flex gap-3 p-3.5 rounded-lg border relative overflow-hidden ${isWarning ? 'bg-red-500/10 border-red-500/30' : isData ? 'bg-blue-500/10 border-blue-500/30' : 'bg-accent/5 border-accent/20'}`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-current opacity-40" />
                          {isWarning ? (
                            <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          ) : isData ? (
                            <Terminal className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          )}
                          <p className={`leading-relaxed text-xs ${isWarning ? 'text-red-100' : isData ? 'text-blue-100' : 'text-white/90'}`}>
                            {!isSimulating ? <TypewriterText text={insight} /> : insight}
                          </p>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Intervention Matrix */}
              {simulationResult && simulationResult.interventionBreakdown.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs text-white/50 uppercase tracking-widest mb-3 border-b border-white/10 pb-1">Intervention Matrix</div>
                  <div className="bg-black/40 rounded-lg border border-white/10 overflow-hidden">
                    {simulationResult.interventionBreakdown.map((bk: { type: string; effect: string; temperatureImpact: number; groundwaterImpact: number; contaminationImpact: number; waterWastageImpact: number }, i: number) => (
                      <div key={bk.type} className={`flex justify-between items-center p-2.5 text-xs ${i !== 0 ? 'border-t border-white/5' : ''}`}>
                        <div>
                          <div className="text-white/80 font-bold capitalize">{bk.type.replace(/_/g, ' ')}</div>
                          <div className="text-white/30 text-[10px] truncate max-w-[160px]" title={bk.effect}>{bk.effect.split(';')[0]}</div>
                        </div>
                        <div className="flex gap-3 text-right">
                          {bk.temperatureImpact !== 0 && (
                            <div className={`w-12 ${bk.temperatureImpact > 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                              {bk.temperatureImpact > 0 ? '+' : ''}{bk.temperatureImpact.toFixed(1)}°
                            </div>
                          )}
                          {bk.contaminationImpact !== 0 && (
                            <div className={`w-14 ${bk.contaminationImpact > 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                              {bk.contaminationImpact > 0 ? '+' : ''}{bk.contaminationImpact.toFixed(0)}☣
                            </div>
                          )}
                          {bk.groundwaterImpact !== 0 && (
                            <div className={`w-12 ${bk.groundwaterImpact < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                              {bk.groundwaterImpact > 0 ? '+' : ''}{bk.groundwaterImpact.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ISRO Geo Recommendations */}
              {geoAnalysis && geoAnalysis.geoRecommendations.length > 0 && interventions.length === 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Satellite className="w-3 h-3 text-violet-400" />
                    <div className="text-[10px] text-violet-400/80 uppercase tracking-widest font-bold">ISRO Geo Recommendations</div>
                  </div>
                  {geoAnalysis.geoRecommendations.slice(0, 2).map((rec: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 text-xs text-white/70 leading-relaxed"
                    >
                      {rec}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(isSimulating || autoOptimizing) && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-4 bg-black/80 p-6 rounded-2xl border border-accent/30 shadow-[0_0_30px_rgba(255,0,128,0.2)]">
                <div className="relative">
                  <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5 text-accent animate-pulse" />
                  </div>
                </div>
                <div className="text-accent text-xs font-mono tracking-[0.3em] animate-pulse font-bold">
                  {autoOptimizing ? 'AI OPTIMIZING...' : 'SYNTHESIZING'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/50">
          <button
            onClick={handleExport}
            disabled={!selectedCity || isSimulating}
            className="w-full py-2.5 rounded-lg font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-accent/20 hover:bg-accent/30 text-accent border border-accent/50 shadow-[0_0_10px_rgba(255,0,128,0.1)] hover:shadow-[0_0_15px_rgba(255,0,128,0.3)]"
          >
            <Download className="w-4 h-4" />
            EXPORT REPORT
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
