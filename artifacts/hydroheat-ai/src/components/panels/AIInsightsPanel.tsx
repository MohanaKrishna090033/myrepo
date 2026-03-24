import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, CheckCircle2, AlertOctagon, Terminal } from 'lucide-react';
import { useSandbox } from '../../context/SandboxContext';

export function AIInsightsPanel() {
  const { selectedCity, simulationResult, isSimulating, interventions } = useSandbox();

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-4 top-[80px] bottom-[180px] w-[340px] z-[100] glass-panel-glow rounded-xl flex flex-col overflow-hidden border-accent/30 shadow-[0_0_15px_rgba(255,0,255,0.1)]"
      >
        <div className="p-4 border-b border-accent/20 bg-accent/5 flex items-center gap-3">
          <BrainCircuit className="w-6 h-6 text-accent animate-pulse" />
          <div>
            <h2 className="text-lg font-bold font-sans tracking-wide text-white">AI ANALYSIS</h2>
            <div className="text-[10px] font-mono text-accent/80 uppercase tracking-widest">Neural Projection Matrix</div>
          </div>
        </div>

        <div className="flex-1 p-5 overflow-y-auto font-mono text-sm relative">
          
          {!selectedCity ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4 opacity-50">
              <Terminal className="w-12 h-12" />
              <p>AWAITING TARGET SELECTION...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              <div className="bg-black/40 border border-accent/20 p-3 rounded-lg text-xs">
                <div className="text-accent mb-2 uppercase tracking-widest border-b border-accent/20 pb-1">System Status</div>
                <div className="flex justify-between mb-1"><span>Target:</span> <span className="text-white">{selectedCity.name}</span></div>
                <div className="flex justify-between mb-1"><span>Active Interventions:</span> <span className="text-primary">{interventions.length}</span></div>
                <div className="flex justify-between"><span>Compute State:</span> <span className={isSimulating ? 'text-yellow-400 animate-pulse' : 'text-green-400'}>{isSimulating ? 'CALCULATING' : 'OPTIMIZED'}</span></div>
              </div>

              {simulationResult && simulationResult.aiInsights.length > 0 && (
                <div className="space-y-4">
                  <div className="text-xs text-white/50 uppercase tracking-widest">Predictive Insights</div>
                  <AnimatePresence mode="popLayout">
                    {simulationResult.aiInsights.map((insight, idx) => (
                      <motion.div 
                        key={insight + idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex gap-3 bg-accent/5 p-3 rounded border border-accent/10"
                      >
                        {insight.includes('Warning') || insight.includes('Critical') ? (
                          <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        )}
                        <p className="text-white/90 leading-relaxed text-xs">{insight}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {simulationResult && simulationResult.interventionBreakdown.length > 0 && (
                <div className="space-y-2 mt-6">
                  <div className="text-xs text-white/50 uppercase tracking-widest mb-3">Impact Breakdown</div>
                  {simulationResult.interventionBreakdown.map((bk) => (
                    <div key={bk.type} className="flex justify-between items-center bg-black/20 p-2 rounded text-xs border border-white/5">
                      <span className="text-white/80">{bk.effect}</span>
                      <div className="text-right">
                        {bk.temperatureImpact !== 0 && (
                          <div className={bk.temperatureImpact > 0 ? 'text-red-400' : 'text-cyan-400'}>
                            {bk.temperatureImpact > 0 ? '+' : ''}{bk.temperatureImpact.toFixed(1)}°C
                          </div>
                        )}
                        {bk.groundwaterImpact !== 0 && (
                          <div className={bk.groundwaterImpact < 0 ? 'text-red-400' : 'text-blue-400'}>
                            {bk.groundwaterImpact > 0 ? '+' : ''}{bk.groundwaterImpact.toFixed(1)}% GW
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {isSimulating && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-accent text-xs tracking-widest animate-pulse">PROCESSING</span>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
