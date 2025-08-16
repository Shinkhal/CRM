import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import BackendStatus from './components/BackendStatus.jsx';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <BackendStatus>
      <AuthProvider>
        <App />
      </AuthProvider>
      </BackendStatus>
    </BrowserRouter>
  </React.StrictMode>
);
