import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
const AuthSuccess = lazy(() => import("./pages/AuthSuccess.jsx"));
const Customers = lazy(() => import("./pages/Customers.jsx"));
const Landing = lazy(() => import("./pages/LandingPage.jsx"));
const Orders = lazy(() => import("./pages/Orders.jsx"));
const Campaigns = lazy(() => import("./pages/Campaigns.jsx"));
const CampaignHistory = lazy(() => import("./pages/CampaignHistory.jsx"));
const CampaignLogs = lazy(() => import("./pages/CampaignLogs.jsx"));
const Home = lazy(() => import("./pages/Home.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const InviteMemberPage = lazy(() => import("./pages/InviteMember.jsx"));
const Teams = lazy(() => import("./pages/Team.jsx"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite.jsx"));
import PrivateRoute from "./routes/PrivateRoutes.jsx";
import AdminRoute from "./routes/AdminRoutes.jsx";
const Pipeline = lazy(() => import("./pages/Pipeline.jsx"));
const AppStore = lazy(() => import("./pages/AppStore.jsx"));
const Tasks = lazy(() => import("./pages/Tasks.jsx"));
const Organizations = lazy(() => import("./pages/Organizations.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.jsx"));
const Leads = lazy(() => import("./pages/Leads.jsx"));
const Forecast = lazy(() => import("./pages/Forecast.jsx"));
const PipelineSettings = lazy(() => import("./pages/PipelineSettings.jsx"));
const Workflows = lazy(() => import("./pages/Workflows.jsx"));
import AppLayout from "./components/AppLayout.jsx";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "./context/authContext.js";

function App() {
  const { accessToken } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let timer;
    const checkBackend = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/health/live`, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
          setOnline(true);
        } else {
          setOnline(false);
          timer = setTimeout(checkBackend, 60000);
        }
      } catch {
        setOnline(false);
        timer = setTimeout(checkBackend, 60000);
      } finally {
        setLoading(false);
      }
    };

    checkBackend();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Checking server status...</p>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-8 bg-white shadow rounded-lg text-center max-w-sm">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Server Down
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Our servers are currently unavailable. Please try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer
        position="bottom-right"
        autoClose={2000}
        hideProgressBar={true}
        newestOnTop
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <Routes>
        <Route
          path="/"
          element={
            accessToken ? (
              <Navigate to="/home" state={{ from: location }} replace />
            ) : (
              <Landing />
            )
          }
        />
        <Route path="/login" element={accessToken ? <Navigate to="/home" replace /> : <AuthPage initialTab="login" />} />
        <Route path="/register" element={accessToken ? <Navigate to="/home" replace /> : <AuthPage initialTab="register" />} />
        <Route path="/auth-success" element={<AuthSuccess />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />

        {/* Authenticated Workspace with Persistent Sidebar Layout */}
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route
            path="/pipeline-settings"
            element={
              <AdminRoute>
                <PipelineSettings />
              </AdminRoute>
            }
          />
          <Route
            path="/workflows"
            element={
              <AdminRoute>
                <Workflows />
              </AdminRoute>
            }
          />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaign-history" element={<CampaignHistory />} />
          <Route path="/campaign/:id" element={<CampaignLogs />} />
          <Route path="/team" element={<Teams />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/reports"
            element={
              <AdminRoute>
                <Reports />
              </AdminRoute>
            }
          />
          <Route
            path="/invite"
            element={
              <AdminRoute>
                <InviteMemberPage />
              </AdminRoute>
            }
          />
          <Route
            path="/store"
            element={
              <AdminRoute>
                <AppStore />
              </AdminRoute>
            }
          />
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}

export default App;
