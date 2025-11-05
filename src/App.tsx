import { StrictMode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { NotificationProvider } from './components/shared/Notification';
import LoginPage from './components/LoginPage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { CompanyAdminDashboard } from './components/CompanyAdmin/CompanyAdminDashboard';
import TeamInchargeDashboard from './components/TeamIncharge';
import TelecallerDashboard from './components/TelecallerDashboard/index';

const getDashboardPath = (role?: string) => {
  switch (role) {
    case 'SuperAdmin': return '/superadmin';
    case 'CompanyAdmin': return '/companyadmin';
    case 'TeamIncharge': return '/teamincharge';
    case 'Telecaller': return '/telecaller';
    default: return '/login';
  }
};

function AppContent() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isLoading: tenantLoading, error: tenantError } = useTenant();

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tenant...</p>
        </div>
      </div>
    );
  }

  if (tenantError && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tenant Not Found</h2>
          <p className="text-gray-600 mb-6">{tenantError}</p>
          <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-md">
            <p className="font-semibold mb-2">Current URL:</p>
            <p className="break-all">{window.location.href}</p>
          </div>
          <div className="mt-6 text-sm text-gray-600">
            <p>Please check:</p>
            <ul className="list-disc list-inside mt-2 text-left">
              <li>The subdomain is correct</li>
              <li>The tenant exists in the database</li>
              <li>The tenant status is active</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }


  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Navigate to={getDashboardPath(user?.role)} replace /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
        />
        <Route
          path="/superadmin"
          element={
            isAuthenticated && user?.role === 'SuperAdmin' ? (
              <SuperAdminDashboard user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/companyadmin"
          element={
            isAuthenticated && (user?.role === 'CompanyAdmin' || user?.role === 'SuperAdmin') ? (
              <CompanyAdminDashboard user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/teamincharge"
          element={
            isAuthenticated && ['TeamIncharge', 'CompanyAdmin', 'SuperAdmin'].includes(user?.role || '') ? (
              <TeamInchargeDashboard user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/telecaller"
          element={
            isAuthenticated ? (
              <TelecallerDashboard user={user} onLogout={logout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <StrictMode>
      <AuthProvider>
        <TenantProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </TenantProvider>
      </AuthProvider>
    </StrictMode>
  );
}

export default App;