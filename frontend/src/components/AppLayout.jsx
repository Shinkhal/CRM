import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import {
  Search,
  X,
  LayoutDashboard,
  Users,
  Building2,
  TrendingUp,
  CheckSquare,
  ShoppingCart,
  Megaphone,
  History,
  BarChart3,
  Shield,
  Store,
  ArrowRight,
  Flame,
  Target,
  Zap,
} from 'lucide-react';
import { useUser } from '../context/userContext.js';
import axios from '../api/axios';

const AppLayout = () => {
  const navigate = useNavigate();
  const { user, isModuleEnabled } = useUser();

  // Persistent sidebar collapsed preference
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('crm_sidebar_collapsed') === 'true';
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataResults, setDataResults] = useState(null);

  const handleSetCollapsed = (val) => {
    setIsCollapsed(val);
    localStorage.setItem('crm_sidebar_collapsed', String(val));
  };

  // Keyboard shortcut listener: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchItems = [
    { title: 'Dashboard', desc: 'Overview, KPI metrics & sales performance', path: '/home', icon: LayoutDashboard },
    { title: 'Customers & Leads', desc: 'Customer directory, contact profiles, lead management', path: '/customers', icon: Users },
    { title: 'B2B Accounts & Orgs', desc: 'Corporate accounts, linked deals & contacts', path: '/organizations', icon: Building2, enabled: isModuleEnabled('organizations') },
    { title: 'Sales Pipeline & Kanban', desc: 'Deals, stage transitions, revenue forecasting', path: '/pipeline', icon: TrendingUp, enabled: isModuleEnabled('sales_pipeline') },
    { title: 'Leads', desc: 'Lead scoring, temperature and conversion', path: '/leads', icon: Flame, enabled: isModuleEnabled('sales_pipeline') },
    { title: 'Revenue Forecast', desc: 'Time based weighted revenue by period', path: '/forecast', icon: Target, enabled: isModuleEnabled('sales_pipeline') },
    { title: 'Workflow Automation', desc: 'Trigger an event and run a list of actions', path: '/workflows', icon: Zap, enabled: user?.role === 'admin' || user?.role === 'manager' },
    { title: 'Tasks & Follow-ups', desc: 'To-do lists, task deadlines, activity items', path: '/tasks', icon: CheckSquare, enabled: isModuleEnabled('tasks') },
    { title: 'Orders & Transactions', desc: 'Customer order logs and financial receipts', path: '/orders', icon: ShoppingCart, enabled: isModuleEnabled('orders') },
    { title: 'Marketing Campaigns', desc: 'Audience targeting, automated delivery logs', path: '/campaigns', icon: Megaphone, enabled: isModuleEnabled('campaigns') },
    { title: 'Campaign History', desc: 'Delivery analytics, past campaign metrics', path: '/campaign-history', icon: History, enabled: isModuleEnabled('campaigns') },
    { title: 'Intelligence Reports', desc: 'AI-generated summaries, executive business insights', path: '/reports', icon: BarChart3, enabled: user?.role === 'admin' && isModuleEnabled('ai_insights') },
    { title: 'Team & Permissions', desc: 'Single-org employee roles, access status', path: '/team', icon: Shield },
    { title: 'App Store & Plugins', desc: 'Enable/disable modular extensions', path: '/store', icon: Store, enabled: user?.role === 'admin' },
  ].filter((item) => item.enabled !== false);

  const filteredItems = searchItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Data search. The palette used to match navigation entries only, so a
   * rep looking for a customer had to leave the palette and filter a list.
   */
  useEffect(() => {
    const term = searchQuery.trim();
    if (term.length < 2) {
      setDataResults(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get('/search', { params: { q: term } });
        if (!cancelled) setDataResults(res.data?.results || null);
      } catch {
        if (!cancelled) setDataResults(null);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const dataGroups = dataResults
    ? [
        {
          label: 'Customers',
          icon: Users,
          items: (dataResults.customers || []).map((c) => ({
            key: c._id,
            title: c.name,
            desc: c.email,
            path: '/customers',
          })),
        },
        {
          label: 'Deals',
          icon: TrendingUp,
          items: (dataResults.deals || []).map((d) => ({
            key: d._id,
            title: d.title,
            desc: `${d.stage} · ${(d.value || 0).toLocaleString()}`,
            path: '/pipeline',
          })),
        },
        {
          label: 'Accounts',
          icon: Building2,
          items: (dataResults.organizations || []).map((o) => ({
            key: o._id,
            title: o.name,
            desc: o.industry || 'General',
            path: '/organizations',
          })),
        },
        {
          label: 'Tasks',
          icon: CheckSquare,
          items: (dataResults.tasks || []).map((t) => ({
            key: t._id,
            title: t.title,
            desc: t.status,
            path: '/tasks',
          })),
        },
      ].filter((group) => group.items.length > 0)
    : [];

  const handleSelect = (path) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setDataResults(null);
    navigate(path);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={handleSetCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopHeader
          onOpenMobile={() => setIsMobileOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Content View with Smooth Scroll */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette / Quick Search Modal */}
      {isSearchOpen && (
        <div
          onClick={() => setIsSearchOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Search Input Bar */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <Search className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Jump to page, feature, or tool..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-slate-800 placeholder-slate-400 text-sm focus:outline-none"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-50">
              {dataGroups.map((group) => (
                <div key={group.label} className="py-1">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const GroupIcon = group.icon;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleSelect(item.path)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 group transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-600 text-slate-500 group-hover:text-white flex items-center justify-center transition-colors">
                            <GroupIcon className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-slate-800 truncate">
                              {item.title}
                            </span>
                            <span className="text-xs text-slate-400 truncate">{item.desc}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </button>
                    );
                  })}
                </div>
              ))}

              {filteredItems.length === 0 && dataGroups.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  {searchQuery.trim().length < 2
                    ? 'Type at least two characters to search records'
                    : `No records or locations found for "${searchQuery}"`}
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSelect(item.path)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50/70 group transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-900 transition-colors">
                            {item.title}
                          </span>
                          <span className="text-xs text-slate-400 group-hover:text-slate-500 line-clamp-1">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">ESC</kbd> to exit</span>
              <span>Nexus Global Search</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
