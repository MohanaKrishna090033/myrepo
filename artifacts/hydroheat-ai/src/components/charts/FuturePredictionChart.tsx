import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSandbox } from '../../context/SandboxContext';

export function FuturePredictionChart() {
  const { selectedCity, simulationResult } = useSandbox();

  const data = useMemo(() => {
    if (!selectedCity) return [];
    
    const baseTemp = selectedCity.temperature;
    const projTemp = simulationResult?.projectedTemperature ?? baseTemp;
    
    const currentYear = new Date().getFullYear();
    const result = [];
    
    for (let i = 0; i <= 10; i++) {
      const year = currentYear + i;
      // Simulate generic warming trend for baseline
      const baselineTrend = baseTemp + (i * 0.15);
      
      // Interventions take full effect over 5 years
      const interventionEffectRatio = Math.min(1, i / 5);
      const tempDiff = projTemp - baseTemp;
      const projectedWithIntervention = baselineTrend + (tempDiff * interventionEffectRatio);
      
      result.push({
        year: year.toString(),
        Baseline: parseFloat(baselineTrend.toFixed(1)),
        Projected: parseFloat(projectedWithIntervention.toFixed(1))
      });
    }
    return result;
  }, [selectedCity, simulationResult]);

  if (!selectedCity) return null;

  return (
    <div className="h-[200px] w-full mt-6 bg-black/20 rounded-lg p-2 border border-white/5">
      <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 pl-2">Temperature Projection (°C)</h4>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--panel))', borderColor: 'hsl(var(--primary)/0.3)', borderRadius: '8px' }}
            itemStyle={{ color: '#fff', fontSize: '12px' }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px', marginBottom: '4px' }}
          />
          <Area type="monotone" dataKey="Baseline" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorBaseline)" />
          <Area type="monotone" dataKey="Projected" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorProjected)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
