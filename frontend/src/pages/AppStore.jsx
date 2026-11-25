import { useState } from 'react';
import { useUser } from '../context/userContext.js';
import { toast } from 'react-toastify';
import {
  Kanban,
  Megaphone,
  ShoppingCart,
  Sparkles,
  CheckSquare,
  Search,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  Store,
  Layers,
  Zap,
} from 'lucide-react';

const iconMap = {
  Kanban: Kanban,
  Megaphone: Megaphone,
  ShoppingCart: ShoppingCart,
  Sparkles: Sparkles,
  CheckSquare: CheckSquare,
};

const categoryGradients = {
  Sales: 'from-blue-500 to-indigo-600',
  Marketing: 'from-purple-500 to-pink-600',
  Intelligence: 'from-amber-500 to-orange-600',
  Productivity: 'from-emerald-500 to-teal-600',
};

const AppStore = () => {
  const { user, modulesCatalog, enabledModules, toggleModule, modulesLoading } = useUser();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const isAdmin = user?.role === 'admin';

  const categories = ['All', 'Sales', 'Marketing', 'Intelligence', 'Productivity'];

  const filteredModules = modulesCatalog.filter((mod) => {
    const matchesCategory = selectedCategory === 'All' || mod.category === selectedCategory;
    const matchesSearch =
      mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleToggle = async (moduleId, currentStatus) => {
    if (!isAdmin) {
      toast.error('Only organization administrators can enable or disable CRM modules.');
      return;
    }

    setUpdatingId(moduleId);
    const targetStatus = !currentStatus;

    try {
      const res = await toggleModule(moduleId, targetStatus);
      if (res.success) {
        toast.success(res.message || `${targetStatus ? 'Enabled' : 'Disabled'} module successfully!`);
      } else {
        toast.error(res.error || 'Failed to update module');
      }
    } catch {
      toast.error('Unexpected error toggling module');
    } finally {
      setUpdatingId(null);
    }
  };

  const activeCount = enabledModules.length;
  const totalCount = modulesCatalog.length || 5;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-8 sm:p-10 text-white shadow-xl mb-8 border border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-400/30">
                <Store className="w-3.5 h-3.5" />
                <span>Modular SaaS Architecture</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
                CRM App & Plugin Marketplace
              </h1>
              <p className="text-slate-300 text-base leading-relaxed">
                Customize your organization's CRM workspace. Turn on the modules you need and hide the ones you don't. Navigation, routes, and workflows adapt dynamically in real-time.
              </p>
            </div>

            <div className="flex flex-row sm:flex-col gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 text-center min-w-[140px]">
                <span className="block text-2xl font-black text-white">{activeCount} / {totalCount}</span>
                <span className="text-xs text-slate-300 font-medium">Active Plugins</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 text-center min-w-[140px]">
                <span className="block text-xs uppercase font-bold text-emerald-400 tracking-wider">Multi-Tenant</span>
                <span className="text-sm font-semibold text-white truncate max-w-[130px] block">
                  {user?.role ? user.role.toUpperCase() : 'MEMBER'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-800"
            />
          </div>
        </div>

        {/* Module Cards Grid */}
        {modulesLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Loading module marketplace...</p>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700">No plugins found</h3>
            <p className="text-xs text-gray-500 mt-1">Try selecting another category or clearing your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((module) => {
              const IconComponent = iconMap[module.icon] || Zap;
              const isEnabled = enabledModules.includes(module.id);
              const gradientClass = categoryGradients[module.category] || 'from-blue-600 to-indigo-600';
              const isUpdating = updatingId === module.id;

              return (
                <div
                  key={module.id}
                  className={`flex flex-col justify-between bg-white rounded-2xl border transition-all duration-200 hover:shadow-md ${
                    isEnabled
                      ? 'border-blue-200 shadow-sm'
                      : 'border-gray-200 opacity-90'
                  }`}
                >
                  <div className="p-6">
                    {/* Top Row: Icon & Status Badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white shadow-md`}>
                        <IconComponent className="w-6 h-6" />
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                          {module.badge || module.category}
                        </span>
                        {isEnabled ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Summary */}
                    <h2 className="text-lg font-bold text-gray-900 mb-2">
                      {module.name}
                    </h2>
                    <p className="text-xs text-gray-600 leading-relaxed mb-4">
                      {module.summary}
                    </p>

                    {/* Features checklist */}
                    <div className="space-y-1.5 pt-3 border-t border-gray-100">
                      <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mb-2">Features Included:</p>
                      {module.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs text-gray-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                          <span className="leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="px-6 py-4 bg-gray-50/70 rounded-b-2xl border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">
                      {isEnabled ? 'App is live in navigation' : 'App is hidden from UI'}
                    </span>

                    {isAdmin ? (
                      <button
                        onClick={() => handleToggle(module.id, isEnabled)}
                        disabled={isUpdating}
                        className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm ${
                          isUpdating
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : isEnabled
                            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow'
                        }`}
                      >
                        {isUpdating ? (
                          <span>Updating...</span>
                        ) : isEnabled ? (
                          <span>Deactivate</span>
                        ) : (
                          <>
                            <span>Enable Module</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Admin managed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-10 p-5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start space-x-3 text-blue-900">
          <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold block mb-0.5">Customization Note:</span>
            Toggling plugins updates your workspace configuration in real-time. Team members will immediately see the corresponding navigation tabs appear or disappear. Data from deactivated plugins remains securely preserved in your database.
          </div>
        </div>
    </div>
  );
};

export default AppStore;
