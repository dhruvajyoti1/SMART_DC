/**
 * GaugeCard — Industrial SVG semi-circle gauge for SCADA/BMS metrics.
 *
 * Displays a value within a defined range using a colored arc gauge,
 * styled for data center power and environmental monitoring.
 * Based on standard industrial gauge patterns (Honeywell Experion, Siemens WinCC).
 *
 * Props:
 *   label     {string}  — Metric name, e.g. "POWER USAGE EFFECTIVENESS"
 *   tag       {string}  — SCADA point tag, e.g. "PUE-01"
 *   value     {number}  — Current measured value
 *   min       {number}  — Scale minimum
 *   max       {number}  — Scale maximum
 *   unit      {string}  — Engineering unit, e.g. "PUE", "°C", "%"
 *   zones     {Array}   — [{max, color, label}] colored arc segments (ISA-18.2 aligned)
 *   trend     {string}  — 'rising'|'falling'|'steady'|null
 *   status    {string}  — Brief status text, e.g. "Within Target Envelope"
 *   compact   {boolean} — Render at reduced height for grid layouts
 */
import { TrendUpIcon, TrendDownIcon, TrendStableIcon } from './Icons.jsx';

export default function GaugeCard({
  label,
  tag,
  value,
  min = 0,
  max = 100,
  unit = '',
  zones = [],
  trend = null,
  status = '',
  compact = false,
}) {
  const clampedValue = Math.max(min, Math.min(max, value ?? min));
  const fraction = (clampedValue - min) / (max - min);

  // SVG arc geometry — semi-circle from 180° to 0° (left to right)
  const cx = 100;
  const cy = 90;
  const r = 70;
  const startAngle = Math.PI; // 180° (left)
  const endAngle = 0;        // 0° (right)

  // Convert fraction to angle position on arc
  const needleAngle = startAngle - fraction * Math.PI;
  const needleX = cx + r * Math.cos(needleAngle);
  const needleY = cy - r * Math.sin(needleAngle);

  // Create arc path for each zone segment
  const arcPaths = [];
  const sortedZones = [...zones].sort((a, b) => a.max - b.max);

  sortedZones.forEach((zone, i) => {
    const prevMax = i === 0 ? min : sortedZones[i - 1].max;
    const segStart = (prevMax - min) / (max - min);
    const segEnd = (zone.max - min) / (max - min);

    const startArc = startAngle - segStart * Math.PI;
    const endArc = startAngle - segEnd * Math.PI;

    const x1 = cx + r * Math.cos(startArc);
    const y1 = cy - r * Math.sin(startArc);
    const x2 = cx + r * Math.cos(endArc);
    const y2 = cy - r * Math.sin(endArc);

    // In a semi-circle gauge (total span = 180° = π rad), any sub-arc segment spans
    // at most 180° of the full circle. SVG large-arc-flag is 1 only when angle > 180°.
    // Therefore, for semi-circular arcs, largeArc is always 0.
    arcPaths.push(
      <path
        key={i}
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
        stroke={zone.color}
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
    );
  });

  // Determine current zone for value coloring
  let valueColor = '#e2e8f0';
  let currentZoneLabel = '';
  for (const zone of sortedZones) {
    if (clampedValue <= zone.max) {
      valueColor = zone.color;
      currentZoneLabel = zone.label || '';
      break;
    }
  }
  // If beyond all zones, use the last zone
  if (!currentZoneLabel && sortedZones.length > 0) {
    valueColor = sortedZones[sortedZones.length - 1].color;
    currentZoneLabel = sortedZones[sortedZones.length - 1].label || '';
  }

  const TrendIcon = trend === 'rising' ? TrendUpIcon : trend === 'falling' ? TrendDownIcon : TrendStableIcon;
  const trendColor = trend === 'rising' ? 'text-amber-400' : trend === 'falling' ? 'text-cyan-400' : 'text-slate-400';
  const trendLabel = trend === 'rising' ? 'RISING' : trend === 'falling' ? 'FALLING' : 'STEADY';

  const displayValue = value !== undefined && value !== null
    ? (typeof value === 'number' ? value.toFixed(value < 10 ? 2 : 1) : value)
    : '—';

  return (
    <div className="control-panel rounded-xl p-4 bg-[#091426] border border-[#162947]">
      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold leading-tight max-w-[65%]">
          {label}
        </span>
        {tag && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#102038] text-slate-400 font-mono font-semibold flex-shrink-0">
            {tag}
          </span>
        )}
      </div>

      {/* SVG Gauge */}
      <div className={`flex justify-center ${compact ? '-my-1' : 'my-1'}`}>
        <svg
          viewBox="0 0 200 110"
          className={compact ? 'w-36 h-auto' : 'w-44 h-auto'}
          aria-label={`${label}: ${displayValue} ${unit}`}
        >
          {/* Background track */}
          <path
            d={`M ${cx + r * Math.cos(startAngle)} ${cy - r * Math.sin(startAngle)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(endAngle)} ${cy - r * Math.sin(endAngle)}`}
            stroke="#1a2d47"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />

          {/* Colored zone arcs */}
          {arcPaths}

          {/* Needle indicator dot */}
          {value !== undefined && value !== null && (
            <>
              {/* Needle line from center to indicator */}
              <line
                x1={cx}
                y1={cy}
                x2={needleX}
                y2={needleY}
                stroke={valueColor}
                strokeWidth="2"
                opacity="0.6"
              />
              {/* Indicator dot */}
              <circle
                cx={needleX}
                cy={needleY}
                r="5"
                fill={valueColor}
                stroke="#091426"
                strokeWidth="2"
              />
              {/* Center pivot */}
              <circle cx={cx} cy={cy} r="3" fill="#1a2d47" />
            </>
          )}

          {/* Digital readout in center */}
          <text
            x={cx}
            y={cy - 15}
            textAnchor="middle"
            className="font-mono font-black"
            fill={valueColor}
            fontSize="22"
          >
            {displayValue}
          </text>
          <text
            x={cx}
            y={cy + 2}
            textAnchor="middle"
            className="font-mono"
            fill="#7a8ca5"
            fontSize="10"
          >
            {unit}
          </text>

          {/* Scale labels */}
          <text x="25" y={cy + 16} textAnchor="middle" fill="#4a5568" fontSize="8" className="font-mono">
            {min}
          </text>
          <text x="175" y={cy + 16} textAnchor="middle" fill="#4a5568" fontSize="8" className="font-mono">
            {max}
          </text>
        </svg>
      </div>

      {/* Status + Zone Label */}
      <div className="flex items-center justify-between mt-1 pt-2 border-t border-[#13243d]">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: valueColor, boxShadow: `0 0 6px ${valueColor}` }}
          />
          <span className="text-[11px] font-mono font-semibold" style={{ color: valueColor }}>
            {currentZoneLabel}
          </span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-mono font-semibold ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{trendLabel}</span>
          </div>
        )}
      </div>

      {/* Status description */}
      {status && (
        <p className="text-[10px] text-slate-400 font-sans mt-1.5 leading-relaxed">
          {status}
        </p>
      )}
    </div>
  );
}
