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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-500"></div>
          </div>
          <p className="text-center text-gray-600 text-sm font-medium">
            Connecting to server...
          </p>
          <div className="mt-3 bg-gray-50 rounded-md p-3">
            <p className="text-xs text-gray-500 text-center">
              Verifying system availability
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-red-100 p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full h-12 w-12 bg-red-50 flex items-center justify-center">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h3 className="text-center text-gray-800 text-lg font-semibold mb-2">
            Service Unavailable
          </h3>
          <p className="text-center text-gray-600 text-sm mb-4">
            Unable to connect to the server. Please check your connection and try again.
          </p>
          <div className="bg-red-50 rounded-md p-3 border border-red-100">
            <p className="text-xs text-red-600 text-center">
              The system will automatically retry every 10 seconds
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-md transition-colors duration-200"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default BackendStatus;