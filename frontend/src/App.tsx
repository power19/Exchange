import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainDashboard from './pages/MainDashboard'
import PattyDashboard from './pages/PattyDashboard'
import DairimarDashboard from './pages/DairimarDashboard'

function App() {
  const [currentDashboard, setCurrentDashboard] = useState<'main' | 'patty' | 'dairimar'>('main');

  useEffect(() => {
    // Only determine dashboard for root path
    // Explicit routes (/patty, /dairimar, /main) handle themselves
    if (window.location.pathname !== '/') {
      return;
    }

    // Check for environment variable first (for mobile apps)
    const envDashboard = import.meta.env.VITE_APP_DASHBOARD;
    const apiUrl = import.meta.env.VITE_API_URL;

    console.log('🔧 App Configuration:', {
      envDashboard,
      apiUrl,
      hostname: window.location.hostname,
      pathname: window.location.pathname
    });

    if (envDashboard === 'patty' || envDashboard === 'dairimar') {
      console.log(`✅ Using ${envDashboard} dashboard (from env var)`);
      setCurrentDashboard(envDashboard);
      return;
    }

    // Determine which dashboard to show based on hostname
    const hostname = window.location.hostname;

    if (hostname.startsWith('pato.') || hostname.startsWith('patty.')) {
      console.log('✅ Using patty dashboard (from hostname)');
      setCurrentDashboard('patty');
    } else if (hostname.startsWith('dai.')) {
      console.log('✅ Using dairimar dashboard (from hostname)');
      setCurrentDashboard('dairimar');
    } else {
      console.log('✅ Using main dashboard (default)');
      setCurrentDashboard('main');
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* For development: allow accessing different dashboards via routes */}
        <Route path="/patty" element={<PattyDashboard />} />
        <Route path="/dairimar" element={<DairimarDashboard />} />
        <Route path="/main" element={<MainDashboard />} />

        {/* Default route based on subdomain */}
        <Route
          path="/"
          element={
            currentDashboard === 'patty' ? <PattyDashboard /> :
            currentDashboard === 'dairimar' ? <DairimarDashboard /> :
            <MainDashboard />
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
