import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTelemetry } from '../context/TelemetryContext.jsx';
import {
  ActivityIcon,
  BarChartIcon,
  SlidersIcon,
  LayersIcon,
  ShieldLockIcon,
  ZapIcon
} from './Icons.jsx';

/**
 * Sidebar — fixed left SCADA / DCS navigation panel.
 * Collapsed (64 px, icon-only) by default, expands to 240 px on hover.
 * Includes active operator badge and station disconnect command.
 */

const NAV_ITEMS = [
  { path: '/',          icon: ActivityIcon, label: 'Live Telemetry', sub: 'Real-time DCS Monitor', end: true },
  { path: '/analytics', icon: BarChartIcon, label: 'Forecasting Analytics', sub: 'ML Regression & Residuals' },
  { path: '/whatif',    icon: SlidersIcon,  label: 'What-If Simulation', sub: 'Scenario Dispatch Lab' },
  { path: '/dashboard', icon: LayersIcon,   label: 'DCS Architecture', sub: 'Substation & Topology' },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const { operator, logout } = useAuth();
  const { isRunning } = useTelemetry();

  const linkClass = (isActive) =>
    [
      'flex items-center gap-3.5 px-3.5 py-3 text-xs font-medium transition-all duration-150 rounded-lg mx-2 group relative',
      isActive
        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent',
    ].join(' ');

  return (
    <aside
      className="fixed top-0 left-0 h-screen z-50 flex flex-col
                 bg-[#070e1c] border-r border-[#162744]
                 transition-all duration-300 ease-in-out select-none"
      style={{ width: expanded ? 'var(--sidebar-expanded)' : 'var(--sidebar-width)' }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      aria-label="SCADA Navigation"
    >
      {/* ── Industrial Station Brand ──────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3.5 h-16 border-b border-[#162744] flex-shrink-0 bg-[#091325]">
        <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
          <ZapIcon className="w-5 h-5 text-cyan-400" />
        </div>
        {expanded && (
          <div className="overflow-hidden whitespace-nowrap animate-slide-in">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wider text-slate-100 uppercase">SmartDC</span>
              <span className="text-[9px] px-1 py-0.5 bg-cyan-500/20 text-cyan-400 rounded font-mono font-bold">EMS</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono tracking-tight">DCS-SCADA v2.4.1</p>
          </div>
        )}
      </div>

      {/* ── Main Operations Navigation ───────────────────────────────── */}
      <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ path, icon: Icon, label, sub, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) => linkClass(isActive)}
            title={label}
          >
            <Icon className="w-5 h-5 flex-shrink-0 text-current transition-colors" />
            {expanded && (
              <div className="overflow-hidden whitespace-nowrap text-left animate-fade-in leading-tight">
                <span className="block text-xs font-semibold tracking-wide text-inherit">
                  {label}
                </span>
                <span className="block text-[9px] text-slate-500 font-mono truncate">
                  {sub}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom Section: Active Operator & Disconnect ─────────────── */}
      <div className="border-t border-[#162744] py-3 space-y-1.5 flex-shrink-0 bg-[#060c18]">
        {/* Active Operator Badge */}
        <div className="mx-2 p-2 rounded-lg bg-[#0b162c] border border-[#162744]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0 font-mono font-bold text-xs">
              <ShieldLockIcon className="w-4 h-4 text-cyan-400" />
            </div>
            {expanded && (
              <div className="overflow-hidden whitespace-nowrap font-mono text-[10px] leading-tight animate-fade-in min-w-0">
                <span className="text-slate-200 font-bold block truncate">
                  {operator?.operatorId || 'OPERATOR'}
                </span>
                <span className="text-cyan-400 text-[9px] block truncate">
                  {operator?.accessLevel || 'L2-Operator'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Disconnect Workstation Button */}
        <button
          onClick={logout}
          title="Disconnect Console"
          className="w-[calc(100%-16px)] mx-2 flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-mono text-xs"
        >
          <span className="text-red-400 font-bold text-xs">✕</span>
          {expanded && (
            <span className="overflow-hidden whitespace-nowrap text-[10px] uppercase font-bold tracking-wider">
              Disconnect Station
            </span>
          )}
        </button>

        {/* Loop Status indicator */}
        <div className={`flex items-center gap-2.5 px-4 py-1.5 mx-2 text-[10px] font-mono ${isRunning ? 'text-emerald-400' : 'text-slate-500'}`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-slate-600'}`} />
          {expanded && <span>{isRunning ? 'SCADA Loop Active' : 'Loop Paused'}</span>}
        </div>
      </div>
    </aside>
  );
}
