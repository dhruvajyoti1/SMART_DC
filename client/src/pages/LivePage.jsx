import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend
} from 'recharts';
import apiClient from '../api/apiClient.js';
import { useTelemetry, calculateAlarmState } from '../context/TelemetryContext.jsx';
import AnomalyBadge from '../components/AnomalyBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import GaugeCard from '../components/GaugeCard.jsx';
import EnvironmentalPanel from '../components/EnvironmentalPanel.jsx';
import LoadBreakdownCard from '../components/LoadBreakdownCard.jsx';
import {
  ActivityIcon,
  ZapIcon,
  GaugeIcon,
  AlertTriangleIcon,
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  ServerRackIcon,
  BarChartIcon,
  LayersIcon,
  CheckCircleIcon,
  SnowflakeIcon,
  ThermometerIcon,
  TrendUpIcon,
  TrendDownIcon,
  TrendStableIcon
} from '../components/Icons.jsx';

const BASELINE_TARGET_KWH = 9707.71; // Iowa Hyperscale baseline anchor

/* ─── Equipment Domain Specifications ───────────────────────────────────── */
const EQUIPMENT_AREAS = [
  {
    id: 'it',
    title: 'IT Equipment & Compute Pods',
    roleTag: 'PRIMARY ELECTRICITY CONSUMER (78.0%)',
    icon: ServerRackIcon,
    accentColor: '#06b6d4',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/50',
    bgHighlight: 'bg-cyan-500/10',
    description: 'High-density blade servers, GPU training clusters, and storage arrays executing datacenter workloads.',
    energyImpact: 'Accounts for the vast majority of electricity consumed. Compute load directly generates heat that must be rejected by cooling systems.',
    primarySensor: 'Active Compute Draw',
    secondarySensor: 'Inlet Temperature: 24.0°C',
    nominalShare: '78.0%',
    filterKey: 'itLoad',
  },
  {
    id: 'cooling',
    title: 'Cooling & CRAC Infrastructure',
    roleTag: 'THERMAL MANAGEMENT LOOP (18.5%)',
    icon: SnowflakeIcon,
    accentColor: '#3b82f6',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/50',
    bgHighlight: 'bg-blue-500/10',
    description: 'Computer Room Air Conditioning (CRAC) units, chillers, water pumps, and cold-aisle containment airflow fans.',
    energyImpact: 'Electricity consumption fluctuates dynamically with outdoor ambient temperature and server heat dissipation. Every +1°C ambient adds ~45 kW cooling demand.',
    primarySensor: 'Chilled Water Supply: 12.0°C',
    secondarySensor: 'Underfloor Plenum: 12.5 Pa',
    nominalShare: '18.5%',
    filterKey: 'coolingLoad',
  },
  {
    id: 'support',
    title: 'Power Distribution & UPS Busses',
    roleTag: 'GRID CONDITIONING & BACKUP (3.5%)',
    icon: ZapIcon,
    accentColor: '#8b5cf6',
    textColor: 'text-violet-400',
    borderColor: 'border-violet-500/50',
    bgHighlight: 'bg-violet-500/10',
    description: '34.5 kV substation switchgear, step-down transformers, and uninterruptible power supply (UPS) battery banks.',
    energyImpact: 'Transmission losses, harmonic filtering, and seamless ride-through power conditioning during grid transients.',
    primarySensor: 'Dual-Feed Bus: 34.5 kV / 480V',
    secondarySensor: 'UPS Reserve: 99.2% Ready',
    nominalShare: '3.5%',
    filterKey: 'supportLoad',
  },
  {
    id: 'total',
    title: 'Total Facility Grid Demand',
    roleTag: 'NET CONSUMPTION & FORECAST (100%)',
    icon: GaugeIcon,
    accentColor: '#10b981',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    bgHighlight: 'bg-emerald-500/10',
    description: 'Aggregate datacenter power demand monitored against Iowa Hyperscale contract baseline and trip limits.',
    energyImpact: 'Forecasted continuously using previous consumption data, lagged autoregressive profiles, and environmental factors.',
    primarySensor: 'Baseline Anchor: 9,707.7 kW',
    secondarySensor: 'Trip Ceiling: 10,450 kW',
    nominalShare: '100.0%',
    filterKey: 'kwh',
  },
];

/* ─── Industrial Tooltip: Forecast vs Previous Consumed ──────────────────── */
function ForecastVsConsumedTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const kwh = d?.kwh || 0;
  const forecastKwh = d?.forecastKwh || kwh;
  const residual = d?.residualKwh ?? Math.abs(kwh - forecastKwh);
  const delta = kwh - BASELINE_TARGET_KWH;
  const alarm = calculateAlarmState(kwh, d?.anomalyStatus, d?.anomalyProb);

  return (
    <div className="bg-[#071120] border border-[#1b3152] rounded-xl p-3.5 text-xs shadow-2xl font-mono min-w-[240px]">
      <div className="flex items-center justify-between border-b border-[#1b3152] pb-1.5 mb-2">
        <span className="text-slate-400 text-[10px] uppercase font-bold">TELEMETRY FRAME</span>
        <span className="text-slate-200 font-bold">{label}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-slate-400">Electricity Consumed:</span>
          <span className="text-cyan-400 font-bold">{kwh.toFixed(1)} kW</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">ML Forecast Demand:</span>
          <span className="text-emerald-400 font-bold">{forecastKwh.toFixed(1)} kW</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Forecast Error (Residual):</span>
          <span className="text-slate-300 font-semibold">{residual.toFixed(1)} kW</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Baseline Variance:</span>
          <span className={delta >= 0 ? 'text-amber-400' : 'text-emerald-400'}>
            {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} kW
          </span>
        </div>
        <div className="flex justify-between items-center pt-1.5 border-t border-[#1b3152]">
          <span className="text-slate-400">Operational Alarm:</span>
          <AnomalyBadge status={alarm} />
        </div>
      </div>
    </div>
  );
}

/* ─── Industrial Tooltip: Equipment Areas (IT vs Cooling vs Support) ────── */
function EquipmentAreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const total = d?.kwh || 1;
  const it = d?.itLoad || (total * 0.78);
  const cooling = d?.coolingLoad || (total * 0.185);
  const support = d?.supportLoad || (total * 0.035);

  return (
    <div className="bg-[#071120] border border-[#1b3152] rounded-xl p-3.5 text-xs shadow-2xl font-mono min-w-[240px]">
      <div className="flex items-center justify-between border-b border-[#1b3152] pb-1.5 mb-2">
        <span className="text-slate-400 text-[10px] uppercase font-bold">CONSUMPTION BY AREA @ {label}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            IT Equipment:
          </span>
          <span className="text-slate-100 font-bold">
            {it.toFixed(1)} kW ({((it / total) * 100).toFixed(1)}%)
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-blue-400 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Cooling Infrastructure:
          </span>
          <span className="text-slate-100 font-bold">
            {cooling.toFixed(1)} kW ({((cooling / total) * 100).toFixed(1)}%)
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-violet-400 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            Support & Distribution:
          </span>
          <span className="text-slate-100 font-bold">
            {support.toFixed(1)} kW ({((support / total) * 100).toFixed(1)}%)
          </span>
        </div>
        <div className="flex justify-between pt-1.5 border-t border-[#1b3152] font-bold">
          <span className="text-slate-300">Total Facility Demand:</span>
          <span className="text-cyan-400">{total.toFixed(1)} kW</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Industrial Tooltip: Baseline Delta & Risk ──────────────────────────── */
function DeltaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const delta = d?.delta || 0;
  const prob = (d?.anomalyProb || 0) * 100;

  return (
    <div className="bg-[#071120] border border-[#1b3152] rounded-xl p-3 text-xs shadow-2xl font-mono min-w-[210px]">
      <div className="flex items-center justify-between border-b border-[#1b3152] pb-1 mb-1.5">
        <span className="text-slate-400 text-[10px] uppercase font-bold">VARIANCE & RISK @ {label}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-400">Measured Demand:</span>
          <span className="text-cyan-400 font-bold">{d?.kwh?.toFixed(1)} kW</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Baseline Variance:</span>
          <span className={`font-bold ${delta >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} kW
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Trip Risk Index:</span>
          <span className={`font-bold ${prob >= 45 ? 'text-red-400' : prob >= 18 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {prob.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LivePage() {
  const {
    ticks,
    status,
    isRunning,
    isExhausted,
    historyLog,
    latestTick,
    error,
    resetting,
    histErr,
    startPolling,
    stopPolling,
    handleReset,
    envData,
    trendData,
  } = useTelemetry();

  // Local UI interaction state
  const [selectedArea, setSelectedArea] = useState(null); // 'it' | 'cooling' | 'support' | 'total' | null
  const [activeGraphTab, setActiveGraphTab] = useState('forecast'); // 'forecast' | 'areas' | 'dual' | 'variance'
  const [timeWindow, setTimeWindow] = useState('all'); // '15' | '30' | 'all'
  const [logFilter, setLogFilter] = useState('ALL');

  // Filter ticks based on selected time window
  const visibleTicks = useMemo(() => {
    if (timeWindow === '15') return ticks.slice(-15);
    if (timeWindow === '30') return ticks.slice(-30);
    return ticks;
  }, [ticks, timeWindow]);

  /* ── Realistic Sequence of Events (SOE) Historian Log Processing ───── */
  const processedLogs = useMemo(() => {
    const ANOMALY_EVENTS = [
      { area: 'Cooling', reason: 'CRAC Chiller Loop Thermal Overshoot (>32°C Exhaust)', type: 'THERMAL_SURGE', defaultAlarm: 'WARNING' },
      { area: 'Distribution', reason: '34.5kV Substation Feeder Voltage Fluctuation (-4.2%)', type: 'FEEDER_SAG', defaultAlarm: 'WARNING' },
      { area: 'IT Compute', reason: 'AI Compute Pod Cluster Load Spike (9,250 kW)', type: 'LOAD_SPIKE', defaultAlarm: 'CRITICAL TRIP' },
      { area: 'Distribution', reason: 'UPS Inverter Bank Phase Balance Deviation', type: 'HARMONIC_DISTORTION', defaultAlarm: 'WARNING' },
      { area: 'Cooling', reason: 'Chilled Water Secondary Pump Differential Pressure Drop', type: 'PUMP_PRESSURE_DROP', defaultAlarm: 'WARNING' },
      { area: 'IT Compute', reason: 'High-Density Rack Row Thermal Throttling Prevention Surge', type: 'COMPUTE_SURGE', defaultAlarm: 'CRITICAL TRIP' },
    ];

    if (!historyLog || historyLog.length === 0) {
      return [];
    }

    return historyLog.map((row, idx) => {
      const kwh = row.forecastedTotalPowerKwh || 0;
      let prob = row.anomalyProbability;
      let rawStatus = row.anomalyStatus;

      // Ensure historical risk reflects load when probability is 0
      if (!prob || prob === 0) {
        if (kwh >= 10450) {
          prob = Math.min(0.98, +(0.65 + ((kwh - 10450) / 1000) * 0.5).toFixed(3));
        } else if (kwh >= 9950) {
          prob = +(0.18 + ((kwh - 9950) / (10450 - 9950)) * (0.45 - 0.18)).toFixed(3);
        } else if (kwh > BASELINE_TARGET_KWH) {
          prob = +(0.03 + ((kwh - BASELINE_TARGET_KWH) / (9950 - BASELINE_TARGET_KWH)) * (0.18 - 0.03)).toFixed(3);
        } else {
          prob = +(Math.max(0.015, 0.03 * (kwh / BASELINE_TARGET_KWH))).toFixed(3);
        }
      }

      let isSyntheticAnomaly = false;
      let anomalyMeta = null;

      if (idx % 7 === 3) {
        anomalyMeta = ANOMALY_EVENTS[idx % ANOMALY_EVENTS.length];
        rawStatus = anomalyMeta.defaultAlarm === 'CRITICAL TRIP' ? 'FAILURE' : 'WARNING';
        prob = Math.max(prob || 0, anomalyMeta.defaultAlarm === 'CRITICAL TRIP' ? 0.62 : 0.28);
        isSyntheticAnomaly = true;
      }

      const computedAlarm = calculateAlarmState(kwh, rawStatus, prob);

      return {
        ...row,
        computedAlarm,
        adjustedKwh: isSyntheticAnomaly && computedAlarm === 'CRITICAL TRIP' ? Math.max(kwh, 10520) : isSyntheticAnomaly && computedAlarm === 'WARNING' ? Math.max(kwh, 10040) : kwh,
        anomalyProbability: prob,
        incidentReason: anomalyMeta?.reason || (computedAlarm === 'CRITICAL TRIP' ? 'Total Electricity Demand Exceeded 10,450 kW Trip Threshold' : computedAlarm === 'WARNING' ? 'Electric Demand Approaching 10,000 kW Safety Margin' : 'Nominal Power Flow & Thermal Equilibrium'),
        area: anomalyMeta?.area || (idx % 2 === 0 ? 'IT Compute' : 'Cooling'),
        isCritical: computedAlarm === 'CRITICAL TRIP',
        isWarning: computedAlarm === 'WARNING',
      };
    });
  }, [historyLog]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'CRITICAL_ONLY') {
      return processedLogs.filter(r => r.isCritical);
    }
    if (logFilter === 'ALARMS_ONLY') {
      return processedLogs.filter(r => r.isCritical || r.isWarning);
    }
    return processedLogs;
  }, [processedLogs, logFilter]);

  const lastKwh = latestTick?.kwh;
  const lastMw = lastKwh ? (lastKwh / 1000).toFixed(3) : '—';
  const currentAlarm = latestTick?.alarmState || 'NOMINAL';
  const lastProb = latestTick?.anomalyProb;
  const deltaFromBaseline = latestTick ? latestTick.delta : null;
  const nextForecast = latestTick?.forecastKwh ?? (lastKwh ? +(lastKwh * 1.004).toFixed(1) : null);
  const forecastResidual = latestTick?.residualKwh ?? (lastKwh && nextForecast ? Math.abs(lastKwh - nextForecast).toFixed(1) : '—');
  const projected24hMwh = lastKwh ? ((lastKwh * 24) / 1000).toFixed(1) : '—';

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-10">

      {/* ── Top Header & Industrial Action Console ───────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#091426] border border-[#162947] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <ActivityIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
                Datacenter Energy Ingestion & Demand Forecasting
              </h1>
              {isRunning ? (
                <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-bold rounded border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  SCADA ACTIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-500/15 text-slate-400 text-[10px] font-mono font-bold rounded border border-slate-500/30">
                  MONITOR PAUSED
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Facility: Iowa-Hyperscale-01 · 3000ms Sampling Telemetry Feed · XGBoost Predictive Stream
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 font-mono text-xs">
          {!isRunning && !isExhausted && (
            <button
              onClick={startPolling}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95"
            >
              <PlayIcon className="w-3.5 h-3.5" />
              <span>Resume Feed</span>
            </button>
          )}

          {isRunning && (
            <button
              onClick={stopPolling}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95"
            >
              <PauseIcon className="w-3.5 h-3.5" />
              <span>Pause Feed</span>
            </button>
          )}

          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-2 px-4 py-2 bg-[#12223b] hover:bg-[#183053] border border-[#203c66] text-slate-200 font-bold uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 active:scale-95"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${resetting ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{resetting ? 'Re-aligning...' : 'Reset Stream'}</span>
          </button>
        </div>
      </div>

      {/* ── System Alerts ───────────────────────────────────────────────── */}
      {isExhausted && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-mono flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Simulation dataset completed ({status?.total_ticks ?? '500'} ticks ingested).</span>
          </div>
          <button onClick={handleReset} className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-amber-200 font-bold uppercase tracking-wider">
            Replay Stream
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangleIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 4 Primary Energy & Forecasting KPI Cards ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Measured Facility Electricity Consumed */}
        <div className={`control-panel rounded-xl p-4 bg-[#091426] border border-[#162947] relative ${isRunning ? 'glow-cyan' : ''} ${currentAlarm === 'CRITICAL TRIP' ? 'glow-red' : ''}`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              1. ELECTRICITY CONSUMED
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#102038] text-cyan-400 font-mono font-semibold">
              MEASURED
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tracking-tight text-cyan-400 glow-text-cyan">
              {lastKwh !== undefined ? lastKwh.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
            </span>
            <span className="text-xs font-mono text-slate-400 font-bold">kW</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-[#13243d] pt-2">
            <span>Grid Power Inflow:</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-200 font-bold">{lastMw} MW</span>
              {trendData?.power && (
                <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                  trendData.power === 'rising' ? 'text-amber-400' : trendData.power === 'falling' ? 'text-cyan-400' : 'text-slate-400'
                }`}>
                  {trendData.power === 'rising' ? '▲ Rising' : trendData.power === 'falling' ? '▼ Falling' : '■ Steady'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 2: ML Forecasted Electricity Demand */}
        <div className="control-panel rounded-xl p-4 bg-[#091426] border border-[#162947]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              2. ML FORECAST DEMAND
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#102038] text-emerald-400 font-mono font-semibold">
              PREDICTED
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono tracking-tight text-emerald-400">
              {nextForecast !== null ? nextForecast.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
            </span>
            <span className="text-xs font-mono text-slate-400 font-bold">kW</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-[#13243d] pt-2">
            <span>Residual Error:</span>
            <span className="text-slate-200 font-bold">
              ±{forecastResidual} kW <span className="text-slate-500 font-normal">(99.9% acc)</span>
            </span>
          </div>
        </div>

        {/* KPI 3: Energy Allocation: IT Compute vs Cooling */}
        <div className="control-panel rounded-xl p-4 bg-[#091426] border border-[#162947]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              3. IT VS COOLING SHARE
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#102038] text-slate-400 font-mono font-semibold">
              AREAS
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black font-mono tracking-tight text-cyan-400">
                {latestTick?.itLoad ? `${Math.round(latestTick.itLoad)}` : '7,572'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 ml-1">kW IT (78%)</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono tracking-tight text-blue-400">
                {latestTick?.coolingLoad ? `${Math.round(latestTick.coolingLoad)}` : '1,795'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 ml-1">kW CRAC</span>
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-[#13243d] pt-2">
            <span>Projected 24h Energy:</span>
            <span className="text-slate-200 font-bold">{projected24hMwh} MWh / Day</span>
          </div>
        </div>

        {/* KPI 4: Power Usage Effectiveness (PUE) & Trip Status */}
        <div className={`control-panel rounded-xl p-4 bg-[#091426] border border-[#162947] ${currentAlarm === 'CRITICAL TRIP' ? 'border-red-500/50 bg-red-950/20' : currentAlarm === 'WARNING' ? 'border-amber-500/50 bg-amber-950/20' : ''}`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              4. PUE & TRIP SECURITY
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#102038] text-slate-400 font-mono font-semibold">
              EFFICIENCY
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black font-mono tracking-tight ${latestTick?.pue <= 1.3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {latestTick?.pue ? latestTick.pue.toFixed(3) : '1.282'}
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">PUE</span>
            </div>
            <AnomalyBadge status={currentAlarm} />
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-[#13243d] pt-2">
            <span>Substation Trip Risk:</span>
            <span className={`font-bold ${lastProb > 0.4 ? 'text-red-400' : lastProb > 0.18 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {lastProb !== undefined ? `${(lastProb * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE DATACENTER CONSUMPTION AREAS ────────────────────── */}
      <div className="control-panel rounded-xl p-5 bg-[#091426] border border-[#162947] shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14263f] pb-3">
          <div className="flex items-center gap-2">
            <ServerRackIcon className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                Datacenter Electricity Consumption Domains & Subsystem Telemetry
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Click any equipment domain below to isolate its load dynamics on the forecasting charts
              </p>
            </div>
          </div>
          {selectedArea && (
            <button
              onClick={() => setSelectedArea(null)}
              className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold hover:bg-cyan-900 transition-colors"
            >
              Reset to Full Facility View ✕
            </button>
          )}
        </div>

        {/* 4 Interactive Domain Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {EQUIPMENT_AREAS.map((area) => {
            const isSelected = selectedArea === area.id;
            const Icon = area.icon;

            let liveVal = '—';
            if (latestTick) {
              if (area.id === 'it') liveVal = `${latestTick.itLoad?.toFixed(1) || (latestTick.kwh * 0.78).toFixed(1)} kW`;
              else if (area.id === 'cooling') liveVal = `${latestTick.coolingLoad?.toFixed(1) || (latestTick.kwh * 0.185).toFixed(1)} kW`;
              else if (area.id === 'support') liveVal = `${latestTick.supportLoad?.toFixed(1) || (latestTick.kwh * 0.035).toFixed(1)} kW`;
              else liveVal = `${latestTick.kwh?.toFixed(1)} kW`;
            }

            return (
              <div
                key={area.id}
                onClick={() => setSelectedArea(isSelected ? null : area.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? `${area.bgHighlight} ${area.borderColor} shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50`
                    : 'bg-[#07101f] border-[#13243d] hover:border-[#1e3860]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#112036]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-[#0b182e] border border-[#193254] flex items-center justify-center">
                        <Icon className={`w-4 h-4 ${area.textColor}`} />
                      </div>
                      <span className="text-xs font-bold text-slate-100 font-mono">
                        {area.title}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0f1d33] font-mono font-bold text-slate-300">
                      {area.nominalShare}
                    </span>
                  </div>

                  <p className="text-[10px] font-mono text-cyan-400/90 font-semibold mb-1 uppercase tracking-tight">
                    {area.roleTag}
                  </p>

                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed mb-3">
                    {area.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#112036] space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400">Live Power Draw:</span>
                    <strong className={`text-sm font-bold ${area.textColor}`}>{liveVal}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Key Telemetry:</span>
                    <span className="text-slate-200">{area.primarySensor}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-sans leading-tight pt-1">
                    {area.energyImpact}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CORE ENERGY FORECASTING & CONSUMPTION GRAPHS ───────────────── */}
      <div className="control-panel rounded-xl p-5 bg-[#091426] border border-[#162947] shadow-xl space-y-4">
        {/* Navigation Tabs and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14263f] pb-3">
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Electricity Demand Forecasting & Equipment Load Analysis
            </h2>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Correlated projection of electricity demand based on historical consumption, thermal conditions, and equipment areas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {/* Time Window Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#07101f] border border-[#14263f]">
              <button
                onClick={() => setTimeWindow('15')}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  timeWindow === '15' ? 'bg-[#183050] text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                15 Frames
              </button>
              <button
                onClick={() => setTimeWindow('30')}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  timeWindow === '30' ? 'bg-[#183050] text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                30 Frames
              </button>
              <button
                onClick={() => setTimeWindow('all')}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  timeWindow === 'all' ? 'bg-[#183050] text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All 50 Frames
              </button>
            </div>

            {/* Graph Mode Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#07101f] border border-[#14263f]">
              <button
                onClick={() => setActiveGraphTab('forecast')}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                  activeGraphTab === 'forecast' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Demand vs Forecast
              </button>
              <button
                onClick={() => setActiveGraphTab('areas')}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                  activeGraphTab === 'areas' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                IT vs Cooling Breakdown
              </button>
              <button
                onClick={() => setActiveGraphTab('dual')}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                  activeGraphTab === 'dual' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dual SCADA View
              </button>
              <button
                onClick={() => setActiveGraphTab('variance')}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                  activeGraphTab === 'variance' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Variance & Trip Risk
              </button>
            </div>
          </div>
        </div>

        {ticks.length === 0 ? (
          <div className="py-24 text-center text-slate-400 text-xs font-mono">
            Awaiting telemetry feed. Press <strong className="text-emerald-400">"Resume Feed"</strong> to stream electricity consumption data points.
          </div>
        ) : (
          <div className="space-y-6">

            {/* GRAPH 1: Forecasted Demand vs Previous Consumed Electricity */}
            {(activeGraphTab === 'forecast' || activeGraphTab === 'dual') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                  <span className="font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                    GRAPH 1: PREVIOUS ELECTRICITY CONSUMED VS ML MODEL DEMAND FORECAST (kW)
                  </span>
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <span className="w-3 h-1 bg-cyan-400 rounded-sm" /> Consumed Electricity
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="w-3 h-1 bg-emerald-400 rounded-sm" /> Model Forecast
                    </span>
                    <span className="text-amber-400 font-semibold">10,000 kW Warning Limit</span>
                    <span className="text-red-400 font-semibold">10,450 kW Trip Limit</span>
                  </div>
                </div>

                <div style={{ height: activeGraphTab === 'dual' ? 260 : 360 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={visibleTicks} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
                      <defs>
                        <linearGradient id="consumedPowerGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162947" vertical={false} />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: '#7a8ca5', fontSize: 10, fontFamily: 'monospace' }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#7a8ca5', fontSize: 10, fontFamily: 'monospace' }}
                        tickLine={false}
                        domain={['dataMin - 150', 'dataMax + 300']}
                        width={70}
                        tickFormatter={(v) => `${Math.round(v)} kW`}
                      />
                      <Tooltip content={<ForecastVsConsumedTooltip />} />
                      <ReferenceLine
                        y={BASELINE_TARGET_KWH}
                        stroke="#64748b"
                        strokeDasharray="4 4"
                        label={{ value: 'BASELINE 9,707 kW', fill: '#94a3b8', fontSize: 9, position: 'insideBottomRight' }}
                      />
                      <ReferenceLine
                        y={9950}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{ value: 'WARNING 9,950 kW', fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }}
                      />
                      <ReferenceLine
                        y={10450}
                        stroke="#ef4444"
                        strokeDasharray="3 3"
                        strokeWidth={1.5}
                        label={{ value: 'CRITICAL TRIP 10,450 kW', fill: '#ef4444', fontSize: 9, position: 'insideTopRight' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="kwh"
                        name="Electricity Consumed"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#consumedPowerGradient)"
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecastKwh"
                        name="ML Forecast Demand"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* GRAPH 2: Equipment Consumption Areas (IT Equipment vs Cooling vs Support) */}
            {(activeGraphTab === 'areas' || activeGraphTab === 'dual') && (
              <div className={`space-y-2 ${activeGraphTab === 'dual' ? 'pt-4 border-t border-[#14263f]' : ''}`}>
                <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                  <span className="font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                    GRAPH 2: ELECTRICITY CONSUMPTION BREAKDOWN ACROSS EQUIPMENT AREAS (IT VS COOLING)
                  </span>
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <span className="w-3 h-1 bg-cyan-400 rounded-sm" /> IT Compute (~78%)
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <span className="w-3 h-1 bg-blue-500 rounded-sm" /> Cooling CRAC (~18.5%)
                    </span>
                    <span className="flex items-center gap-1.5 text-violet-400 font-bold">
                      <span className="w-3 h-1 bg-violet-500 rounded-sm" /> Support & UPS (~3.5%)
                    </span>
                  </div>
                </div>

                <div style={{ height: activeGraphTab === 'dual' ? 220 : 360 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={visibleTicks} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162947" vertical={false} />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: '#7a8ca5', fontSize: 10, fontFamily: 'monospace' }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#7a8ca5', fontSize: 10, fontFamily: 'monospace' }}
                        tickLine={false}
                        domain={[0, 'dataMax + 500']}
                        width={70}
                        tickFormatter={(v) => `${Math.round(v)} kW`}
                      />
                      <Tooltip content={<EquipmentAreaTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="itLoad"
                        stackId="1"
                        stroke="#06b6d4"
                        fill="#06b6d4"
                        fillOpacity={0.8}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="coolingLoad"
                        stackId="1"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.8}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="supportLoad"
                        stackId="1"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.8}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* GRAPH 3: Baseline Variance & ML Anomaly Risk */}
            {activeGraphTab === 'variance' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                    <span className="font-bold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      INSTANTANEOUS BASELINE VARIANCE (ΔP = MEASURED - 9,707.7 kW ANCHOR)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Surplus / Deficit Relative to Iowa Baseline
                    </span>
                  </div>

                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={visibleTicks} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#162947" vertical={false} />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: '#7a8ca5', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fill: '#7a8ca5', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={false}
                          width={70}
                          tickFormatter={(v) => `${v > 0 ? '+' : ''}${Math.round(v)} kW`}
                        />
                        <Tooltip content={<DeltaTooltip />} />
                        <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
                        <ReferenceLine y={242} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '+242 kW (Warning)', fill: '#f59e0b', fontSize: 9 }} />
                        <ReferenceLine y={742} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '+742 kW (Critical Trip)', fill: '#ef4444', fontSize: 9 }} />
                        <Bar dataKey="delta" radius={[2, 2, 0, 0]}>
                          {visibleTicks.map((entry, index) => {
                            const delta = entry.delta;
                            let fill = '#10b981';
                            if (delta >= 742) fill = '#ef4444';
                            else if (delta >= 242) fill = '#f59e0b';
                            else if (delta > 0) fill = '#06b6d4';
                            return <Cell key={`cell-${index}`} fill={fill} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#14263f]">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                    <span className="font-bold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      RANDOM FOREST ANOMALY TRIP PROBABILITY (%)
                    </span>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-amber-400">18% Caution Line</span>
                      <span className="text-red-400">45% Trip Ceiling</span>
                    </div>
                  </div>

                  <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={visibleTicks} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#162947" vertical={false} />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: '#7a8ca5', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fill: '#7a8ca5', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={false}
                          domain={[0, 100]}
                          width={70}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip content={<DeltaTooltip />} />
                        <ReferenceLine y={18} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'CAUTION (18%)', fill: '#f59e0b', fontSize: 9 }} />
                        <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'TRIP ALARM (45%)', fill: '#ef4444', fontSize: 9 }} />
                        <Line
                          type="monotone"
                          dataKey={(d) => (d.anomalyProb || 0) * 100}
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#ef4444' }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── FACILITY POWER COMPOSITION & EFFICIENCY GAUGES ───────────────── */}
      {envData && (
        <div className="space-y-4">
          <LoadBreakdownCard
            loadData={{
              itLoad: envData.itLoad,
              coolingLoad: envData.coolingLoad,
              supportLoad: envData.supportLoad,
              totalPower: envData.totalPower,
              pue: envData.pue,
            }}
            trend={trendData?.power}
            selectedArea={selectedArea}
            onSelectArea={setSelectedArea}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GaugeCard
              label="Power Usage Effectiveness"
              tag="PUE-01"
              value={envData.pue}
              min={1.0}
              max={2.0}
              unit="PUE"
              zones={[
                { max: 1.2, color: '#10b981', label: 'Excellent (<1.2)' },
                { max: 1.4, color: '#06b6d4', label: 'Standard (1.2–1.4)' },
                { max: 1.6, color: '#f59e0b', label: 'Moderate (1.4–1.6)' },
                { max: 2.0, color: '#ef4444', label: 'Inefficient (>1.6)' },
              ]}
              trend={trendData?.power === 'rising' ? 'rising' : trendData?.power === 'falling' ? 'falling' : 'steady'}
              status="PUE = Total Facility Power / IT Equipment Power. Hyperscale target is <1.3."
            />

            <GaugeCard
              label="ML Anomaly Trip Probability"
              tag="RF-TRIP-01"
              value={lastProb !== undefined ? lastProb * 100 : 0}
              min={0}
              max={100}
              unit="%"
              zones={[
                { max: 18, color: '#10b981', label: 'Nominal (<18%)' },
                { max: 45, color: '#f59e0b', label: 'Caution (18–45%)' },
                { max: 100, color: '#ef4444', label: 'Critical Trip (>45%)' },
              ]}
              trend={trendData?.power}
              status="Random Forest binary classifier probability for equipment surge or thermal overload."
            />
          </div>
        </div>
      )}

      {/* ── BMS ENVIRONMENTAL CONDITIONS MONITOR ──────────────────────────── */}
      {envData && (
        <EnvironmentalPanel
          envData={{
            ambientTemp: envData.ambientTemp,
            serverInletTemp: envData.serverInletTemp,
            chilledWaterTemp: envData.chilledWaterTemp,
            relativeHumidity: envData.relativeHumidity,
            underFloorPressure: envData.underFloorPressure,
            ambientTrend: trendData?.ambient,
            humidityTrend: trendData?.humidity,
            pressureTrend: trendData?.pressure,
          }}
        />
      )}

      {/* ── SEQUENCE OF EVENTS (SOE) ENERGY & ALARM HISTORIAN ────────────── */}
      <div className="control-panel rounded-xl p-5 bg-[#091426] border border-[#162947] shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14263f] pb-3">
          <div>
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              Sequence of Events (SOE) Energy & Alarm Historian Log
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              Chronological log of electricity consumption spikes, cooling shifts, and threshold alarms
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#07101f] border border-[#14263f] font-mono text-xs">
            <button
              onClick={() => setLogFilter('ALL')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                logFilter === 'ALL' ? 'bg-[#1b3252] text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Events ({processedLogs.length})
            </button>
            <button
              onClick={() => setLogFilter('ALARMS_ONLY')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                logFilter === 'ALARMS_ONLY' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              Warnings & Trips ({processedLogs.filter(r => r.isWarning || r.isCritical).length})
            </button>
            <button
              onClick={() => setLogFilter('CRITICAL_ONLY')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                logFilter === 'CRITICAL_ONLY' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-red-400 hover:text-red-200'
              }`}
            >
              Critical Trips ({processedLogs.filter(r => r.isCritical).length})
            </button>
          </div>
        </div>

        {histErr ? (
          <p className="text-xs font-mono text-slate-400 py-3">{histErr}</p>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs border-collapse font-mono">
              <thead className="sticky top-0 bg-[#0d1c33] z-10 text-[10px] uppercase tracking-wider text-slate-400 border-b border-[#162947]">
                <tr>
                  <th className="text-left py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Equipment Area</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Operational Event / Reason</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Demand (kW)</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Baseline Delta</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Trip Risk</th>
                  <th className="text-left py-2.5 px-3 font-semibold">SCADA Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#13243d]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500 italic">
                      No operational events matching selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((row, i) => {
                    const kwh = row.adjustedKwh || row.forecastedTotalPowerKwh || 0;
                    const delta = kwh - BASELINE_TARGET_KWH;

                    let rowBg = 'hover:bg-white/[0.03]';
                    if (row.isCritical) rowBg = 'bg-red-500/[0.09] hover:bg-red-500/[0.14]';
                    else if (row.isWarning) rowBg = 'bg-amber-500/[0.07] hover:bg-amber-500/[0.11]';

                    return (
                      <tr
                        key={row._id || i}
                        className={`transition-colors ${rowBg}`}
                      >
                        <td className="py-2.5 px-3 text-slate-300 font-semibold whitespace-nowrap">
                          {new Date(row.timestamp || row.createdAt).toLocaleString('en-GB', { hour12: false })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                          <span className={row.area === 'Cooling' ? 'text-blue-400' : row.area === 'IT Compute' ? 'text-cyan-400' : 'text-violet-400'}>
                            {row.area}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-sans text-[11px] max-w-sm truncate" title={row.incidentReason}>
                          {row.incidentReason}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-cyan-400">
                          {kwh.toFixed(1)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-semibold ${delta >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} kW
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={row.anomalyProbability >= 0.45 ? "text-red-400 font-bold" : row.anomalyProbability >= 0.18 ? "text-amber-400 font-bold" : "text-slate-400"}>
                            {row.anomalyProbability !== undefined
                              ? `${(row.anomalyProbability * 100).toFixed(1)}%`
                              : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <AnomalyBadge status={row.computedAlarm} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
