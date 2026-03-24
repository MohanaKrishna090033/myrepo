import { Trash2, MousePointerClick } from 'lucide-react';
import { useSandbox } from '../../context/SandboxContext';
import { TOOLS } from '../../lib/constants';

export function SandboxToolbox() {
  const { activeTool, setActiveTool, interventions, clearInterventions, selectedCity } = useSandbox();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-4xl glass-panel-glow rounded-2xl p-4 flex flex-col gap-3 transition-all">
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="text-primary neon-text tracking-widest font-bold">DEPLOYMENT ARSENAL</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-white/60">Active Entities: <strong className="text-white">{interventions.length}</strong></span>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setActiveTool(null)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-xs transition-colors border ${activeTool === null ? 'bg-primary/20 text-primary border-primary shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'bg-black/30 text-white/60 border-white/10 hover:bg-black/50 hover:text-white'}`}
          >
            <MousePointerClick className="w-3 h-3" />
            SELECT
          </button>
          <button 
            onClick={clearInterventions}
            disabled={interventions.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-xs bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            PURGE ALL
          </button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {TOOLS.map((tool) => {
          const isActive = activeTool === tool.type;
          
          return (
            <button
              key={tool.type}
              disabled={!selectedCity}
              onClick={() => setActiveTool(tool.type)}
              className={`
                group relative flex flex-col items-center gap-2 min-w-[100px] p-3 rounded-xl border transition-all duration-300
                ${!selectedCity ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:-translate-y-1 cursor-pointer'}
                ${isActive ? 'bg-black/60 border-primary shadow-[0_0_15px_rgba(0,255,255,0.4)] scale-105' : 'bg-black/40 border-white/10 hover:bg-black/50 hover:border-white/30'}
              `}
            >
              {/* Highlight bar at top for active state */}
              {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-primary rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.8)]" />}
              
              <div className={`text-3xl ${tool.colorClass.split(' ')[0]} drop-shadow-[0_0_8px_currentColor] transition-transform group-hover:scale-110`}>
                {tool.icon}
              </div>
              
              <div className="flex flex-col items-center">
                <span className={`font-sans font-bold text-xs ${isActive ? 'text-primary' : 'text-white/80'}`}>
                  {tool.name}
                </span>
                <span className="font-mono text-[9px] text-white/40 text-center mt-1 opacity-0 group-hover:opacity-100 absolute -bottom-6 w-32 transition-opacity">
                  {tool.impactDesc}
                </span>
              </div>

              {/* Status indicator line */}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 opacity-50 ${tool.category === 'positive' ? 'bg-green-500' : 'bg-red-500'}`} />
            </button>
          );
        })}
      </div>
      
      {!selectedCity && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10 border border-primary/20">
          <span className="bg-black/80 text-primary px-4 py-2 rounded-full font-mono text-sm border border-primary/50 shadow-[0_0_15px_rgba(0,255,255,0.2)] animate-pulse">
            SELECT A TARGET ZONE TO ENABLE DEPLOYMENT
          </span>
        </div>
      )}
    </div>
  );
}
