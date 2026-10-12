import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  ZapIcon,
  ThermometerIcon,
  SnowflakeIcon,
  GaugeIcon,
  ServerRackIcon,
} from './Icons.jsx';

/* ─── Metric Configurations (Data Center Operational Scenarios) ────────── */
const METRIC_TABS = [
  {
    id: 'power',
    label: 'Total Facility Demand',
    icon: ZapIcon,
    unit: 'kW',
    yDomain: [7000, 11500],
    yTicks: [7000, 8000, 9000, 10000, 11000],
    highLabel: 'Daily Peak Demand',
    lowLabel: 'Daily Base Demand',
    histHighLabel: 'Historical Max (Iowa-01)',
    histLowLabel: 'Historical Min (Iowa-01)',
    forecastLabel: '30-Day Model Forecast',
    formatVal: (v) => `${Math.round(v).toLocaleString()} kW`,
    anchor: 9707.71,
    highBase: 10250,
    lowBase: 9100,
    ampHigh: 750,
    ampLow: 500,
  },
  {
    id: 'it_load',
    label: 'IT Compute Equipment',
    icon: ServerRackIcon,
    unit: 'kW',
    yDomain: [5500, 9200],
    yTicks: [6000, 7000, 8000, 9000],
    highLabel: 'Peak Compute Workload',
    lowLabel: 'Base Compute Workload',
    histHighLabel: 'Historical Peak IT Load',
    histLowLabel: 'Historical Base IT Load',
    forecastLabel: '30-Day IT Forecast',
    formatVal: (v) => `${Math.round(v).toLocaleString()} kW`,
    anchor: 7572.0,
    highBase: 8050,
    lowBase: 7100,
    ampHigh: 580,
    ampLow: 390,
  },
  {
    id: 'temperature',
    label: 'Thermal Envelope',
    icon: ThermometerIcon,
    unit: '°C',
    yDomain: [10, 45],
    yTicks: [10, 20, 30, 40],
    highLabel: 'Rack Exhaust High',
    lowLabel: 'Cold Aisle Inlet Low',
    histHighLabel: 'Historical Summer Max',
    histLowLabel: 'Historical Winter Min',
    forecastLabel: '30-Day Thermal Forecast',
    formatVal: (v) => `${v.toFixed(1)}°C`,
    anchor: 24.0,
    highBase: 34.0,
    lowBase: 19.5,
    ampHigh: 5.5,
    ampLow: 3.5,
  },
  {
    id: 'cooling',
    label: 'Cooling / CRAC',
    icon: SnowflakeIcon,
    unit: 'kW',
    yDomain: [500, 2800],
    yTicks: [500, 1000, 1500, 2000, 2500],
    highLabel: 'Peak Chiller Draw',
    lowLabel: 'Economizer Baseline',
    histHighLabel: 'Historical Peak Cooling',
    histLowLabel: 'Historical Base Cooling',
    forecastLabel: '30-Day Cooling Forecast',
    formatVal: (v) => `${Math.round(v).toLocaleString()} kW`,
    anchor: 1795.0,
    highBase: 2150,
    lowBase: 920,
    ampHigh: 450,
    ampLow: 250,
  },
  {
    id: 'pue',
    label: 'PUE Efficiency',
    icon: GaugeIcon,
    unit: 'PUE',
    yDomain: [1.0, 1.45],
    yTicks: [1.05, 1.15, 1.25, 1.35],
    highLabel: 'Peak Daily PUE',
    lowLabel: 'Optimal Low PUE',
    histHighLabel: 'Historical Seasonal High',
    histLowLabel: 'Historical Optimum PUE',
    forecastLabel: '30-Day PUE Trajectory',
    formatVal: (v) => `${v.toFixed(3)} PUE`,
    anchor: 1.18,
    highBase: 1.26,
    lowBase: 1.12,
    ampHigh: 0.08,
    ampLow: 0.04,
  },
];

/* ─── Annual Realistic Data Point Generator ────────────────────────────── */
function generateAnnualTimeSeries(metric) {
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const daysInYear = 365;
  const series = [];

  for (let i = 0; i < daysInYear; i += 2) {
    const monthIndex = Math.min(11, Math.floor((i / daysInYear) * 12));
    const dayOfMonth = (i % 30) + 1;
    const monthName = months[monthIndex];
    const isYear2026 = monthIndex >= 2;
    const year = isYear2026 ? 2026 : 2025;
    const label = `${dayOfMonth} ${monthName} ${year}`;

    // Seasonal sinusoidal cycle (Iowa climate: highest summer in Jul/Aug, lowest Jan)
    // Month 8 (Aug) is peak, Month 2 (Jan) is trough
    const seasonalPhase = ((i - 60) / daysInYear) * 2 * Math.PI;
    const seasonalCoeff = Math.sin(seasonalPhase);

    // Realistic day-to-day noise
    const noiseHigh = Math.sin(i * 1.7) * (metric.ampHigh * 0.35) + Math.cos(i * 3.1) * (metric.ampHigh * 0.2);
    const noiseLow = Math.sin(i * 1.9 + 1) * (metric.ampLow * 0.3) + Math.cos(i * 2.7) * (metric.ampLow * 0.15);

    const dailyHigh = +(metric.highBase + seasonalCoeff * metric.ampHigh + noiseHigh).toFixed(2);
    const dailyLow = +(metric.lowBase + seasonalCoeff * metric.ampLow + noiseLow).toFixed(2);

    // Historical smoothed seasonal baseline
    const histDailyHigh = +(metric.highBase + seasonalCoeff * (metric.ampHigh * 0.85) + 40).toFixed(2);
    const histDailyLow = +(metric.lowBase + seasonalCoeff * (metric.ampLow * 0.85) - 20).toFixed(2);

    // Forecast projection for later period (e.g. Sep/Oct onwards)
    const isForecast = i > 300;
    const forecastVal = isForecast
      ? +(dailyHigh * 0.65 + histDailyHigh * 0.35 + Math.sin(i * 0.5) * (metric.ampHigh * 0.15)).toFixed(2)
      : null;

    series.push({
      index: i,
      month: monthName,
      dateLabel: label,
      displayMonth: i % 30 === 0 ? monthName : '',
      dailyHigh,
      dailyLow,
      histDailyHigh,
      histDailyLow,
      forecastVal,
      confidenceUpper: +(dailyHigh + metric.ampHigh * 0.25).toFixed(2),
      confidenceLower: +(dailyLow - metric.ampLow * 0.25).toFixed(2),
      isToday: i === 310, // Anchor "Today" marker in September
    });
  }

  return series;
}

/* ─── Inspiration-Matched Black Card Tooltip ───────────────────────────── */
function InspirationTooltip({ active, payload, activeMetric, visibility }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-[#071120] border border-[#1b3152] rounded-xl p-3.5 text-xs font-mono shadow-2xl min-w-[240px] select-none">
      <div className="flex items-center justify-between border-b border-[#1b3152] pb-2 mb-2">
        <span className="text-slate-200 font-bold tracking-wide">{d.dateLabel}</span>
        {d.isToday && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
            TODAY
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {visibility.dailyHigh && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
              <span>{activeMetric.highLabel}:</span>
            </span>
            <span className="text-red-400 font-bold">{activeMetric.formatVal(d.dailyHigh)}</span>
          </div>
        )}

        {visibility.histHigh && (
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/80" />
              <span>{activeMetric.histHighLabel}:</span>
            </span>
            <span className="text-slate-200 font-semibold">{activeMetric.formatVal(d.histDailyHigh)}</span>
          </div>
        )}

        {visibility.dailyLow && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_#3b82f6]" />
              <span>{activeMetric.lowLabel}:</span>
            </span>
            <span className="text-blue-400 font-bold">{activeMetric.formatVal(d.dailyLow)}</span>
          </div>
        )}

        {visibility.histLow && (
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>{activeMetric.histLowLabel}:</span>
            </span>
            <span className="text-slate-300 font-semibold">{activeMetric.formatVal(d.histDailyLow)}</span>
          </div>
        )}

        {visibility.forecast && d.forecastVal && (
          <div className="flex items-center justify-between pt-1 border-t border-[#13243d]">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
              <span>{activeMetric.forecastLabel}:</span>
            </span>
            <span className="text-cyan-400 font-bold">{activeMetric.formatVal(d.forecastVal)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MultiMetricTrendChart() {
  const [activeTabId, setActiveTabId] = useState('power');

  // Layer toggle checkboxes matching the inspiration design
  const [visibility, setVisibility] = useState({
    dailyLow: true,
    dailyHigh: true,
    forecast: true,
    histHigh: true,
    histLow: true,
    confidence: true,
  });

  const activeMetric = useMemo(
    () => METRIC_TABS.find((t) => t.id === activeTabId) || METRIC_TABS[0],
    [activeTabId]
  );

  const chartData = useMemo(() => generateAnnualTimeSeries(activeMetric), [activeMetric]);

  const toggleVisibility = (key) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="control-panel rounded-xl p-5 bg-[#091426] border border-[#162947] shadow-xl space-y-4 font-sans">

      {/* ── Top Bar: Metric Switcher Tabs ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14263f] pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {METRIC_TABS.map((tab) => {
            const isSelected = tab.id === activeTabId;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold font-mono transition-all ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(251,191,36,0.35)] ring-1 ring-amber-400/80 scale-[1.02]'
                    : 'bg-[#07101f] text-slate-400 hover:text-slate-200 border border-[#162744] hover:bg-[#0c182c]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
          <span>Multi-Year Model Validation Anchor</span>
        </div>
      </div>

      {/* ── Multi-Series High-Fidelity Chart ──────────────────────────────── */}
      <div className="relative" style={{ height: 380 }}>
        {/* "Today" badge overlay floating at marker */}
        <div className="absolute top-2 right-14 z-10">
          <span className="px-2.5 py-0.5 rounded bg-slate-800/90 border border-slate-600 text-slate-200 font-mono text-[10px] font-bold tracking-wider">
            Today
          </span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, bottom: 5, left: 10 }}>
            <defs>
              {/* Red Peak Gradient */}
              <linearGradient id="redPeakGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>

              {/* Blue Base Gradient */}
              <linearGradient id="blueBaseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>

              {/* Confidence Band Gradient */}
              <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#162947" vertical={false} />

            <XAxis
              dataKey="index"
              tickLine={false}
              axisLine={{ stroke: '#1a2d47' }}
              tick={({ x, y, payload }) => {
                const item = chartData[payload.value];
                if (!item || !item.displayMonth) return null;
                const isSep = item.displayMonth === 'Sep';
                return (
                  <text
                    x={x}
                    y={y + 14}
                    fill={isSep ? '#f8fafc' : '#7a8ca5'}
                    fontWeight={isSep ? 'bold' : 'normal'}
                    fontSize={11}
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {item.displayMonth}
                  </text>
                );
              }}
            />

            <YAxis
              tick={{ fill: '#7a8ca5', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#1a2d47' }}
              domain={activeMetric.yDomain}
              ticks={activeMetric.yTicks}
              width={65}
              tickFormatter={(v) => `${Math.round(v)}°`}
            />

            <Tooltip
              content={
                <InspirationTooltip activeMetric={activeMetric} visibility={visibility} />
              }
            />

            {/* Vertical Marker: "Today" in September */}
            <ReferenceLine
              x={310}
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />

            {/* Horizontal Grid Anchor Reference */}
            <ReferenceLine
              y={activeMetric.anchor}
              stroke="#06b6d4"
              strokeDasharray="6 6"
              strokeOpacity={0.5}
            />

            {/* Optional Confidence Shaded Envelope */}
            {visibility.confidence && (
              <Area
                type="monotone"
                dataKey="confidenceUpper"
                stroke="none"
                fill="url(#confidenceGrad)"
                isAnimationActive={false}
              />
            )}

            {/* Series 1: Daily High (Peak Envelope) */}
            {visibility.dailyHigh && (
              <Area
                type="monotone"
                dataKey="dailyHigh"
                stroke="#ef4444"
                strokeWidth={1.8}
                fill="url(#redPeakGrad)"
                isAnimationActive={false}
              />
            )}

            {/* Series 2: Daily Low (Base Load Envelope) */}
            {visibility.dailyLow && (
              <Area
                type="monotone"
                dataKey="dailyLow"
                stroke="#3b82f6"
                strokeWidth={1.8}
                fill="url(#blueBaseGrad)"
                isAnimationActive={false}
              />
            )}

            {/* Series 3: Historical Baseline High (Dotted White) */}
            {visibility.histHigh && (
              <Line
                type="monotone"
                dataKey="histDailyHigh"
                stroke="#cbd5e1"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {/* Series 4: Historical Baseline Low (Dotted Slate) */}
            {visibility.histLow && (
              <Line
                type="monotone"
                dataKey="histDailyLow"
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {/* Series 5: 30-Day Predictive Model Forecast (Cyan Dotted) */}
            {visibility.forecast && (
              <Line
                type="monotone"
                dataKey="forecastVal"
                stroke="#06b6d4"
                strokeDasharray="3 3"
                strokeWidth={2}
                dot={{ r: 2, fill: '#06b6d4' }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bottom Bar: Interactive Checkbox Layer Toggles ────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#14263f] font-mono text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* Checkbox 1: Daily Low */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibility.dailyLow}
              onChange={() => toggleVisibility('dailyLow')}
              className="w-3.5 h-3.5 rounded accent-blue-500 bg-[#07101f] border-[#162744]"
            />
            <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <span className="w-2.5 h-0.5 bg-blue-500" />
              <span>Daily low</span>
            </span>
          </label>

          {/* Checkbox 2: Daily High */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibility.dailyHigh}
              onChange={() => toggleVisibility('dailyHigh')}
              className="w-3.5 h-3.5 rounded accent-red-500 bg-[#07101f] border-[#162744]"
            />
            <span className="flex items-center gap-1.5 text-red-400 font-semibold">
              <span className="w-2.5 h-0.5 bg-red-500" />
              <span>Daily high</span>
            </span>
          </label>

          {/* Checkbox 3: 30-day forecast */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibility.forecast}
              onChange={() => toggleVisibility('forecast')}
              className="w-3.5 h-3.5 rounded accent-cyan-500 bg-[#07101f] border-[#162744]"
            />
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <span className="w-2.5 h-0.5 border-t border-dashed border-cyan-400" />
              <span>30 day forecast</span>
            </span>
          </label>

          {/* Checkbox 4: Historical daily temperature / baseline */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibility.histHigh}
              onChange={() => {
                toggleVisibility('histHigh');
                toggleVisibility('histLow');
              }}
              className="w-3.5 h-3.5 rounded accent-slate-300 bg-[#07101f] border-[#162744]"
            />
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <span className="w-2.5 h-0.5 border-t border-dashed border-slate-300" />
              <span>Historical baseline reference</span>
            </span>
          </label>

          {/* Checkbox 5: Confidence band */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibility.confidence}
              onChange={() => toggleVisibility('confidence')}
              className="w-3.5 h-3.5 rounded accent-slate-500 bg-[#07101f] border-[#162744]"
            />
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 bg-slate-500/20 border border-slate-500/40 rounded-sm" />
              <span>Confidence</span>
            </span>
          </label>
        </div>

        <span className="text-[10px] text-slate-500 font-mono">
          Hover curves to inspect cross-series variance
        </span>
      </div>

    </div>
  );
}
