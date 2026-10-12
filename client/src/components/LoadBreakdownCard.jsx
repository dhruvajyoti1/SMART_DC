/**
 * LoadBreakdownCard — Facility Power Load Composition Visualization
 *
 * Shows the breakdown of total facility power into its three primary consumers:
 *   1. IT Equipment Load (servers, storage, network) — typically 60-80% of total
 *   2. Cooling Systems (CRAC, chillers, pumps) — typically 15-25% of total
 *   3. Support Infrastructure (UPS losses, lighting, PDU) — typically 2-8% of total
 *
 * This is a standard view in Electrical Power Management Systems (EPMS) and is
 * fundamental for understanding Power Usage Effectiveness (PUE = Total / IT Load).
 *
 * Props:
 *   loadData {object} — { itLoad, coolingLoad, supportLoad, totalPower, pue }
 *   trend    {string} — 'rising'|'falling'|'steady' for overall demand trend
 */
import { PieChartIcon, TrendUpIcon, TrendDownIcon, TrendStableIcon } from './Icons.jsx';

export default function LoadBreakdownCard({ loadData, trend, selectedArea = null, onSelectArea = null }) {
  if (!loadData) return null;

  const { itLoad, coolingLoad, supportLoad, totalPower, pue } = loadData;
  const total = totalPower || (itLoad + coolingLoad + supportLoad) || 1;

  const segments = [
    {
      id: 'it',
      label: 'IT Equipment (Compute)',
      sublabel: 'Servers, GPUs, Storage, Blade Racks',
      role: 'Largest consumer (~78%). Compute workloads generate thermal heat driving cooling demands.',
      value: itLoad,
      pct: ((itLoad / total) * 100).toFixed(1),
      color: '#06b6d4',     // cyan
      bgColor: 'bg-cyan-500',
      textColor: 'text-cyan-400',
    },
    {
      id: 'cooling',
      label: 'Cooling Infrastructure (CRAC)',
      sublabel: 'CRAC Units, Chillers, Pumps, Cold Aisle Fans',
      role: 'Thermal management (~18.5%). Fluctuates dynamically with IT heat output and ambient weather.',
      value: coolingLoad,
      pct: ((coolingLoad / total) * 100).toFixed(1),
      color: '#3b82f6',     // blue
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-400',
    },
    {
      id: 'support',
      label: 'Support & Distribution',
      sublabel: 'UPS Battery Banks, Switchgear, PDU Overhead',
      role: 'Power delivery (~3.5%). Inverter conversion efficiency and power factor conditioning.',
      value: supportLoad,
      pct: ((supportLoad / total) * 100).toFixed(1),
      color: '#8b5cf6',     // violet
      bgColor: 'bg-violet-500',
      textColor: 'text-violet-400',
    },
  ];

  const TrendIcon = trend === 'rising' ? TrendUpIcon : trend === 'falling' ? TrendDownIcon : TrendStableIcon;
  const trendColor = trend === 'rising' ? 'text-amber-400' : trend === 'falling' ? 'text-emerald-400' : 'text-slate-400';
  const trendLabel = trend === 'rising' ? 'DEMAND RISING' : trend === 'falling' ? 'DEMAND FALLING' : 'DEMAND STEADY';

  return (
    <div className="control-panel rounded-xl p-5 bg-[#091426] border border-[#162947] shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14263f] pb-3">
        <div className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              Facility Electricity Consumption by Area
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              Live breakdown across primary datacenter consumer domains — click any area to filter telemetry
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedArea && onSelectArea && (
            <button
              onClick={() => onSelectArea(null)}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline"
            >
              Clear Filter
            </button>
          )}
          {trend && (
            <div className={`flex items-center gap-1.5 text-[10px] font-mono font-semibold ${trendColor}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              <span>{trendLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stacked Horizontal Bar */}
      <div className="space-y-2">
        <div className="w-full h-5 rounded-full overflow-hidden flex border border-[#162744] bg-[#0b162a]">
          {segments.map((seg) => (
            <div
              key={seg.label}
              onClick={() => onSelectArea && onSelectArea(seg.id)}
              className={`h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full cursor-pointer hover:opacity-100 ${
                selectedArea && selectedArea !== seg.id ? 'opacity-30' : 'opacity-85'
              }`}
              style={{
                width: `${seg.pct}%`,
                backgroundColor: seg.color,
              }}
              title={`${seg.label}: ${seg.value?.toFixed(0)} kW (${seg.pct}%) - Click to focus`}
            />
          ))}
        </div>

        {/* Legend row — shows what each color represents */}
        <div className="flex items-center gap-4 flex-wrap text-[9px] font-mono text-slate-400">
          {segments.map((seg) => (
            <button
              key={seg.label}
              onClick={() => onSelectArea && onSelectArea(selectedArea === seg.id ? null : seg.id)}
              className={`flex items-center gap-1.5 transition-all text-left ${
                selectedArea === seg.id ? 'font-bold text-white' : 'hover:text-slate-200'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: seg.color, boxShadow: `0 0 4px ${seg.color}40` }}
              />
              <span>{seg.label.split('(')[0].trim()} ({seg.pct}%)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {segments.map((seg) => {
          const isSelected = selectedArea === seg.id;
          return (
            <div
              key={seg.label}
              onClick={() => onSelectArea && onSelectArea(isSelected ? null : seg.id)}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#0d223f] border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-[#07101f] border-[#13243d] hover:border-[#1c3558]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">
                  {seg.label.split('(')[0].trim()}
                </span>
                <span className={`text-[11px] font-mono font-bold ${seg.textColor}`}>
                  {seg.pct}%
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black font-mono tracking-tight ${seg.textColor}`}>
                  {seg.value?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) ?? '—'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">kW</span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans mt-1.5 leading-snug">
                {seg.role}
              </p>
            </div>
          );
        })}
      </div>

      {/* PUE Summary Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#14263f]">
        <div className="flex items-center gap-3 text-xs font-mono">
          <div>
            <span className="text-[9px] text-slate-400 uppercase block">Total Facility Demand</span>
            <span className="text-lg font-black text-slate-100">{total.toFixed(0)} <span className="text-[10px] text-slate-400 font-bold">kW</span></span>
          </div>
          <div className="w-px h-8 bg-[#162947]" />
          <div>
            <span className="text-[9px] text-slate-400 uppercase block">Grid Power</span>
            <span className="text-lg font-black text-slate-100">{(total / 1000).toFixed(3)} <span className="text-[10px] text-slate-400 font-bold">MW</span></span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-slate-400 font-mono uppercase block">
            POWER USAGE EFFECTIVENESS
          </span>
          <span className={`text-xl font-black font-mono ${pue <= 1.2 ? 'text-emerald-400' : pue <= 1.5 ? 'text-amber-400' : 'text-red-400'}`}>
            {pue?.toFixed(3) ?? '—'}
          </span>
          <span className="text-[9px] text-slate-400 font-mono ml-1">PUE</span>
        </div>
      </div>
    </div>
  );
}
