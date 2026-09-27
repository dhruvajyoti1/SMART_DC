/**
 * LoadingSpinner — centred spinner with optional label.
 * Styled for the dark control-system theme with a cyan spinner.
 * Usage: <LoadingSpinner label="Loading analytics..." />
 */
export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div
        className="w-10 h-10 rounded-full border-4 border-[var(--color-border)]
                   border-t-cyan-400 animate-spin"
        role="status"
        aria-label={label}
      />
      <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
