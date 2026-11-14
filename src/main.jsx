import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

const standalone = import.meta.env.VITE_PULSE_ONLY === 'true' || window.location.pathname.startsWith('/pulse')
// Keep GERAK providers, CSS and their side effects out of the standalone tree.
const Application = standalone
  ? (await import('./pulse/PulseApp.jsx')).default
  : await (async () => {
      const [{ AuthProvider }, { AppProvider }, { default: Router }] = await Promise.all([
        import('./context/AuthContext'), import('./context/AppContext'), import('./Router'), import('./index.css'),
      ])
      return function GerakApplication() {
        return <AuthProvider><AppProvider><Router /></AppProvider></AuthProvider>
      }
    })()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Application />
    </BrowserRouter>
  </StrictMode>,
)
