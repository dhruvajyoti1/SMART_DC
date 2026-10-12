/**
 * EnvironmentalPanel — BMS Environmental Monitoring Card Grid
 *
 * Displays critical datacenter environmental parameters in a card grid.
 * In real datacenters, these sensors feed into the Building Management System (BMS)
 * and are mandatory per ASHRAE TC 9.9 guidelines for IT equipment thermal management.
 *
 * Each card shows:
 *   - Metric name with SCADA point tag
 *   - Large digital readout with engineering unit
 *   - Horizontal bar indicator with operating zone coloring
 *   - ASHRAE/design operating range reference
 *   - Rate-of-change trend indicator
 *
 * Props:
 *   envData {object} — Derived environmental readings from TelemetryContext
 *   compact {boolean} — Reduced spacing for tighter layouts
 */
import {
  ThermometerIcon,
  DropletIcon,
  SnowflakeIcon,
  CompressIcon,
  TrendUpIcon,
  TrendDownIcon,
  TrendStableIcon,
} from './Icons.jsx';

/* ── Zone classifier — maps value to ISA-18.2 severity ─────────────────── */
function classifyZone(value, zones) {
  for (const zone of zones) {
    if (value <= zone.max) return zone;
  }
  return zones[zones.length - 1];
}

/* ── Single Environmental Metric Card ──────────────────────────────────── */
function EnvMetricCard({ icon: Icon, label, tag, value, unit, min, max, zones, designRange, trend, statusText }) {
  const displayValue = value !== undefined && value !== null
    ? (typeof value === 'number' ? value.toFixed(1) : value)
    : '—';

  const numValue = Number(value) || 0;
  const fraction = Math.max(0, Math.min(1, (numValue - min) / (max - min)));
  const zone = classifyZone(numValue, zones);

  const TrendIcon = trend === 'rising' ? TrendUpIcon : trend === 'falling' ? TrendDownIcon : TrendStableIcon;
  const trendColor = trend === 'rising' ? 'text-amber-400' : trend === 'falling' ? 'text-cyan-400' : 'text-slate-400';
  const trendLabel = trend === 'rising' ? 'RISING' : trend === 'falling' ? 'FALLING' : 'STEADY';

  return (
    <div className="p-3.5 rounded-xl bg-[#07101f] border border-[#13243d] flex flex-col justify-between">
      {/* Header with icon, label, tag */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#0b1a30] border border-[#1a2d47] flex items-center justify-center flex-shrink-0">
            <Icon className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold leading-tight">
            {label}
          </span>
        </div>
        {tag && (
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#0b162a] text-slate-500 font-mono">
            {tag}
          </span>
        )}
      </div>

      {/* Large Digital Readout */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-2xl font-black font-mono tracking-tight" style={{ color: zone.color }}>
          {displayValue}
        </span>
        <span className="text-[10px] font-mono text-slate-400 font-bold">{unit}</span>
      </div>

      {/* Horizontal Bar Indicator */}
      <div className="mb-2">
        <div className="w-full h-2 bg-[#0b162a] rounded-full overflow-hidden border border-[#162744] relative">
          {/* Zone color segments background */}
          <div className="absolute inset-0 flex">
            {zones.map((z, i) => {
              const prevMax = i === 0 ? min : zones[i - 1].max;
              const segWidth = ((z.max - prevMax) / (max - min)) * 100;
              return (
                <div
                  key={i}
                  className="h-full opacity-20"
                  style={{ width: `${segWidth}%`, backgroundColor: z.color }}
                />
              );
            })}
          </div>
          {/* Value fill */}
          <div
            className="h-full rounded-full transition-all duration-500 relative z-10"
            style={{
              width: `${fraction * 100}%`,
              backgroundColor: zone.color,
              boxShadow: `0 0 8px ${zone.color}40`,
            }}
          />
        </div>
        {/* Scale labels */}
        <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-0.5">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      </div>

      {/* Zone Status + Trend + Design Range */}
      <div className="pt-2 border-t border-[#112036] space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: zone.color, boxShadow: `0 0 4px ${zone.color}` }}
            />
            <span className="text-[10px] font-mono font-semibold" style={{ color: zone.color }}>
              {zone.label}
            </span>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-[9px] font-mono font-semibold ${trendColor}`}>
              <TrendIcon className="w-2.5 h-2.5" />
              <span>{trendLabel}</span>
            </div>
          )}
        </div>
        {designRange && (
          <p className="text-[9px] text-slate-500 font-mono">
            Design Range: {designRange}
          </p>
        )}
        {statusText && (
          <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
            {statusText}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Main EnvironmentalPanel Component ─────────────────────────────────── */
export default function EnvironmentalPanel({ envData }) {
  if (!envData) return null;

  const {
    ambientTemp,
    serverInletTemp,
    chilledWaterTemp,
    relativeHumidity,
    underFloorPressure,
    ambientTrend,
    humidityTrend,
    pressureTrend,
  } = envData;

  /* ── ASHRAE TC 9.9 Recommended Envelopes for A1 class equipment ───── */
  const metrics = [
    {
      icon: ThermometerIcon,
      label: 'Ambient Air Temperature',
      tag: 'TT-AMB-01',
      value: ambientTemp,
      unit: '°C',
      min: 0,
      max: 50,
      zones: [
        { max: 27, color: '#10b981', label: 'ASHRAE Compliant' },
        { max: 35, color: '#f59e0b', label: 'Elevated' },
        { max: 50, color: '#ef4444', label: 'Critical — Cooling Required' },
      ],
      designRange: '18–27°C (ASHRAE A1)',
      trend: ambientTrend,
      statusText: ambientTemp <= 27
        ? 'Ambient temperature within optimal envelope; economizer free-cooling reduces chiller power draw.'
        : ambientTemp <= 35
        ? 'Elevated ambient temperature forces chillers off economizer mode, adding ~45 kW cooling demand per +1°C.'
        : 'Critical ambient heatwave — chillers at maximum capacity, driving total facility power toward trip envelope.',
    },
    {
      icon: ThermometerIcon,
      label: 'Server Rack Inlet Temp',
      tag: 'TT-INL-01',
      value: serverInletTemp,
      unit: '°C',
      min: 10,
      max: 40,
      zones: [
        { max: 25, color: '#10b981', label: 'Optimal Inlet' },
        { max: 30, color: '#f59e0b', label: 'Elevated Heat' },
        { max: 40, color: '#ef4444', label: 'Thermal Risk' },
      ],
      designRange: '18–25°C (Cold Aisle Target)',
      trend: ambientTrend, // correlated with ambient
      statusText: serverInletTemp <= 25
        ? 'Cold aisle inlet maintained below 25°C; server fan speeds and compute thermal throttling minimized.'
        : 'Rack inlet above target; CRAC blowers running at elevated RPM, adding auxiliary cooling electricity.',
    },
    {
      icon: SnowflakeIcon,
      label: 'Chilled Water Supply',
      tag: 'TT-CWS-01',
      value: chilledWaterTemp,
      unit: '°C',
      min: 4,
      max: 22,
      zones: [
        { max: 14, color: '#10b981', label: 'Normal Supply' },
        { max: 18, color: '#f59e0b', label: 'Reduced Delta-T' },
        { max: 22, color: '#ef4444', label: 'Insufficient Cooling' },
      ],
      designRange: '7–12°C (Chiller Loop)',
      trend: ambientTrend === 'rising' ? 'rising' : 'steady',
      statusText: chilledWaterTemp <= 14
        ? 'Chiller plant operating at optimal thermodynamic COP (Coefficient of Performance).'
        : 'Elevated supply water temperature lowers heat rejection rate and increases compressor energy draw.',
    },
    {
      icon: DropletIcon,
      label: 'Relative Humidity',
      tag: 'HT-RH-01',
      value: relativeHumidity,
      unit: '%',
      min: 10,
      max: 90,
      zones: [
        { max: 20, color: '#3b82f6', label: 'Low — ESD Risk' },
        { max: 60, color: '#10b981', label: 'ASHRAE Compliant' },
        { max: 80, color: '#f59e0b', label: 'Elevated Latent' },
        { max: 90, color: '#ef4444', label: 'Condensation Risk' },
      ],
      designRange: '20–60% RH (ASHRAE A1)',
      trend: humidityTrend,
      statusText: relativeHumidity >= 20 && relativeHumidity <= 60
        ? 'Optimal psychrometric balance; minimal dehumidification or steam humidification energy consumed.'
        : relativeHumidity < 20
        ? 'Low humidity requires active ultrasonic humidifiers, increasing auxiliary electricity consumption.'
        : 'High humidity triggers CRAC reheat and dehumidification cycles, increasing cooling energy draw.',
    },
    {
      icon: CompressIcon,
      label: 'Under-Floor Static Pressure',
      tag: 'PT-UF-01',
      value: underFloorPressure,
      unit: 'Pa',
      min: 0,
      max: 30,
      zones: [
        { max: 5, color: '#f59e0b', label: 'Low Airflow' },
        { max: 20, color: '#10b981', label: 'Optimal Plenum' },
        { max: 30, color: '#3b82f6', label: 'High Static' },
      ],
      designRange: '10–25 Pa (Plenum Distribution)',
      trend: pressureTrend,
      statusText: underFloorPressure >= 10 && underFloorPressure <= 25
        ? 'Plenum pressure provides uniform cold airflow distribution across high-density server rows.'
        : underFloorPressure < 10
        ? 'Low plenum pressure causes hot air bypass; CRAC fan speeds must be ramped up to compensate.'
        : 'High plenum static pressure indicates excessive blower power draw; fan variable-frequency drives (VFD) can be dialed down.',
    },
  ];

  return (
    <div className="control-panel rounded-xl p-5 bg-[#091426] border border-[#162947] shadow-xl space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14263f] pb-3">
        <div className="flex items-center gap-2">
          <ThermometerIcon className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              BMS Environmental Conditions Monitor
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              ASHRAE TC 9.9 compliant thermal and humidity monitoring — derived from facility power demand telemetry
            </p>
          </div>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded bg-[#102038] text-slate-400 font-mono font-semibold">
          5 SENSOR POINTS
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {metrics.map((m) => (
          <EnvMetricCard key={m.tag} {...m} />
        ))}
      </div>
    </div>
  );
}
