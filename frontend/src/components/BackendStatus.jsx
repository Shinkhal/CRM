// src/components/BackendStatus.jsx
import { useEffect, useState } from "react";

function BackendStatus({ children }) {
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
      } catch (error) {
        setOnline(false);
        console.error("Error checking backend status:", error);
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
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white text-xl">
        Checking backend status...
      </div>
    );
  }

  if (!online) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-900 text-white text-xl">
        Backend is offline. Please try again later.
      </div>
    );
  }

  return children;
}

export default BackendStatus;
