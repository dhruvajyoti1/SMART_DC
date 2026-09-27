import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient.js';
import AnomalyBadge from '../components/AnomalyBadge.jsx';
import {
  SlidersIcon,
  ZapIcon,
  GaugeIcon,
  PlayIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckCircleIcon
} from '../components/Icons.jsx';

/* ─── Iowa Hyperscale default baseline (Integration Anchor ~9,707.71 kWh) ── */
const FORECAST_DEFAULTS = {
  ambient_temp_c: 22.5,
  relative_humidity_pct: 45.0,
  chilled_water_temp_c: 12.0,
  server_inlet_temp_c: 24.0,
  under_floor_pressure_pa: 12.5,
  hour: 12,
  day_of_week: 2,
  month: 6,
  is_weekend: 0,
  hour_sin: 0.0,
  hour_cos: -1.0,
  month_sin: 0.0,
  month_cos: -1.0,
  weekend_energy_kwh: 0,
  midnight_energy_kwh: 9600,
  lag_1h: 9650,
  lag_6h: 9500,
  lag_12h: 9400,
  lag_24h: 9600,
  lag_48h: 9550,
  lag_168h: 9700,
  roll_mean_6h: 9600,
  roll_std_6h: 120,
  roll_mean_24h: 9550,
  roll_std_24h: 150,
};

const ANOMALY_DEFAULTS = {
  ambient_temp_c: 22.5,
  relative_humidity_pct: 45.0,
  chilled_water_temp_c: 12.0,
  server_inlet_temp_c: 24.0,
  under_floor_pressure_pa: 12.5,
  it_load_kwh: 8500,
  cooling_load_kwh: 1200,
  support_load_kwh: 50,
  total_power_kwh: 9750,
  pue: 1.15,
  hour_sin: 0.0,
  hour_cos: -1.0,
  month_sin: 0.0,
  month_cos: -1.0,
  is_weekend: 0,
};

/* ─── SCADA Dispatch Presets ─────────────────────────────────────────────── */
const SIMULATION_PRESETS = [
  {
    name: 'Nominal Baseline',
    desc: 'Standard Iowa Hyperscale operation (~9.7 MW)',
    forecast: { ...FORECAST_DEFAULTS },
    anomaly: { ...ANOMALY_DEFAULTS },
  },
  {
    name: 'Peak Summer Heatwave',
    desc: 'Ambient 38°C, Elevated Chilled Water & CRAC Load',
    forecast: {
      ...FORECAST_DEFAULTS,
      ambient_temp_c: 38.0,
      relative_humidity_pct: 65.0,
      chilled_water_temp_c: 16.5,
      server_inlet_temp_c: 28.5,
      lag_1h: 10450,
      roll_mean_6h: 10300,
    },
    anomaly: {
      ...ANOMALY_DEFAULTS,
      ambient_temp_c: 38.0,
      relative_humidity_pct: 65.0,
      chilled_water_temp_c: 16.5,
      server_inlet_temp_c: 28.5,
      cooling_load_kwh: 1950,
      total_power_kwh: 10500,
      pue: 1.23,
    },
  },
  {
    name: 'AI Training Surge',
    desc: 'Compute cluster load elevated to 9.2 MW',
    forecast: {
      ...FORECAST_DEFAULTS,
      server_inlet_temp_c: 26.0,
      under_floor_pressure_pa: 16.0,
      lag_1h: 10200,
      roll_mean_6h: 10100,
    },
    anomaly: {
      ...ANOMALY_DEFAULTS,
      it_load_kwh: 9200,
      cooling_load_kwh: 1350,
      total_power_kwh: 10600,
      pue: 1.15,
    },
  },
  {
    name: 'Cool Night Off-Peak',
    desc: 'Ambient 12°C, Economizer active, low compute demand',
    forecast: {
      ...FORECAST_DEFAULTS,
      ambient_temp_c: 12.0,
      relative_humidity_pct: 40.0,
      chilled_water_temp_c: 9.5,
      server_inlet_temp_c: 20.0,
      hour: 2,
      lag_1h: 9100,
      roll_mean_6h: 9150,
    },
    anomaly: {
      ...ANOMALY_DEFAULTS,
      ambient_temp_c: 12.0,
      relative_humidity_pct: 40.0,
      chilled_water_temp_c: 9.5,
      server_inlet_temp_c: 20.0,
      it_load_kwh: 7800,
      cooling_load_kwh: 850,
      total_power_kwh: 8700,
      pue: 1.11,
    },
  },
];

/* ─── Parameter Field Component ─────────────────────────────────────────── */
function ParamInput({ name, label, unit, value, onChange }) {
  return (
    <div className="flex flex-col gap-1 p-2 rounded bg-[#07101f] border border-[#13243d]">
      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
        <label htmlFor={name} className="font-semibold uppercase truncate" title={label}>
          {label}
        </label>
        {unit && <span className="text-slate-500 font-bold">{unit}</span>}
      </div>
      <input
        id={name}
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="px-2.5 py-1.5 rounded border border-[#1a2d47]
                   bg-[#0b162a] text-cyan-300 font-mono text-xs
                   focus:outline-none focus:ring-1 focus:ring-cyan-500/70 focus:border-cyan-500/70
                   transition-all"
      />
    </div>
  );
}

export default function WhatIfPage() {
  const [forecastFields, setForecastFields] = useState({ ...FORECAST_DEFAULTS });
  const [anomalyFields, setAnomalyFields] = useState({ ...ANOMALY_DEFAULTS });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [histErr, setHistErr] = useState(null);
  const [activeTab, setActiveTab] = useState('environmental');

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/analysis/history');
      setHistory(data);
    } catch {
      setHistErr('Historical simulation dispatch database unavailable.');
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleForecastChange = (name, val) => {
    setForecastFields((prev) => ({ ...prev, [name]: val }));
  };

  const handleAnomalyChange = (name, val) => {
    setAnomalyFields((prev) => ({ ...prev, [name]: val }));
  };

  const applyPreset = (preset) => {
    setForecastFields({ ...preset.forecast });
    setAnomalyFields({ ...preset.anomaly });
    setResult(null);
    setError(null);
  };

  const resetToDefaults = () => {
    setForecastFields({ ...FORECAST_DEFAULTS });
    setAnomalyFields({ ...ANOMALY_DEFAULTS });
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const forecastFeatures = Object.fromEntries(
        Object.entries(forecastFields).map(([k, v]) => [k, Number(v)])
      );
      const anomalyFeatures = Object.fromEntries(
        Object.entries(anomalyFields).map(([k, v]) => [k, Number(v)])
      );

      // Auto-compute cyclic features from hour and month
      const h = Number(forecastFeatures.hour);
      const m = Number(forecastFeatures.month);
      forecastFeatures.hour_sin = Math.sin((2 * Math.PI * h) / 24);
      forecastFeatures.hour_cos = Math.cos((2 * Math.PI * h) / 24);
      forecastFeatures.month_sin = Math.sin((2 * Math.PI * m) / 12);
      forecastFeatures.month_cos = Math.cos((2 * Math.PI * m) / 12);
      // Also sync anomaly cyclic features
      anomalyFeatures.hour_sin = forecastFeatures.hour_sin;
      anomalyFeatures.hour_cos = forecastFeatures.hour_cos;
      anomalyFeatures.month_sin = forecastFeatures.month_sin;
      anomalyFeatures.month_cos = forecastFeatures.month_cos;
      anomalyFeatures.is_weekend = forecastFeatures.is_weekend;

      const { data } = await apiClient.post('/analysis/combined', {
        forecastFeatures,
        anomalyFeatures,
      });
      setResult(data);
      await fetchHistory();
    } catch (err) {
      setError(err.uiMessage || 'Dual ML Inference failed. Ensure FastAPI microservice is online.');
    } finally {
      setLoading(false);
    }
  };

  const predictedKw = result?.forecasted_total_power_kwh;
  const deltaFromAnchor = predictedKw ? predictedKw - 9707.71 : null;

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#091426] border border-[#162947] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <SlidersIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
              What-If Plant Scenario Dispatch Lab
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              Simulate Operating Parameters · Predict Power Demand · Screen Anomaly Risks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1c31] border border-[#1d3353] text-slate-300 text-xs font-mono hover:bg-[#152a4a] transition-all"
          >
            <RefreshCwIcon className="w-3 h-3 text-slate-400" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* ── Quick Scenario Presets ─────────────────────────────────────── */}
      <div className="control-panel rounded-xl p-4 bg-[#091426] border border-[#162947]">
        <div className="flex items-center justify-between mb-3 border-b border-[#14263f] pb-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
            SCADA OPERATIONAL PRESETS
          </span>
          <span className="text-[9px] text-slate-500 font-mono">
            Click to load parameterized profile
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SIMULATION_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(preset)}
              className="text-left p-3 rounded-lg bg-[#07101f] border border-[#13243d] hover:border-cyan-500/50 hover:bg-[#0a182e] transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 font-mono">
                  {preset.name}
                </span>
                <span className="text-[9px] px-1 rounded bg-[#102038] text-slate-400 font-mono">
                  P-{idx + 1}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-1 line-clamp-1">
                {preset.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Layout: Inputs Form & Output Telemetry ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left Column: Parameter Busses Form (8 cols) ─────────────── */}
        <div className="lg:col-span-8 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Parameter Domain Tabs */}
            <div className="flex items-center gap-2 border-b border-[#14263f] pb-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('environmental')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'environmental'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Environmental & Plant Thermal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('load')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'load'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Substation Loads & PUE
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lag')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'lag'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Historical Inertia & Lags
              </button>
            </div>

            {/* Tab 1: Environmental & Plant Thermal */}
            {activeTab === 'environmental' && (
              <div className="control-panel rounded-xl p-5 bg-[#091426] border border-[#162947] space-y-4">
                <div className="border-b border-[#14263f] pb-2">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Domain A: Environmental Sensors & CRAC Telemetry
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Affects thermodynamic cooling overhead and IT thermal resistance
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <ParamInput name="ambient_temp_c" label="Ambient Air Temp" unit="°C" value={forecastFields.ambient_temp_c} onChange={handleForecastChange} />
                  <ParamInput name="relative_humidity_pct" label="Relative Humidity" unit="%" value={forecastFields.relative_humidity_pct} onChange={handleForecastChange} />
                  <ParamInput name="chilled_water_temp_c" label="Chilled Water Supply" unit="°C" value={forecastFields.chilled_water_temp_c} onChange={handleForecastChange} />
                  <ParamInput name="server_inlet_temp_c" label="Server Rack Inlet" unit="°C" value={forecastFields.server_inlet_temp_c} onChange={handleForecastChange} />
                  <ParamInput name="under_floor_pressure_pa" label="Under-Floor Static Press." unit="Pa" value={forecastFields.under_floor_pressure_pa} onChange={handleForecastChange} />
                  <ParamInput name="hour" label="Hour of Day" unit="0-23" value={forecastFields.hour} onChange={handleForecastChange} />
                  <ParamInput name="day_of_week" label="Day of Week" unit="0-6" value={forecastFields.day_of_week} onChange={handleForecastChange} />
                  <ParamInput name="month" label="Month" unit="1-12" value={forecastFields.month} onChange={handleForecastChange} />
                  <ParamInput name="is_weekend" label="Weekend Mode" unit="0/1" value={forecastFields.is_weekend} onChange={handleForecastChange} />
                </div>
              </div>
            )}

            {/* Tab 2: Substation Loads & PUE */}
            {activeTab === 'load' && (
              <div className="control-panel rounded-xl p-5 bg-[#091426] border border-[#162947] space-y-4">
                <div className="border-b border-[#14263f] pb-2">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Domain B: Substation Feeder Loads & Efficiency Index
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Inputs evaluated by the Random Forest Anomaly Classifier
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <ParamInput name="it_load_kwh" label="IT Equipment Load" unit="kWh" value={anomalyFields.it_load_kwh} onChange={handleAnomalyChange} />
                  <ParamInput name="cooling_load_kwh" label="CRAC & Chiller Load" unit="kWh" value={anomalyFields.cooling_load_kwh} onChange={handleAnomalyChange} />
                  <ParamInput name="support_load_kwh" label="Auxiliary / Lighting Load" unit="kWh" value={anomalyFields.support_load_kwh} onChange={handleAnomalyChange} />
                  <ParamInput name="total_power_kwh" label="Measured Substation Total" unit="kWh" value={anomalyFields.total_power_kwh} onChange={handleAnomalyChange} />
                  <ParamInput name="pue" label="Power Usage Effectiveness" unit="PUE" value={anomalyFields.pue} onChange={handleAnomalyChange} />
                </div>
              </div>
            )}

            {/* Tab 3: Historical Inertia & Lags */}
            {activeTab === 'lag' && (
              <div className="control-panel rounded-xl p-5 bg-[#091426] border border-[#162947] space-y-4">
                <div className="border-b border-[#14263f] pb-2">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Domain C: Historical Energy Lag Profiles (XGBoost Regressor)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Autoregressive lag features reflecting grid momentum and cyclical demand
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <ParamInput name="lag_1h" label="Lag 1-Hour" unit="kWh" value={forecastFields.lag_1h} onChange={handleForecastChange} />
                  <ParamInput name="lag_6h" label="Lag 6-Hour" unit="kWh" value={forecastFields.lag_6h} onChange={handleForecastChange} />
                  <ParamInput name="lag_12h" label="Lag 12-Hour" unit="kWh" value={forecastFields.lag_12h} onChange={handleForecastChange} />
                  <ParamInput name="lag_24h" label="Lag 24-Hour" unit="kWh" value={forecastFields.lag_24h} onChange={handleForecastChange} />
                  <ParamInput name="lag_48h" label="Lag 48-Hour" unit="kWh" value={forecastFields.lag_48h} onChange={handleForecastChange} />
                  <ParamInput name="lag_168h" label="Lag 1-Week (168h)" unit="kWh" value={forecastFields.lag_168h} onChange={handleForecastChange} />
                  <ParamInput name="roll_mean_6h" label="Rolling Mean 6h" unit="kWh" value={forecastFields.roll_mean_6h} onChange={handleForecastChange} />
                  <ParamInput name="roll_std_6h" label="Rolling Std 6h" unit="kWh" value={forecastFields.roll_std_6h} onChange={handleForecastChange} />
                  <ParamInput name="roll_mean_24h" label="Rolling Mean 24h" unit="kWh" value={forecastFields.roll_mean_24h} onChange={handleForecastChange} />
                  <ParamInput name="roll_std_24h" label="Rolling Std 24h" unit="kWh" value={forecastFields.roll_std_24h} onChange={handleForecastChange} />
                  <ParamInput name="midnight_energy_kwh" label="Midnight Baseline" unit="kWh" value={forecastFields.midnight_energy_kwh} onChange={handleForecastChange} />
                  <ParamInput name="weekend_energy_kwh" label="Weekend Offset" unit="kWh" value={forecastFields.weekend_energy_kwh} onChange={handleForecastChange} />
                </div>
              </div>
            )}

            {/* Execute Simulation Command Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-sm uppercase tracking-wider rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 active:scale-[0.99]"
              >
                <PlayIcon className="w-4 h-4" />
                <span>{loading ? 'Executing Dual ML Inference...' : 'Dispatch Simulation Scenario'}</span>
              </button>
            </div>
          </form>

          {error && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── Right Column: Dispatch Results & Historical Queries (4 cols) ─ */}
        <div className="lg:col-span-4 space-y-4">

          {/* Simulation Output Panel */}
          {result ? (
            <div className="control-panel rounded-xl p-5 bg-[#091426] border border-[#162947] shadow-2xl animate-slide-in space-y-4">
              <div className="flex items-center justify-between border-b border-[#14263f] pb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                  SIMULATION VERDICT
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                  INFERENCE COMPLETE
                </span>
              </div>

              {/* Predicted Power Demand */}
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  FORECASTED ELECTRIC DEMAND
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono tracking-tight text-cyan-400 glow-text-cyan">
                    {predictedKw?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-bold">kW</span>
                </div>
                {deltaFromAnchor !== null && (
                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    Anchor Variance: <strong className={deltaFromAnchor >= 0 ? "text-amber-400" : "text-emerald-400"}>
                      {deltaFromAnchor >= 0 ? `+${deltaFromAnchor.toFixed(1)}` : deltaFromAnchor.toFixed(1)} kW ({((deltaFromAnchor / 9707.71) * 100).toFixed(2)}%)
                    </strong>
                  </p>
                )}
              </div>

              {/* Anomaly Classification */}
              <div className="border-t border-[#14263f] pt-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  CLASSIFICATION STATE
                </span>
                <div className="flex items-center gap-2">
                  <AnomalyBadge status={result.anomaly_status} large />
                </div>
              </div>

              {/* Anomaly Risk Probability */}
              <div className="border-t border-[#14263f] pt-3">
                <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                  <span className="text-slate-400">Anomaly Trip Risk:</span>
                  <span className={`font-bold ${result.anomaly_probability >= 0.45 ? 'text-red-400' : result.anomaly_probability >= 0.18 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(result.anomaly_probability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#0b162a] rounded-full overflow-hidden border border-[#162744]">
                  <div
                    className={`h-full transition-all duration-500 ${
                      result.anomaly_probability >= 0.45 ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : result.anomaly_probability >= 0.18 ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, result.anomaly_probability * 100)}%` }}
                  />
                </div>
              </div>

              {/* Integration Check Note */}
              <div className="p-2.5 rounded bg-[#07101f] border border-[#13243d] text-[10px] font-mono text-slate-400">
                {Math.abs(predictedKw - 9707.71) < 250 ? (
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Conforms to Iowa Hyperscale reference envelope.</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <AlertTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Deviates from baseline — reflects abnormal environmental or load stress.</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="control-panel rounded-xl p-8 bg-[#091426] border border-[#162947] text-center space-y-2">
              <GaugeIcon className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-xs font-bold text-slate-300 uppercase font-mono">
                Awaiting Dispatch Execution
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                Select a preset or customize parameters, then execute the dispatch simulation.
              </p>
            </div>
          )}

          {/* Historical Simulation Queries Table */}
          <div className="control-panel rounded-xl p-4 bg-[#091426] border border-[#162947]">
            <div className="flex items-center justify-between border-b border-[#14263f] pb-2 mb-2 font-mono">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                RECENT DISPATCH LOGS
              </span>
              <span className="text-[9px] text-slate-500">
                MongoDB Historian
              </span>
            </div>
            {histErr ? (
              <p className="text-[10px] font-mono text-slate-500">{histErr}</p>
            ) : history.length === 0 ? (
              <p className="text-[10px] font-mono text-slate-500 py-3 text-center italic">No dispatch history recorded.</p>
            ) : (
              <div className="overflow-x-auto max-h-56">
                <table className="w-full text-[11px] font-mono border-collapse">
                  <thead>
                    <tr className="text-[9px] uppercase text-slate-400 border-b border-[#13243d]">
                      <th className="text-left py-1.5 font-semibold">Time</th>
                      <th className="text-right py-1.5 font-semibold">kW</th>
                      <th className="text-left py-1.5 pl-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#102038]">
                    {history.slice(0, 8).map((row) => (
                      <tr key={row._id || row.createdAt} className="hover:bg-white/[0.03]">
                        <td className="py-1 text-slate-400">
                          {new Date(row.createdAt).toLocaleTimeString('en-GB', { hour12: false })}
                        </td>
                        <td className="py-1 text-right font-bold text-cyan-400">
                          {row.result?.forecastedTotalPowerKwh?.toFixed(1) ?? '—'}
                        </td>
                        <td className="py-1 pl-2">
                          <AnomalyBadge status={row.result?.anomalyStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
