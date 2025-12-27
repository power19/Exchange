import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainDashboard from './pages/MainDashboard'
import PattyDashboard from './pages/PattyDashboard'
import DairimarDashboard from './pages/DairimarDashboard'
import ModernDashboardExample from './pages/ModernDashboardExample'
import { PushNotificationService } from './services/pushNotificationService'
import { ToastProvider } from './components/Toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginScreen from './components/LoginScreen'

function AppContent() {
  const { user, loading } = useAuth();
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

    if (envDashboard === 'patty') {
      console.log(`✅ Using patty dashboard (from env var)`);
      setCurrentDashboard('patty');
      PushNotificationService.initialize('patty');
      return;
    } else if (envDashboard === 'dairimar') {
      console.log(`✅ Using dairimar dashboard (from env var)`);
      setCurrentDashboard('dairimar');
      PushNotificationService.initialize('dairimar');
      return;
    } else if (envDashboard === 'brian' || envDashboard === 'main') {
      console.log(`✅ Using main dashboard (from env var)`);
      setCurrentDashboard('main');
      PushNotificationService.initialize('brian');
      return;
    }

    // Determine which dashboard to show based on hostname
    const hostname = window.location.hostname;

    if (hostname.startsWith('pato.') || hostname.startsWith('patty.')) {
      console.log('✅ Using patty dashboard (from hostname)');
      setCurrentDashboard('patty');
      PushNotificationService.initialize('patty');
    } else if (hostname.startsWith('dai.')) {
      console.log('✅ Using dairimar dashboard (from hostname)');
      setCurrentDashboard('dairimar');
      PushNotificationService.initialize('dairimar');
    } else {
      console.log('✅ Using main dashboard (default)');
      setCurrentDashboard('main');
      PushNotificationService.initialize('brian');
    }
  }, []);

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* For development: allow accessing different dashboards via routes */}
        <Route path="/patty" element={<PattyDashboard />} />
        <Route path="/dairimar" element={<DairimarDashboard />} />
        <Route path="/main" element={<MainDashboard />} />
        <Route path="/modern" element={<ModernDashboardExample />} />

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

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
