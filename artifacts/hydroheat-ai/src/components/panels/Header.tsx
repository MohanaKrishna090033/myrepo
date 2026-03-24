import { Activity } from 'lucide-react';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-[60px] z-[200] glass-panel border-b border-primary/20 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/50 text-primary">
          <Activity className="w-5 h-5 animate-pulse" />
          <div className="absolute inset-0 rounded-full shadow-[0_0_10px_rgba(0,255,255,0.5)] animate-ping opacity-50" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-sans tracking-widest neon-text m-0 leading-tight">
            HYDROHEAT<span className="text-white drop-shadow-none">.AI</span>
          </h1>
          <p className="text-[10px] uppercase text-primary/70 font-mono tracking-widest m-0">Urban Climate Sandbox</p>
        </div>
      </div>
      
      <div className="flex gap-4 text-xs font-mono text-muted-foreground hidden md:flex">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_5px_rgba(0,255,0,0.5)]" />
          SYSTEM_ONLINE
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_5px_rgba(0,255,255,0.5)]" />
          DATA_SYNC: REALTIME
        </div>
      </div>
    </header>
  );
}
