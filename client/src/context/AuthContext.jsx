import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Session key for active operator workstation in the current tab session
const SESSION_KEY = 'smartdc_scada_active_session';

function readStoredSession() {
  try {
    // Only check sessionStorage for the current browser session.
    // We intentionally NEVER restore from permanent localStorage on opening the website,
    // ensuring the Operator Access / Login Portal always appears at the beginning.
    localStorage.removeItem('smartdc_scada_session');
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session) return JSON.parse(session);
  } catch {
    /* corrupted session */
  }
  return null;
}

export function AuthProvider({ children }) {
  const [operator, setOperator] = useState(() => readStoredSession());

  const login = (operatorData) => {
    const session = {
      ...operatorData,
      loginTimestamp: new Date().toISOString(),
      workstationId: 'WS-DISPATCH-01',
    };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      // Ensure permanent localStorage is cleared so opening the website fresh always prompts login
      localStorage.removeItem('smartdc_scada_session');
    } catch (e) {
      console.error('Failed to save active session', e);
    }
    setOperator(session);
  };

  const logout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('smartdc_scada_session');
    } catch (e) {
      console.error('Failed to clear storage', e);
    }
    setOperator(null);
  };

  return (
    <AuthContext.Provider value={{ operator, isAuthenticated: !!operator, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
