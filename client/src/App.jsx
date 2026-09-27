import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { TelemetryProvider } from './context/TelemetryContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import LivePage from './pages/LivePage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import WhatIfPage from './pages/WhatIfPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import LoginPage from './pages/LoginPage.jsx';

/**
 * ProtectedLayout — Enforces SCADA Operator Authentication.
 * When authenticated, wraps all routes in TelemetryProvider so the real-time
 * ingestion stream runs continuously in the background across navigation.
 */
function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/access" state={{ from: location }} replace />;
  }

  return (
    <TelemetryProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)] scanline">
        <Sidebar />
        <div
          className="flex flex-col flex-1 min-w-0"
          style={{ marginLeft: 'var(--sidebar-width)' }}
        >
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-[1600px] mx-auto">
              <Routes>
                <Route path="/" element={<LivePage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/whatif" element={<WhatIfPage />} />
                <Route path="/dashboard" element={<AboutPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </TelemetryProvider>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Gate */}
          <Route path="/access" element={<LoginPage />} />

          {/* All Mission-Critical SCADA Control Routes Protected */}
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
