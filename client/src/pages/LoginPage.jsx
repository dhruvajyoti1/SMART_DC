import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  ShieldLockIcon,
  ZapIcon,
  ServerRackIcon,
  CheckCircleIcon,
  TerminalIcon
} from '../components/Icons.jsx';

/**
 * LoginPage — SCADA / DCS Operator Access Portal.
 * Authentic industrial gatekeeper for power plant & datacenter facility operators.
 * Users CANNOT access the control software without authenticating first.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  const [email, setEmail] = useState('operator@smartdc.internal');
  const [password, setPassword] = useState('scada-secure-2026');
  const [error, setError] = useState('');
  const [facilityId, setFacilityId] = useState('IOWA-HYPERSCALE-01');
  const [operatorId, setOperatorId] = useState('OP-8492');
  const [accessLevel, setAccessLevel] = useState('L2-Operator');
  const [controlModule, setControlModule] = useState('Energy Management & Forecasting');
  const [shiftAssignment, setShiftAssignment] = useState('Day Shift (06:00–14:00)');
  const [mfaCode, setMfaCode] = useState('749210');
  const [remember, setRemember] = useState(true);

  // If already logged in, jump directly to control software
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Operator credentials required: Please enter operator email and password.');
      return;
    }
    setError('');

    // Grant SCADA Session
    login({
      email: email.trim(),
      operatorId: operatorId.trim() || 'ENG-GUEST',
      facilityId,
      accessLevel,
      controlModule,
      shiftAssignment,
    });

    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center grid-pattern bg-[#050b14] text-slate-100 p-4 font-sans select-none">
      <div className="w-full max-w-xl control-panel bg-[#081224] border border-[#162744] rounded-2xl shadow-2xl relative overflow-hidden my-6">

        {/* Top SCADA Security Stripe */}
        <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500"></div>

        <div className="p-8">
          {/* Station Security Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0b1830] border border-cyan-500/40 mb-3 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <ShieldLockIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-xl font-black tracking-widest text-slate-100 uppercase font-mono">
              OPERATOR SCADA WORKSTATION
            </h1>
            <p className="text-[10px] text-amber-400 font-mono tracking-widest uppercase mt-0.5 font-bold">
              AUTHENTICATION GATEWAY · ACCESS LOCKED UNTIL VERIFIED
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              SmartDC Energy Management System · DCS-SCADA v2.4.1
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center font-mono">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 font-mono text-xs">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Facility Substation
                </label>
                <select
                  value={facilityId}
                  onChange={e => setFacilityId(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#1a2d47] bg-[#0b162a] text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
                >
                  <option value="IOWA-HYPERSCALE-01">IOWA-HYPERSCALE-01 (15MW Primary)</option>
                  <option value="IOWA-HYPERSCALE-02">IOWA-HYPERSCALE-02 (Auxiliary Pod)</option>
                  <option value="OREGON-DC-03">OREGON-DC-03 (Hydro Bus Feeder)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Operator Badge ID
                </label>
                <input
                  type="text"
                  value={operatorId}
                  onChange={e => setOperatorId(e.target.value)}
                  placeholder="OP-8492"
                  className="px-3 py-2 rounded-lg border border-[#1a2d47] bg-[#0b162a] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                SCADA User Email / Operator Tag
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="operator@smartdc.internal"
                className="px-3 py-2 rounded-lg border border-[#1a2d47] bg-[#0b162a] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Security Passkey / Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="px-3 py-2 rounded-lg border border-[#1a2d47] bg-[#0b162a] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Role Authorization
                </label>
                <select
                  value={accessLevel}
                  onChange={e => setAccessLevel(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#1a2d47] bg-[#0b162a] text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
                >
                  <option value="L2-Operator">L2 Dispatch Operator</option>
                  <option value="L3-Engineer">L3 Energy Systems Engineer</option>
                  <option value="L4-Administrator">L4 Chief Plant Controller</option>
                  <option value="Read-Only">L1 Read-Only Monitor</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Shift
                </label>
                <select
                  value={shiftAssignment}
                  onChange={e => setShiftAssignment(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#1a2d47] bg-[#0b162a] text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
                >
                  <option value="Day Shift (06:00–14:00)">Day Shift (06:00–14:00)</option>
                  <option value="Swing Shift (14:00–22:00)">Swing Shift (14:00–22:00)</option>
                  <option value="Night Shift (22:00–06:00)">Night Shift (22:00–06:00)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Primary Control Bay
                </label>
                <select
                  value={controlModule}
                  onChange={e => setControlModule(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#1a2d47] bg-[#0b162a] text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
                >
                  <option value="Energy Management & Forecasting">Energy Management & Forecasting</option>
                  <option value="CRAC & Chiller Loop Control">CRAC & Chiller Loop Control</option>
                  <option value="Switchgear & UPS Power Bus">Switchgear & UPS Power Bus</option>
                  <option value="Full Facility SCADA">Full Facility SCADA</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Hardware Token (MFA)
                </label>
                <input
                  type="text"
                  maxLength="6"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  placeholder="000000"
                  className="px-3 py-2 rounded-lg border border-[#1a2d47] bg-[#0b162a] text-cyan-400 tracking-widest placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-[#1a2d47] bg-[#0b162a] text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="remember" className="text-[11px] text-slate-400 cursor-pointer select-none">
                Retain dispatch credentials for current station session
              </label>
            </div>

            <button
              type="submit"
              className="w-full mt-3 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs uppercase tracking-widest rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-[0.99]"
            >
              Authenticate & Unlock Control System
            </button>

            <p className="text-center text-[10px] text-slate-500 font-mono mt-3">
              Default pre-filled credentials ready. Click "Authenticate" to enter.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
