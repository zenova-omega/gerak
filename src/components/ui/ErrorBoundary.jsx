import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('SINAR Error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#F5F3EE', fontFamily: "'Inter', sans-serif", padding: 24,
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, #1B4332, #2D6A4F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#D4A843' }}>!</span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1814', marginBottom: 8 }}>
              Terjadi Kesalahan
            </h2>
            <p style={{ fontSize: 14, color: '#6B6555', lineHeight: 1.6, marginBottom: 20 }}>
              Aplikasi mengalami masalah. Silakan muat ulang halaman.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 28px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #1B4332, #2D6A4F)',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Muat Ulang
            </button>
            {this.props.showDetails && this.state.error && (
              <details style={{ marginTop: 20, textAlign: 'left' }}>
                <summary style={{ fontSize: 12, color: '#6B6555', cursor: 'pointer' }}>Detail Error</summary>
                <pre style={{
                  fontSize: 11, color: '#EF4444', background: '#FEF2F2',
                  padding: 12, borderRadius: 8, overflow: 'auto', marginTop: 8,
                  maxHeight: 200, whiteSpace: 'pre-wrap',
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
