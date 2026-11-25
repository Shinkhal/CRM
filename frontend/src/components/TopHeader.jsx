import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/userContext.js';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/authContext.js';
import { toast } from 'react-toastify';
import {
  Menu,
  Search,
  Plus,
  Command,
  ChevronDown,
  Building2,
  Users,
  TrendingUp,
  CheckSquare,
  User,
  Shield,
  Store,
  LogOut,
} from 'lucide-react';
import { Avatar, Badge } from './ui';

const ROUTE_TITLES = {
  '/home': { title: 'Dashboard', category: 'Overview' },
  '/customers': { title: 'Customers & Leads', category: 'Core' },
  '/organizations': { title: 'Corporate Accounts', category: 'B2B' },
  '/pipeline': { title: 'Sales Pipeline', category: 'Sales' },
  '/leads': { title: 'Lead Pipeline', category: 'Sales' },
  '/forecast': { title: 'Revenue Forecast', category: 'Analytics' },
  '/pipeline-settings': { title: 'Pipeline Stages', category: 'Administration' },
  '/workflows': { title: 'Workflow Automation', category: 'Administration' },
  '/tasks': { title: 'Tasks & Activities', category: 'Operations' },
  '/orders': { title: 'Orders & Transactions', category: 'Operations' },
  '/campaigns': { title: 'Marketing Campaigns', category: 'Marketing' },
  '/campaign-history': { title: 'Campaign History', category: 'Marketing' },
  '/reports': { title: 'Intelligence & Reports', category: 'Analytics' },
  '/team': { title: 'Team & Permissions', category: 'Administration' },
  '/store': { title: 'App Store & Plugins', category: 'Administration' },
  '/invite': { title: 'Invite Team Member', category: 'Administration' },
  '/profile': { title: 'User Profile & Account', category: 'Account' },
};

const TopHeader = ({ onOpenMobile, onOpenSearch }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { logout } = useAuth();
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('#quick-action-menu')) {
        setQuickMenuOpen(false);
      }
      if (!e.target.closest('#user-profile-menu')) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const routeInfo = ROUTE_TITLES[location.pathname] || {
    title: 'Workspace',
    category: 'Nexus',
  };

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left side: Hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Nexus</span>
            <span>/</span>
            <span className="font-medium text-slate-500">{routeInfo.category}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {routeInfo.title}
          </h1>
        </div>
      </div>

      {/* Middle: Global Quick Jump Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-300 text-slate-400 hover:text-slate-600 transition-all text-sm group shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-xs sm:text-sm text-slate-400">Search pages, deals, accounts...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-md shadow-xs">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>
      </div>

      {/* Right side: Actions & Status */}
      <div className="flex items-center gap-3">
        {/* Quick Action Dropdown */}
        <div id="quick-action-menu" className="relative">
          <button
            onClick={() => setQuickMenuOpen(!quickMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-xs sm:text-sm shadow-sm shadow-blue-500/25 hover:shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Add</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {quickMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Create New
              </div>
              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  navigate('/customers');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left"
              >
                <Users className="w-4 h-4 text-blue-600" />
                <span>Add Customer / Lead</span>
              </button>
              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  navigate('/organizations');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left"
              >
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>New B2B Account</span>
              </button>
              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  navigate('/pipeline');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors text-left"
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Create Sales Deal</span>
              </button>
              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  navigate('/tasks');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-amber-600 transition-colors text-left"
              >
                <CheckSquare className="w-4 h-4 text-amber-600" />
                <span>Create Task</span>
              </button>
            </div>
          )}
        </div>

        {/* Live sync pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Sync</span>
        </div>

        {/* Mobile Search Icon */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* In-app notifications, populated by workflows */}
        <NotificationBell />

        {/* User profile dropdown */}
        {user && (
          <div id="user-profile-menu" className="relative pl-2 border-l border-slate-200">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
              title={`${user.name || user.email} (${user.role})`}
            >
              <Avatar name={user.name || user.email} size="sm" />
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                  {user.name || 'User'}
                </span>
                <span className="text-[10px] font-medium text-slate-400 capitalize">
                  {user.role || 'Member'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User card header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <Avatar name={user.name || user.email} size="md" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {user.name || 'User'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge variant="primary" className="text-[10px] px-1.5 py-0 capitalize">
                        {user.role || 'User'}
                      </Badge>
                      {(user.business?.name || user.organization?.name) && (
                        <span className="text-[10px] text-slate-400 truncate">
                          {user.business?.name || user.organization?.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nav Links */}
                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile & Account</span>
                  </Link>

                  {(user.role === 'admin' || user.role === 'superadmin') && (
                    <Link
                      to="/team"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                    >
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span>Team & Permissions</span>
                    </Link>
                  )}

                  <Link
                    to="/store"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                  >
                    <Store className="w-4 h-4 text-slate-400" />
                    <span>App Store & Integrations</span>
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopHeader;
