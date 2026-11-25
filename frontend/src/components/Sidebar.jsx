import { NavLink, useLocation } from 'react-router-dom';
import { useUser } from '../context/userContext.js';
import {
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
  ChevronLeft,
  ChevronRight,
  X,
  Flame,
  Settings2,
  Target,
  Zap,
} from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const { user, isModuleEnabled } = useUser();

  const navSections = [
    {
      title: 'CORE CRM',
      items: [
        {
          path: '/home',
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: null,
          enabled: true,
        },
        {
          path: '/customers',
          label: 'Customers & Leads',
          icon: Users,
          badge: null,
          enabled: true,
        },
        {
          path: '/organizations',
          label: 'B2B Accounts',
          icon: Building2,
          badge: 'B2B',
          enabled: isModuleEnabled('organizations'),
        },
        {
          path: '/leads',
          label: 'Leads',
          icon: Flame,
          badge: 'New',
          enabled: isModuleEnabled('sales_pipeline'),
        },
        {
          path: '/pipeline',
          label: 'Sales Pipeline',
          icon: TrendingUp,
          badge: 'Deals',
          enabled: isModuleEnabled('sales_pipeline'),
        },
        {
          path: '/forecast',
          label: 'Forecast',
          icon: Target,
          badge: null,
          enabled: isModuleEnabled('sales_pipeline'),
        },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        {
          path: '/tasks',
          label: 'Tasks',
          icon: CheckSquare,
          badge: null,
          enabled: isModuleEnabled('tasks'),
        },
        {
          path: '/orders',
          label: 'Orders',
          icon: ShoppingCart,
          badge: null,
          enabled: isModuleEnabled('orders'),
        },
        {
          path: '/campaigns',
          label: 'Campaigns',
          icon: Megaphone,
          badge: null,
          enabled: isModuleEnabled('campaigns'),
        },
        {
          path: '/campaign-history',
          label: 'Campaign Logs',
          icon: History,
          badge: null,
          enabled: isModuleEnabled('campaigns'),
        },
      ],
    },
    {
      title: 'ADMIN & PLATFORM',
      items: [
        {
          path: '/reports',
          label: 'AI Reports',
          icon: BarChart3,
          badge: 'AI',
          enabled: user?.role === 'admin' && isModuleEnabled('ai_insights'),
        },
        {
          path: '/team',
          label: 'Team & Access',
          icon: Shield,
          badge: null,
          enabled: true,
        },
        {
          path: '/store',
          label: 'App Store',
          icon: Store,
          badge: 'Modules',
          enabled: user?.role === 'admin',
        },
        {
          path: '/pipeline-settings',
          label: 'Pipeline Stages',
          icon: Settings2,
          badge: null,
          enabled: user?.role === 'admin' || user?.role === 'manager',
        },
        {
          path: '/workflows',
          label: 'Automation',
          icon: Zap,
          badge: 'Workflows',
          enabled: user?.role === 'admin' || user?.role === 'manager',
        },
      ],
    },
  ];

  const closeMobile = () => {
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col bg-[#F8F9FB] border-r border-[#E2E6EE] text-[#111827] transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } shadow-xl lg:shadow-none`}
      >
        {/* Brand / Workspace Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E2E6EE] bg-white">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E6EE] shadow-xs flex items-center justify-center text-[#181E29] flex-shrink-0"
                 style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.06), inset 0 1px 0 #FFF' }}>
              <Building2 className="w-5 h-5 text-[#181E29]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-extrabold text-[#111827] tracking-tight text-base truncate">
                    Nexus
                  </span>
                </div>
                <span className="text-[11px] text-[#6B7280] truncate font-medium">
                  Workspace
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={closeMobile}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#EEF1F6] lg:hidden"
            title="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section, idx) => {
            const activeItems = section.items.filter((item) => item.enabled);
            if (activeItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-2 font-mono">
                    {section.title}
                  </p>
                )}

                {activeItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={closeMobile}
                      title={isCollapsed ? item.label : undefined}
                      className={({ isActive: linkActive }) =>
                        `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                          linkActive || isActive
                            ? 'bg-white text-[#111827] border border-[#E2E6EE] font-bold shadow-xs'
                            : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#EEF1F6]'
                        } ${isCollapsed ? 'justify-center px-0' : ''}`
                      }
                      style={({ isActive: linkActive }) => (linkActive || isActive ? { boxShadow: '0 1px 2px rgba(15,23,42,0.04), inset 0 1px 0 #FFF' } : {})}
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                          isActive ? 'text-[#181E29]' : 'text-[#6B7280] group-hover:text-[#111827]'
                        }`}
                      />

                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                isActive
                                  ? 'bg-[#EEF1F6] text-[#181E29] border border-[#CBD2DF]'
                                  : 'bg-[#EEF1F6] text-[#6B7280]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#181E29] rounded-r-full" />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer: Collapse Toggle & Status */}
        <div className="p-3 border-t border-[#E2E6EE] bg-white">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="skeuo-button w-full text-xs font-semibold py-2 px-3 gap-2"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-[#4B5563]" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 text-[#4B5563]" />
                  <span>Collapse Sidebar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
