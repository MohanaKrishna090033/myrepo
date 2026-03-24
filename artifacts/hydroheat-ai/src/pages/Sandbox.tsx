import { InteractiveMap } from '../components/map/InteractiveMap';
import { Header } from '../components/panels/Header';
import { LocationDetailsPanel } from '../components/panels/LocationDetailsPanel';
import { AIInsightsPanel } from '../components/panels/AIInsightsPanel';
import { SandboxToolbox } from '../components/panels/SandboxToolbox';

export default function Sandbox() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-foreground">
      {/* Background Map Layer */}
      <InteractiveMap />

      {/* UI Overlay Layers */}
      <Header />
      
      {/* Left Panel - Location Details */}
      <LocationDetailsPanel />

      {/* Right Panel - AI Insights */}
      <AIInsightsPanel />

      {/* Bottom Panel - Tools */}
      <SandboxToolbox />

      {/* Ambient screen edges glow */}
      <div className="pointer-events-none fixed inset-0 z-[50] shadow-[inset_0_0_100px_rgba(0,255,255,0.05)]" />
    </div>
  );
}
