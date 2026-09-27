import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'smartdc_scada_session';

function readStoredSession() {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) return JSON.parse(local);
    const session = sessionStorage.getItem(STORAGE_KEY);
    if (session) return JSON.parse(session);
  } catch { /* corrupted storage */ }
  return null;
}

export function AuthProvider({ children }) {
  const [operator, setOperator] = useState(() => readStoredSession());

  const login = (operatorData) => {
    const persist = operatorData.persist ?? false;
    const { persist: _, ...rest } = operatorData;
    const session = {
      ...rest,
      loginTimestamp: new Date().toISOString(),
      workstationId: 'WS-DISPATCH-01',
    };
    try {
      if (persist) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to persist session', e);
    }
    setOperator(session);
  };

  const logout = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
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
