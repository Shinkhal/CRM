import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X, Building2 } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { accessToken, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  const isActive = (path) => location.pathname === path;
  const isLoggedIn = !!accessToken;

  const navigationItems = [
    { path: '/home', label: 'Home', icon: '🏠' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/orders', label: 'Orders', icon: '📋' },
    { path: '/campaigns', label: 'Campaigns', icon: '📢' },
    { path: '/campaign-history', label: 'History', icon: '📊' }
  ];

  return (
    <nav className="bg-secondary/80 backdrop-blur-lg border-b border-border-soft sticky top-0 z-50 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link 
              to={isLoggedIn ? '/home' : '/'} 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity group"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-glow rounded-xl flex items-center justify-center shadow-glow">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-secondary animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <p className="text-xl font-bold bg-gradient-to-r from-text-primary to-accent bg-clip-text text-transparent">
                  CRM Pro
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {isLoggedIn && (
            <div className="hidden md:flex items-center space-x-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive(item.path)
                      ? 'bg-elevated border border-accent text-accent shadow-glow'
                      : 'text-text-secondary hover:bg-elevated hover:text-text-primary hover:border hover:border-border-soft'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span className="text-base group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  {isActive(item.path) && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-accent to-accent-glow rounded-full"></div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* Logout Button */}
          {isLoggedIn && (
            <div className="hidden md:flex items-center">
              <button
                onClick={handleLogout}
                className="group flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-danger to-red-600 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          {isLoggedIn && (
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-lg text-text-primary bg-elevated border border-border-soft hover:border-border-strong transition-all"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isLoggedIn && isMenuOpen && (
        <div className="md:hidden bg-primary border-t border-border-soft">
          <div className="px-4 pt-2 pb-3 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ${
                  isActive(item.path)
                    ? 'bg-elevated border border-accent text-accent shadow-glow'
                    : 'text-text-secondary hover:bg-elevated hover:text-text-primary border border-transparent hover:border-border-soft'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            
            <div className="pt-4 mt-4 border-t border-border-soft">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-white bg-gradient-to-r from-danger to-red-600 rounded-lg font-medium hover:shadow-lg transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;