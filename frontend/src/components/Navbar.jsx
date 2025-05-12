import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, [location.pathname]);

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white border-b border-gray-400 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand name */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <span className="ml-2 text-xl font-bold text-gray-900">Mini CRM</span>
            </Link>
          </div>
          {isLoggedIn && (
            <div className="hidden md:flex md:items-center md:space-x-1">
              <Link 
                to="/customers" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/customers') 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Customers
              </Link>
              <Link 
                to="/orders" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/orders') 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Orders
              </Link>
              <Link 
                to="/campaigns" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/campaigns') 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                Campaigns
              </Link>
              <Link 
                to="/campaign-history" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/campaign-history') 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                History
              </Link>
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Logout
              </button>
            </div>
          )}
          {isLoggedIn && (
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {!isMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoggedIn && isMenuOpen && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1 px-2">
            <Link
              to="/customers"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/customers')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Customers
            </Link>
            <Link
              to="/orders"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/orders')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Orders
            </Link>
            <Link
              to="/campaigns"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/campaigns')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Campaigns
            </Link>
            <Link
              to="/campaign-history"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/campaign-history')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              History
            </Link>
            <div className="pt-2">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center px-4 py-2 text-base font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;