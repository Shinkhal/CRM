import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/authContext.js';
import { useUser } from '../context/userContext.js';
import { toast } from 'react-toastify';
import {
  Building2,
  Plus,
  Search,
  Globe,
  Users,
  IndianRupee,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Briefcase,
  X,
  ExternalLink,
  Kanban,
} from 'lucide-react';
import { listOf } from '../api/collections';

const INDUSTRIES = [
  'All',
  'Technology',
  'Finance & Banking',
  'Healthcare',
  'Retail & E-commerce',
  'Manufacturing',
  'Consulting',
  'Real Estate',
  'Education',
  'General',
];

const Organizations = () => {
  const { accessToken } = useAuth();
  const { user } = useUser();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: 'Technology',
    employeeCount: '',
    annualRevenue: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    country: 'India',
  });

  const fetchOrganizations = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedIndustry !== 'All') params.industry = selectedIndustry;

      const res = await axios.get('/organizations', { params });
      setOrganizations(listOf(res.data, 'organizations'));
    } catch (err) {
      console.error('Failed to load organizations:', err);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [accessToken, searchTerm, selectedIndustry]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return toast.warning('Organization name is required');
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        website: formData.website.trim() || undefined,
        industry: formData.industry,
        employeeCount: Number(formData.employeeCount) || 0,
        annualRevenue: Number(formData.annualRevenue) || 0,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: {
          street: formData.street.trim() || undefined,
          city: formData.city.trim() || undefined,
          country: formData.country.trim() || undefined,
        },
      };

      const res = await axios.post('/organizations', payload);
      setOrganizations((prev) => [res.data.organization, ...prev]);
      toast.success('Organization registered successfully!');
      setIsModalOpen(false);
      setFormData({
        name: '',
        website: '',
        industry: 'Technology',
        employeeCount: '',
        annualRevenue: '',
        phone: '',
        email: '',
        street: '',
        city: '',
        country: 'India',
      });
      fetchOrganizations();
    } catch (err) {
      console.error('Failed to create organization:', err);
      toast.error(err.response?.data?.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (orgId) => {
    if (!window.confirm('Are you sure you want to delete this organization account?')) return;
    try {
      await axios.delete(`/organizations/${orgId}`);
      setOrganizations((prev) => prev.filter((o) => o._id !== orgId));
      toast.success('Organization removed');
    } catch (err) {
      console.error('Failed to delete organization:', err);
      toast.error('Failed to delete organization');
    }
  };

  const totalOrgs = organizations.length;
  const totalPipeline = organizations.reduce((acc, o) => acc + (o.totalDealValue || 0), 0);
  const totalContacts = organizations.reduce((acc, o) => acc + (o.customerCount || 0), 0);
  const avgEmployees =
    totalOrgs > 0
      ? Math.round(organizations.reduce((acc, o) => acc + (o.employeeCount || 0), 0) / totalOrgs)
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl shadow-md">
                <Building2 className="w-6 h-6" />
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                B2B Organizations
              </h1>
            </div>
            <p className="text-slate-500 mt-1 text-sm">
              Manage corporate accounts, corporate contacts, multi-contact deals, and industry revenue metrics.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>New Organization</span>
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Accounts</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalOrgs}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Deal Pipeline</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totalPipeline.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Linked Contacts</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{totalContacts}</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Avg Headcount</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{avgEmployees}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search companies, website, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Industry:</span>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Organizations Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-500 font-medium">Loading organization directory...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No organizations found</h3>
            <p className="text-slate-500 text-sm mb-6">
              Track B2B enterprise deals and link multiple contacts under their respective corporate parent accounts.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Register Organization</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {organizations.map((org) => (
              <div
                key={org._id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-lg shadow-sm">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900 leading-tight">
                          {org.name}
                        </h3>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 inline-block mt-1">
                          {org.industry || 'General'}
                        </span>
                      </div>
                    </div>

                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(org._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete organization"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {org.website && (
                    <a
                      href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-3.5 truncate"
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{org.website}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  )}

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                    {org.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{org.phone}</span>
                      </div>
                    )}
                    {org.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{org.email}</span>
                      </div>
                    )}
                    {(org.address?.city || org.address?.country) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {[org.address?.city, org.address?.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Aggregate Badge Bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-600 font-semibold">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span>{org.customerCount || 0} Contacts</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-700 font-bold">
                    <Kanban className="w-3.5 h-3.5 text-indigo-500" />
                    <span>₹{Number(org.totalDealValue || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Organization Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Register New Organization</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation Pvt Ltd"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Website URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://acme.com"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Industry
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {INDUSTRIES.filter((i) => i !== 'All').map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Employee Count
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 250"
                      value={formData.employeeCount}
                      onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Annual Revenue (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5000000"
                      value={formData.annualRevenue}
                      onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      placeholder="contact@acme.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="Bengaluru"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      placeholder="India"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow disabled:opacity-50"
                  >
                    {submitting ? 'Registering...' : 'Register Company'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default Organizations;
