import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';

/**
 * Navbar — top navigation bar.
 * Uses React Router NavLink (not <a>) for SPA navigation — no full page reloads.
 * "Contact" scrolls to the #contact anchor on the About page.
 * Theme toggle button has aria-label for accessibility.
 */
export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    [
      'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150',
      isActive
        ? 'bg-blue-600 text-white dark:bg-indigo-600'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
    ].join(' ');

  function handleContact(e) {
    e.preventDefault();
    // Navigate to About page first, then scroll to #contact
    navigate('/');
    setTimeout(() => {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  return (
    <nav
      className="sticky top-0 z-50 surface border-b border-[var(--color-border)]
                 backdrop-blur-sm bg-white/80 dark:bg-slate-800/80"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <NavLink to="/" className="text-xl font-bold text-blue-600 dark:text-indigo-400 tracking-tight">
            ⚡ SmartDC-Energy
          </NavLink>
          <span className="hidden sm:block text-xs text-muted border border-[var(--color-border)]
                           rounded-full px-2 py-0.5">
            Data Center Ops
          </span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1 flex-wrap">
          <NavLink to="/" end className={linkClass}>
            About
          </NavLink>
          <NavLink to="/analytics" className={linkClass}>
            Analytics
          </NavLink>
          <NavLink to="/whatif" className={linkClass}>
            What-If
          </NavLink>
          <NavLink to="/live" className={linkClass}>
            Live
          </NavLink>
          {/* Contact — scrolls to #contact section on About page */}
          <button
            onClick={handleContact}
            className="px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150
                       text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            aria-label="Go to contact section"
          >
            Contact
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="ml-2 p-2 rounded-md text-slate-500 dark:text-slate-400
                       hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}
