import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [toastExiting, setToastExiting] = useState(false);

  const showToast = useCallback((msg, duration = 2500) => {
    setToast(msg);
    setToastExiting(false);
    setTimeout(() => setToastExiting(true), duration - 300);
    setTimeout(() => { setToast(null); setToastExiting(false); }, duration);
  }, []);

  return (
    <AppContext.Provider value={{ toast, toastExiting, showToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export default AppContext;
