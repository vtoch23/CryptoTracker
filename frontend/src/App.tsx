import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Dashboard from "./pages/Dashboard";
import { startTokenExpirationMonitor } from "./utils/tokenExpirationChecker";

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = window.localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Token Monitor Component - wraps the app to monitor token expiration
function TokenMonitor({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only monitor token if we're not on login/register pages
    const publicPaths = ['/login', '/register'];
    if (publicPaths.includes(location.pathname)) {
      return;
    }

    // Start monitoring token expiration
    const cleanup = startTokenExpirationMonitor(
      () => {
        // Token expired callback
        console.log('🚪 Token expired - redirecting to login...');
        console.log('📍 Current location:', location.pathname);

        // Clear token
        localStorage.removeItem('token');
        console.log('🗑️ Token removed from localStorage');

        // Use window.location for reliable redirect from timer context
        console.log('🔄 Redirecting to /login using window.location...');
        window.location.href = '/login';
      },
      10000 // Check every 10 seconds
    );

    // Cleanup on unmount
    return cleanup;
  }, [navigate, location.pathname]);

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <TokenMonitor>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </TokenMonitor>
    </BrowserRouter>
  );
}

export default App;