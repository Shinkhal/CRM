import { Routes, Route } from 'react-router-dom';
import AuthSuccess from './pages/AuthSuccess.jsx';
import Customers from './pages/Customers.jsx';
import PrivateRoute from './routes/PrivateRoutes.jsx';
import Landing from './pages/LandingPage.jsx';
import Orders from './pages/Orders.jsx';
import Campaigns from './pages/Campaigns.jsx';
import CampaignHistory from './pages/CampaignHistory.jsx';
import CampaignLogs from './pages/CampaignLogs.jsx';
import Home from './pages/Home.jsx';
import Reports from './pages/Reports.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
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
        <Route path="/" element={<Landing />} />
        <Route path="/auth-success" element={<AuthSuccess />} />
        <Route
          path="/customers"
          element={
            <PrivateRoute>
              <Customers />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <PrivateRoute>
              <Orders />
            </PrivateRoute>
          }
        />
        <Route
          path="/campaigns"
          element={
            <PrivateRoute>
              <Campaigns />
            </PrivateRoute>
          }
        />  
        <Route
          path="/campaign-history"
          element={
            <PrivateRoute>
              <CampaignHistory />
            </PrivateRoute>
          }
        />
        <Route 
          path="/campaign/:id"
          element={
            <PrivateRoute>
              <CampaignLogs />
            </PrivateRoute>
          }
        />
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path='/reports'
          element={
            <PrivateRoute>
              <Reports/>
            </PrivateRoute>
          }
          />
      </Routes>
    </>
  );
}

export default App;