/**
 * Footer — contains project info + Contact section.
 * Contact section is a stated frontend requirement (from memory).
 */
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--color-border)]">

      {/* ── Contact section ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10
                      grid sm:grid-cols-3 gap-8">

        {/* Brand blurb */}
        <div className="space-y-2">
          <p className="font-bold text-blue-600 dark:text-indigo-400">⚡ SmartDC-Energy</p>
          <p className="text-xs text-muted leading-relaxed">
            An end-to-end data center energy management and anomaly detection platform.
            Built as a B.Tech CSE Final Year Capstone Project.
          </p>
        </div>

        {/* Quick links */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Quick Links</p>
          <ul className="space-y-1 text-xs text-muted">
            <li><a href="/analytics" className="hover:text-blue-500 dark:hover:text-indigo-400 transition-colors">Model Analytics</a></li>
            <li><a href="/whatif"    className="hover:text-blue-500 dark:hover:text-indigo-400 transition-colors">What-If Analysis</a></li>
            <li><a href="/live"      className="hover:text-blue-500 dark:hover:text-indigo-400 transition-colors">Live Dashboard</a></li>
            <li><a href="/login"     className="hover:text-blue-500 dark:hover:text-indigo-400 transition-colors">Login</a></li>
          </ul>
        </div>

        {/* Contact */}
        <div className="space-y-2" id="contact">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Contact</p>
          <ul className="space-y-1 text-xs text-muted">
            <li>📧 <span className="select-all">smartdc.energy@project.edu</span></li>
            <li>🏫 Department of Computer Science &amp; Engineering</li>
            <li>🎓 B.Tech Final Year · Batch 2021–25</li>
            <li>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-500 dark:hover:text-indigo-400 transition-colors"
              >
                🔗 GitHub Repository
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
      <div className="border-t border-[var(--color-border)] py-4 text-center text-xs text-muted">
        <p>
          SmartDC-Energy — Data Center Operations Management &amp; Analytics Platform ·{' '}
          B.Tech CSE Final Year Capstone Project · 2024–25
        </p>
      </div>

    </footer>
  );
}
