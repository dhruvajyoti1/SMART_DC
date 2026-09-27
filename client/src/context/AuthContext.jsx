import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'smartdc_scada_session';

export function AuthProvider({ children }) {
  const [operator, setOperator] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (operatorData) => {
    const session = {
      ...operatorData,
      loginTimestamp: new Date().toISOString(),
      workstationId: 'WS-DISPATCH-01',
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to persist session to sessionStorage', e);
    }
    setOperator(session);
  };

  const logout = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear sessionStorage', e);
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
