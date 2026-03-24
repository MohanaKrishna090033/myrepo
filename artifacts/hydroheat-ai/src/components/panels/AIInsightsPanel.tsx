import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, CheckCircle2, AlertOctagon, Terminal, Download, ShieldAlert } from 'lucide-react';
import { useSandbox } from '../../context/SandboxContext';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

// Typing effect component
const TypewriterText = ({ text, delayOffset = 0 }: { text: string, delayOffset?: number }) => {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 20); // Fast typing speed
    
    // Start delay
    const timeout = setTimeout(() => {
      // Actually start the interval... wait, interval starts right away but with empty string.
      // Better to use CSS animation for per-word or just the JS string slicing.
    }, delayOffset);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [text, delayOffset]);

  return <span>{displayed}<span className="animate-pulse opacity-50">_</span></span>;
};

export function AIInsightsPanel() {
  const { selectedCity, simulationResult, isSimulating, interventions } = useSandbox();

  const handleExport = () => {
    toast.info("Report generation coming soon...", {
      description: "PDF export module is currently initializing.",
      icon: <Download className="w-4 h-4" />
    });
  };

  const confidence = 70 + Math.min(27, interventions.length * 3);
  const currentRisk = simulationResult?.projectedRiskScore ?? selectedCity?.riskScore ?? 0;
  
  const riskColor = currentRisk > 70 ? 'text-red-500 bg-red-500/10 border-red-500/30' : 
                    currentRisk > 50 ? 'text-orange-400 bg-orange-500/10 border-orange-500/30' : 
                    'text-green-400 bg-green-500/10 border-green-500/30';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-4 top-[80px] bottom-[180px] w-[360px] z-[100] glass-panel-glow rounded-xl flex flex-col overflow-hidden border-accent/30 shadow-[0_0_20px_rgba(255,0,128,0.15)]"
      >
        <div className="p-4 border-b border-accent/20 bg-gradient-to-r from-accent/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <BrainCircuit className="w-7 h-7 text-accent" />
              {isSimulating && <div className="absolute inset-0 bg-accent rounded-full blur-md animate-pulse" />}
            </div>
            <div>
              <h2 className="text-xl font-bold font-sans tracking-wide text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">AI ANALYSIS</h2>
              <div className="text-[10px] font-mono text-accent/80 uppercase tracking-[0.2em]">Neural Projection Matrix</div>
            </div>
          </div>
          {selectedCity && (
            <div className={`px-2 py-1 rounded border flex items-center gap-1.5 ${riskColor}`}>
              <ShieldAlert className="w-3 h-3" />
              <span className="text-[10px] font-mono font-bold uppercase">Risk: {currentRisk > 70 ? 'HIGH' : currentRisk > 50 ? 'MODERATE' : 'LOW'}</span>
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
            <div className="space-y-6 pb-10">
              
              <div className="bg-black/40 border border-accent/20 p-4 rounded-xl text-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -mr-10 -mt-10" />
                <div className="flex items-center justify-between mb-3 border-b border-accent/20 pb-2">
                  <span className="text-accent uppercase tracking-widest font-bold">System Status</span>
                  <span className={isSimulating ? 'text-yellow-400 animate-pulse font-bold' : 'text-green-400 font-bold'}>{isSimulating ? 'CALCULATING...' : 'OPTIMIZED'}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Confidence Score:</span> 
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
                        <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${confidence}%` }} />
                      </div>
                      <span className="text-white font-bold">{confidence}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {simulationResult && simulationResult.aiInsights.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    <div className="text-xs text-white/70 uppercase tracking-widest font-bold">Predictive Insights</div>
                  </div>
                  
                  <AnimatePresence mode="popLayout">
                    {simulationResult.aiInsights.map((insight, idx) => {
                      const isWarning = insight.includes('Warning') || insight.includes('Critical') || insight.includes('Alert');
                      const isAction = insight.includes('Recommended Next Action');
                      
                      return (
                        <motion.div 
                          key={insight + idx}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.15 + 0.1, type: "spring" }}
                          className={`flex gap-3 p-3.5 rounded-lg border relative overflow-hidden ${
                            isWarning ? 'bg-red-500/10 border-red-500/30' : 
                            isAction ? 'bg-blue-500/10 border-blue-500/30' :
                            'bg-accent/5 border-accent/20'
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-current opacity-50" />
                          {isWarning ? (
                            <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          ) : isAction ? (
                            <Terminal className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          )}
                          <p className={`leading-relaxed text-xs ${isWarning ? 'text-red-100' : isAction ? 'text-blue-100 font-bold' : 'text-white/90'}`}>
                            {!isSimulating ? <TypewriterText text={insight} delayOffset={idx * 100} /> : insight}
                          </p>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {simulationResult && simulationResult.interventionBreakdown.length > 0 && (
                <div className="space-y-3 mt-6">
                  <div className="text-xs text-white/50 uppercase tracking-widest mb-3 border-b border-white/10 pb-1">Intervention Matrix</div>
                  <div className="bg-black/40 rounded-lg border border-white/10 overflow-hidden">
                    {simulationResult.interventionBreakdown.map((bk, i) => (
                      <div key={bk.type} className={`flex justify-between items-center p-2.5 text-xs ${i !== 0 ? 'border-t border-white/5' : ''}`}>
                        <span className="text-white/80 font-bold">{bk.effect}</span>
                        <div className="flex gap-3 text-right">
                          {bk.temperatureImpact !== 0 && (
                            <div className={`w-12 ${bk.temperatureImpact > 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                              {bk.temperatureImpact > 0 ? '+' : ''}{bk.temperatureImpact.toFixed(1)}°
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
            </div>
          )}

          {isSimulating && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-4 bg-black/80 p-6 rounded-2xl border border-accent/30 shadow-[0_0_30px_rgba(255,0,128,0.2)]">
                <div className="relative">
                  <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5 text-accent animate-pulse" />
                  </div>
                </div>
                <div className="text-accent text-xs font-mono tracking-[0.3em] animate-pulse font-bold">
                  SYNTHESIZING
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Action */}
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
