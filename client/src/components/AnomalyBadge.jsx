/**
 * AnomalyBadge — renders an industrial coloured status badge.
 * Supports tri-state SCADA statuses:
 *   - "CRITICAL TRIP" / "CRITICAL" / "FAILURE" (Red alert)
 *   - "WARNING" / "ELEVATED RISK" (Amber warning)
 *   - "NOMINAL" / "NORMAL" (Emerald nominal)
 *
 * Colour is NOT the only differentiator — text and icon dot are always shown (a11y).
 */
export default function AnomalyBadge({ status, large = false }) {
  const normalized = (status || '').toUpperCase();
  const isCritical = normalized === 'FAILURE' || normalized.includes('CRITICAL');
  const isWarning = normalized === 'WARNING' || normalized.includes('ELEVATED');

  const base = large
    ? 'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono font-bold text-xs uppercase tracking-wider'
    : 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono font-semibold text-[10px] uppercase tracking-wider';

  let colour = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
  let dot = 'w-2 h-2 rounded-full bg-emerald-400';
  let label = 'NOMINAL';

  if (isCritical) {
    colour = 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.25)]';
    dot = 'w-2 h-2 rounded-full bg-red-400 animate-pulse';
    label = 'CRITICAL TRIP';
  } else if (isWarning) {
    colour = 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]';
    dot = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
    label = 'WARNING';
  } else if (normalized && normalized !== 'NORMAL' && normalized !== 'NOMINAL') {
    label = normalized;
  }

  return (
    <span className={`${base} ${colour}`} role="status" aria-label={`Telemetry alarm status: ${label}`}>
      <span className={dot} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
