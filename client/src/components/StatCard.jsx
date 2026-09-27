/**
 * StatCard — displays a metric name + value + optional unit + optional trend.
 * Styled for the dark control-system theme with cyan accents.
 *
 * Props:
 *   label    {string}  — metric name, e.g. "MAE"
 *   value    {number|string} — the metric value
 *   unit     {string}  — optional unit suffix, e.g. "kWh"
 *   sub      {string}  — optional subscript explanation
 *   colour   {string}  — optional Tailwind colour class for the value text
 */
export default function StatCard({ label, value, unit = '', sub = '', colour = '' }) {
  const displayValue = value !== undefined && value !== null
    ? (typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : value)
    : '—';

  return (
    <div className="control-panel p-5 flex flex-col gap-1 min-w-[140px]">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className={`text-2xl font-bold ${colour || 'text-cyan-400'}`}>
        {displayValue}
        {unit && <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-[10px] text-[var(--color-text-muted)]">{sub}</p>}
    </div>
  );
}
