import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AuthSuccess from "./pages/AuthSuccess.jsx";
import Customers from "./pages/Customers.jsx";
import Landing from "./pages/LandingPage.jsx";
import Orders from "./pages/Orders.jsx";
import Campaigns from "./pages/Campaigns.jsx";
import CampaignHistory from "./pages/CampaignHistory.jsx";
import CampaignLogs from "./pages/CampaignLogs.jsx";
import Home from "./pages/Home.jsx";
import Reports from "./pages/Reports.jsx";
import InviteMemberPage from "./pages/InviteMember.jsx";
import Teams from "./pages/Team.jsx";
import AcceptInvite from "./pages/AcceptInvite.jsx";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "./context/AuthContext.jsx";

function App() {
  const { accessToken } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/health`);
        if (res.ok) {
          setOnline(true);
        } else {
          setOnline(false);
        }
      } catch (err) {
        console.error("Backend health check failed:", err);
        setOnline(false);
      } finally {
        setLoading(false);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
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
        <div className="p-8 bg-white shadow rounded-lg text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Server Down
          </h2>
          <p className="text-gray-600 mb-4">
            Our servers are currently unavailable. Please try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Retry
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
        <Route path="/auth-success" element={<AuthSuccess />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaign-history" element={<CampaignHistory />} />
        <Route path="/campaign/:id" element={<CampaignLogs />} />
        <Route path="/home" element={<Home />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/invite" element={<InviteMemberPage />} />
        <Route path="/team" element={<Teams />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
      </Routes>
    </>
  );
}

export default App;
