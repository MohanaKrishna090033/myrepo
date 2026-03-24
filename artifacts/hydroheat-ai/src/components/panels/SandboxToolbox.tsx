import { useEffect } from 'react';
import { Trash2, MousePointerClick, Activity, Map, Layers, Radar } from 'lucide-react';
import { useSandbox } from '../../context/SandboxContext';
import { TOOLS, LAYER_DEFS } from '../../lib/constants';

const TAB_DEFS = [
  { id: 'green' as const, label: '🌿 Green', color: 'text-green-400 border-green-500/60 bg-green-500/10' },
  { id: 'water' as const, label: '💧 Water', color: 'text-blue-400 border-blue-500/60 bg-blue-500/10' },
  { id: 'harmful' as const, label: '🏭 Harmful', color: 'text-red-400 border-red-500/60 bg-red-500/10' },
];

export function SandboxToolbox() {
  const {
    activeTool, setActiveTool, interventions, clearInterventions, selectedCity, simulationResult,
    activeLayer, setActiveLayer, showSmartZones, toggleSmartZones, toolTab, setToolTab,
  } = useSandbox();

  const filteredTools = TOOLS.filter(t => t.tab === toolTab);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setActiveTool(null); return; }
      const num = parseInt(e.key);
      if (!isNaN(num) && num > 0 && num <= filteredTools.length) {
        if (selectedCity) setActiveTool(filteredTools[num - 1].type);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCity, setActiveTool, filteredTools]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-5xl glass-panel-glow rounded-2xl p-4 flex flex-col gap-3 transition-all">
      {/* Mini Stats Bar */}
      {selectedCity && simulationResult && interventions.length > 0 && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/80 border border-primary/30 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(0,255,255,0.2)] whitespace-nowrap">
          <Activity className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs font-mono text-white/80">NET:</span>
          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${simulationResult.temperatureDelta > 0 ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
            {simulationResult.temperatureDelta > 0 ? '+' : ''}{simulationResult.temperatureDelta.toFixed(1)}°C
          </span>
          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${simulationResult.groundwaterDelta < 0 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {simulationResult.groundwaterDelta > 0 ? '+' : ''}{simulationResult.groundwaterDelta.toFixed(1)}% GW
          </span>
          {simulationResult.contaminationDelta !== 0 && (
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${simulationResult.contaminationDelta > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
              {simulationResult.contaminationDelta > 0 ? '+' : ''}{simulationResult.contaminationDelta.toFixed(0)} ☣️
            </span>
          )}
          {simulationResult.floodRiskDelta !== 0 && (
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${simulationResult.floodRiskDelta > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
              {simulationResult.floodRiskDelta > 0 ? '+' : ''}{simulationResult.floodRiskDelta.toFixed(0)} 🌊
            </span>
          )}
        </div>
      )}

      {activeTool && selectedCity && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center justify-center">
          <span className="text-primary font-mono text-sm tracking-widest uppercase animate-pulse drop-shadow-[0_0_8px_currentColor]">
            Click map to deploy entity
          </span>
        </div>
      )}

      {/* Header Row */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-3 font-mono text-sm">
          <span className="text-primary neon-text tracking-widest font-bold">DEPLOYMENT ARSENAL</span>
          <span className="text-white/60">Entities: <strong className="text-white">{interventions.length}</strong></span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTool(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs transition-colors border ${activeTool === null ? 'bg-primary/20 text-primary border-primary shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'bg-black/30 text-white/60 border-white/10 hover:bg-black/50 hover:text-white'}`}
          >
            <MousePointerClick className="w-3 h-3" />
            SELECT
          </button>
          <button
            onClick={clearInterventions}
            disabled={interventions.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            PURGE
          </button>
        </div>
      </div>

      {/* Layer Controls Row */}
      <div className="flex items-center gap-2 px-2 flex-wrap">
        <div className="flex items-center gap-1.5 mr-1">
          <Layers className="w-3.5 h-3.5 text-white/40" />
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Layers:</span>
        </div>
        {LAYER_DEFS.map(layer => (
          <button
            key={layer.id}
            onClick={() => setActiveLayer(layer.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono transition-all ${activeLayer === layer.id ? `${layer.color} border-current shadow-[0_0_8px_currentColor]` : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white/70'}`}
          >
            <span>{layer.icon}</span>
            <span className="hidden sm:inline uppercase tracking-wider">{layer.label}</span>
          </button>
        ))}
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button
          onClick={toggleSmartZones}
          disabled={!selectedCity}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono transition-all ${showSmartZones ? 'border-violet-500/60 text-violet-400 bg-violet-500/10 shadow-[0_0_8px_rgba(139,92,246,0.3)]' : 'border-white/10 text-white/40 hover:border-violet-400/40 hover:text-violet-300'} disabled:opacity-30`}
        >
          <Radar className="w-3 h-3" />
          <span className="uppercase tracking-wider">Smart Zones</span>
        </button>
      </div>

      {/* Tab Row */}
      <div className="flex items-center gap-2 px-2 border-b border-white/10 pb-3">
        <Map className="w-3.5 h-3.5 text-white/40" />
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mr-1">Tools:</span>
        {TAB_DEFS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setToolTab(tab.id)}
            className={`px-3 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all ${toolTab === tab.id ? tab.color + ' shadow-sm' : 'border-white/10 text-white/50 hover:text-white/70'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tool Buttons */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide items-end justify-center">
        {filteredTools.map((tool, idx) => {
          const isActive = activeTool === tool.type;
          const isGreen = tool.category === 'positive';

          return (
            <div key={tool.type} className="group relative">
              <button
                disabled={!selectedCity}
                onClick={() => setActiveTool(tool.type)}
                className={`
                  relative flex flex-col items-center justify-center gap-2 w-[96px] h-[88px] rounded-xl border transition-all duration-300 overflow-hidden
                  ${!selectedCity ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:-translate-y-1 cursor-pointer'}
                  ${isActive ? 'bg-black/80 scale-105 shadow-[0_0_20px_rgba(0,0,0,0.8)] z-10' : 'bg-black/40 border-white/10 hover:bg-black/60'}
                  ${isActive && isGreen ? 'border-green-400/80 shadow-[0_0_15px_rgba(0,255,100,0.2)]' : ''}
                  ${isActive && !isGreen ? 'border-orange-500/80 shadow-[0_0_15px_rgba(255,100,0,0.2)]' : ''}
                `}
                style={{
                  background: isActive
                    ? `radial-gradient(circle at 50% 120%, ${isGreen ? 'rgba(0,255,100,0.15)' : 'rgba(255,100,0,0.15)'}, transparent 80%), rgba(0,0,0,0.8)`
                    : undefined
                }}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-0 left-0 w-[5px] h-full bg-white/50 blur-[2px] animate-scan" />
                  </div>
                )}

                <div className="absolute top-1 left-2 text-[10px] font-mono text-white/30">{idx + 1}</div>

                <div className={`text-3xl drop-shadow-[0_0_8px_currentColor] transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}>
                  {tool.icon}
                </div>

                <span className={`font-sans font-bold text-[10px] leading-tight text-center px-1 ${isActive ? (isGreen ? 'text-green-300' : 'text-orange-300') : 'text-white/80'}`}>
                  {tool.name}
                </span>

                <div className={`absolute bottom-0 left-0 right-0 h-1 ${isGreen ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-gradient-to-r from-orange-500 to-red-500'} ${isActive ? 'opacity-100' : 'opacity-30'}`} />
              </button>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-52 bg-black/95 border border-primary/30 rounded-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-2 mb-1 border-b border-white/10 pb-1">
                  <span className="text-xl">{tool.icon}</span>
                  <span className="font-bold font-sans text-sm text-white">{tool.name}</span>
                </div>
                <div className="font-mono text-xs mt-2 text-white/70">
                  <div className="flex items-start gap-1">
                    <span className="text-white/40 mt-0.5">↳</span>
                    <span className={isGreen ? 'text-green-300' : 'text-red-300'}>{tool.impactDesc}</span>
                  </div>
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/95 border-b border-r border-primary/30 rotate-45" />
              </div>
            </div>
          );
        })}
      </div>

      {!selectedCity && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center z-20 border border-primary/20">
          <span className="bg-black/90 text-primary px-6 py-3 rounded-full font-mono text-base font-bold tracking-wider border border-primary/50 shadow-[0_0_25px_rgba(0,255,255,0.3)] animate-pulse">
            SELECT A TARGET ZONE TO ENABLE DEPLOYMENT
          </span>
        </div>
      )}
    </div>
  );
}
