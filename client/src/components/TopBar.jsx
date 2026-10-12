import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTelemetry } from '../context/TelemetryContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ZapIcon, GaugeIcon, ActivityIcon, ShieldLockIcon } from './Icons.jsx';
import AnomalyBadge from './AnomalyBadge.jsx';

/**
 * TopBar — SCADA / DCS instrumentation header bar.
 * Connects to global continuous TelemetryContext:
 * Displays active power demand and alarm status continuously across ALL pages.
 */

const PAGE_METADATA = {
  '/':          { title: 'Live Operations & Telemetry', tag: 'DCS-MOD-01', subsystem: 'Substation 34.5kV / Primary Bus A' },
  '/analytics': { title: 'Energy Forecasting & Model Diagnostics', tag: 'ML-ANL-02', subsystem: 'XGBoost & RF Inference Engine' },
  '/whatif':    { title: 'What-If Plant Scenario Dispatch Lab', tag: 'SIM-DIS-03', subsystem: 'Hyperscale Thermal & Load Emulator' },
  '/dashboard': { title: 'System Architecture & Infrastructure', tag: 'SYS-TOP-04', subsystem: 'SCADA Topology & Telemetry Historian' },
  '/access':    { title: 'Operator Workstation Portal', tag: 'SEC-ACC-05', subsystem: 'SCADA Air-Gap Authentication' },
};

export default function TopBar() {
  const location = useLocation();
  const [now, setNow] = useState(new Date());

  // Access continuous background telemetry and operator credentials
  const { latestTick, isRunning } = useTelemetry();
  const { operator, logout } = useAuth();

  // Precision chronometer tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const meta = PAGE_METADATA[location.pathname] || {
    title: 'SmartDC Energy Management System',
    tag: 'EMS-SYS',
    subsystem: 'Primary Telemetry Grid'
  };

  const kwh = latestTick?.kwh;
  const currentAlarm = latestTick?.alarmState || 'NOMINAL';

  return (
    <header
      className="h-[var(--topbar-height)] flex items-center justify-between
                 px-6 border-b border-[#162744]
                 bg-[#081122]/95 backdrop-blur-md flex-shrink-0 select-none z-40"
    >
      {/* ── Left: SCADA Node Tag & Subsystem Context ─────────────────── */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider flex-shrink-0">
          {meta.tag}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-100 tracking-wide truncate">
              {meta.title}
            </h1>
            <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded">
              <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              {isRunning ? 'SCADA STREAMING' : 'STREAM PAUSED'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono tracking-tight truncate hidden sm:block">
            IOWA-HYPERSCALE-01 &gt; {meta.subsystem}
          </p>
        </div>
      </div>

      {/* ── Center / Right: Continuous Global Telemetry Readout ──────── */}
      <div className="flex items-center gap-5 flex-shrink-0">

        {/* Global Realtime Ingestion Monitor (Visible across all tabs!) */}
        {kwh !== undefined && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#071324] border border-[#182e4e] font-mono text-xs shadow-inner">
            <ActivityIcon className={`w-3.5 h-3.5 ${isRunning ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-slate-400 text-[10px]">LIVE DEMAND:</span>
            <span className="text-cyan-400 font-bold tracking-tight">
              {kwh.toFixed(1)} kW
            </span>
            <span className="text-[10px] text-slate-500">
              ({(kwh / 1000).toFixed(2)} MW)
            </span>
            <span className="w-px h-3.5 bg-[#182e4e] mx-0.5" />
            <AnomalyBadge status={currentAlarm} />
          </div>
        )}

        <div className="w-px h-6 bg-[#162744] hidden md:block" />

        {/* Dual Industrial Chronometer (UTC / Local IST) */}
        <div className="flex items-center gap-3 text-right font-mono">
          <div>
            <div className="text-xs font-bold text-cyan-400 tracking-wider leading-tight">
              {now.toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Kolkata' })}
              <span className="text-[9px] text-slate-400 font-normal ml-1">IST</span>
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">
              {now.toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' })}
              <span className="text-[8px] text-slate-500 font-normal ml-1">UTC</span>
            </div>
          </div>
          <div className="hidden sm:block text-[10px] text-slate-400 border-l border-[#162744] pl-3 leading-tight">
            <div className="font-semibold text-slate-300">
              {now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div className="text-[9px] text-slate-500 uppercase">
              FEEDER 34.5kV
            </div>
          </div>
        </div>

        {/* Lock Workstation / Disconnect Operator */}
        <div className="w-px h-6 bg-[#162744] hidden sm:block" />

        <button
          onClick={logout}
          title="Lock Workstation & Return to SCADA Access Portal"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e1c31] hover:bg-red-500/15 border border-[#1d3353] hover:border-red-500/30 text-slate-300 hover:text-red-300 text-[11px] font-mono transition-all group"
        >
          <ShieldLockIcon className="w-3.5 h-3.5 text-cyan-400 group-hover:text-red-400 transition-colors" />
          <span className="hidden md:inline font-semibold">Lock Station</span>
        </button>
      </div>
    </header>
  );
}
