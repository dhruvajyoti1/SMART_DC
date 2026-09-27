import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import apiClient from '../api/apiClient.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StatCard from '../components/StatCard.jsx';
import {
  BarChartIcon,
  ZapIcon,
  GaugeIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon
} from '../components/Icons.jsx';

const BAR_COLOURS = [
  '#06b6d4','#0891b2','#0e7490','#155e75','#164e63',
  '#22d3ee','#67e8f9','#a5f3fc','#0284c7','#0369a1',
];

/* ─── SCADA Alarm Truth Table (Confusion Matrix) ────────────────────────── */
function DcsAlarmMatrix({ matrix }) {
  if (!matrix) return null;
  const { TP = 0, FP = 0, FN = 0, TN = 0 } = matrix;
  const total = TP + FP + FN + TN || 1;

  const cells = [
    {
      label: 'True Trip (TP)',
      desc: 'Correct Anomaly Intercepted',
      value: TP,
      pct: ((TP / total) * 100).toFixed(1),
      style: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
    },
    {
      label: 'False Alarm (FP)',
      desc: 'Nuisance / Spurious Trip',
      value: FP,
      pct: ((FP / total) * 100).toFixed(1),
      style: 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
    },
    {
      label: 'Missed Trip (FN)',
      desc: 'Critical Uncaught Incident',
      value: FN,
      pct: ((FN / total) * 100).toFixed(1),
      style: 'bg-red-500/15 text-red-400 border border-red-500/30'
    },
    {
      label: 'Safe Normal (TN)',
      desc: 'Nominal Operations Validated',
      value: TN,
      pct: ((TN / total) * 100).toFixed(1),
      style: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-[#14263f] pb-2 font-mono">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Alarm Trip Classification Matrix (Test Set)
        </span>
        <span className="text-[9px] text-slate-500">
          N = {total.toLocaleString()} Samples
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cells.map(({ label, desc, value, pct, style }) => (
          <div key={label} className={`rounded-xl p-3.5 ${style} font-mono flex flex-col justify-between`}>
            <div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
                <span className="text-[10px] opacity-70 font-semibold">{pct}%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
            </div>
            <p className="text-2xl font-black tracking-tight mt-2">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await apiClient.get('/analytics/summary');
      setData(res);
    } catch (err) {
      setError(err.uiMessage || 'Failed to retrieve telemetry diagnostics from ML microservice.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) return <LoadingSpinner label="Compiling model evaluation diagnostics..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 font-mono">
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangleIcon className="w-5 h-5 text-red-400" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
        >
          <RefreshCwIcon className="w-3.5 h-3.5" />
          <span>Retry Diagnostics Link</span>
        </button>
      </div>
    );
  }

  const forecast = data?.forecast ?? data ?? {};
  const anomaly = data?.anomaly ?? {};

  const bestFModel = forecast.best_model || 'XGBoost';
  const fMetrics = forecast.metrics?.find((m) => m.Model === bestFModel) || forecast;

  const bestAModel = anomaly.best_model || 'Random Forest';
  const aMetrics = anomaly.metrics?.find((m) => m.Model === bestAModel) || anomaly;

  const featureImportance = (forecast.feature_importance ?? [])
    .map((item) => ({
      feature: (item.feature ?? item.name ?? 'Unknown').replace(/_/g, ' '),
      value: +(item.importance ?? item.value ?? 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#091426] border border-[#162947] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <BarChartIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wide">
              Energy Forecasting & Anomaly Model Diagnostics
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              Statistical Model Validation · Held-Out Test Set Metrics · Feature Load Sensitivities
            </p>
          </div>
        </div>

        {/* Champion Model Badges */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#0e1c31] border border-cyan-500/30 text-cyan-300">
            <span className="text-[9px] text-slate-500 block uppercase">Forecast Engine</span>
            <strong>{forecast.best_model || 'XGBoost Regressor'}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0e1c31] border border-emerald-500/30 text-emerald-300">
            <span className="text-[9px] text-slate-500 block uppercase">Anomaly Engine</span>
            <strong>{anomaly.best_model || 'Random Forest'}</strong>
          </div>
        </div>
      </div>

      {/* ── Section 1: Electricity Forecasting Regression Metrics ───────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#14263f] pb-2 font-mono">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            1. Electricity Demand Forecasting — Regression Performance
          </h2>
          <span className="text-[10px] text-slate-500">
            Target: Total Power Demand (kWh)
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono">
          <StatCard label="MAE (Mean Absolute Error)" value={fMetrics.MAE || fMetrics.mae} unit="kWh" sub="Average prediction delta" />
          <StatCard label="RMSE (Root Mean Square)" value={fMetrics.RMSE || fMetrics.rmse} unit="kWh" sub="Penalizes large variances" />
          <StatCard label="R² (Variance Explained)" value={fMetrics.R2 || fMetrics.r2} sub="Model goodness of fit" colour={(fMetrics.R2 || fMetrics.r2) >= 0.9 ? 'text-emerald-400' : 'text-cyan-400'} />
          <StatCard label="CV-RMSE (Normalized)" value={fMetrics.CV_RMSE || fMetrics.cv_rmse} unit="%" sub="Relative to mean load" />
          <StatCard label="MAPE (Mean Percentage)" value={fMetrics['MAPE_%'] || fMetrics.mape} unit="%" sub="Relative error envelope" />
        </div>
      </div>

      {/* ── Section 2: Feature Sensitivity & Load Drivers ───────────────── */}
      {featureImportance.length > 0 && (
        <div className="control-panel rounded-xl p-5 bg-[#091426] border border-[#162947] shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-[#14263f] pb-2 font-mono">
            <div>
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                2. Key Plant Telemetry Drivers (Feature Importance)
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Variables with highest explanatory weight in the energy consumption forecasting tree
              </p>
            </div>
            <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
              TOP 12 PREDICTORS
            </span>
          </div>

          <div style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={featureImportance}
                layout="vertical"
                margin={{ top: 5, right: 30, bottom: 5, left: 160 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#162947" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#7a8ca5', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="feature"
                  width={155}
                  tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#071120',
                    border: '1px solid #1b3152',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    fontFamily: 'monospace',
                    fontSize: 12
                  }}
                  formatter={(val) => [val.toFixed(4), 'Sensitivity Weight']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {featureImportance.map((_, i) => (
                    <Cell key={i} fill={BAR_COLOURS[i % BAR_COLOURS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Section 3: Anomaly Detection Metrics & Decision Matrix ─────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#14263f] pb-2 font-mono">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            3. Plant Anomaly Detection & Reliability Diagnostics
          </h2>
          <span className="text-[10px] text-slate-500">
            Random Forest Binary Classifier (Normal vs Failure)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          <StatCard label="RF Accuracy" value={(aMetrics.Accuracy || aMetrics.accuracy) !== undefined ? ((aMetrics.Accuracy || aMetrics.accuracy) * 100).toFixed(2) : undefined} unit="%" colour="text-emerald-400" sub="Overall correct states" />
          <StatCard label="Precision" value={(aMetrics.Precision || aMetrics.precision) !== undefined ? ((aMetrics.Precision || aMetrics.precision) * 100).toFixed(2) : undefined} unit="%" sub="False alarm resistance" />
          <StatCard label="Recall" value={(aMetrics.Recall || aMetrics.recall) !== undefined ? ((aMetrics.Recall || aMetrics.recall) * 100).toFixed(2) : undefined} unit="%" sub="Failure capture rate" />
          <StatCard label="F1-Score" value={(aMetrics.F1 || aMetrics.f1) !== undefined ? ((aMetrics.F1 || aMetrics.f1) * 100).toFixed(2) : undefined} unit="%" colour={(aMetrics.F1 || aMetrics.f1) >= 0.9 ? 'text-emerald-400' : 'text-cyan-400'} sub="Harmonic balance" />
          <StatCard label="AUC-ROC Score" value={anomaly.roc_auc?.[bestAModel.replace(/\s+/g, '')] || anomaly.auc_roc} sub="Separation capacity" />
          <StatCard label="Naive Baseline Acc." value={anomaly.naive_baseline_accuracy !== undefined ? (anomaly.naive_baseline_accuracy * 100).toFixed(2) : undefined} unit="%" sub="Majority-class reference" colour="text-slate-400" />
        </div>

        {/* Confusion Matrix Card */}
        {anomaly.confusion_matrix && (
          <div className="control-panel rounded-xl p-5 bg-[#091426] border border-[#162947] shadow-xl">
            <DcsAlarmMatrix matrix={anomaly.confusion_matrix} />
          </div>
        )}
      </div>

    </div>
  );
}
