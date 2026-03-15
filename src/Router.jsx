import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Lazy-load pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LegacyApp = lazy(() => import('./App'));

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  // During migration: allow unauthenticated access (demo mode)
  // if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

const Loading = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3EE', fontFamily: "'Inter', sans-serif" }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #1B4332, #2D6A4F)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#D4A843' }}>S</span>
      </div>
      <p style={{ fontSize: 13, color: '#6B6555', fontWeight: 500 }}>Memuat SINAR...</p>
    </div>
  </div>
);

export default function Router() {
  return (
    <ErrorBoundary showDetails>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <LegacyApp />
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
