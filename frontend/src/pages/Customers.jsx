import { useEffect, useState, useCallback } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/authContext.js';
import { useUser } from '../context/userContext.js';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Mail,
  Phone,
  User,
  X,
  Building2,
  Trash2,
  Pencil,
  Flame,
} from 'lucide-react';
import { listOf } from '../api/collections';

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'customer', label: 'Customer' },
  { value: 'churned', label: 'Churned' },
];

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual entry' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'import', label: 'Data import' },
  { value: 'outbound', label: 'Outbound prospecting' },
];

const STATUS_BADGE = {
  lead: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-indigo-100 text-indigo-700',
  customer: 'bg-emerald-100 text-emerald-700',
  churned: 'bg-rose-100 text-rose-700',
};

const TEMPERATURE_BADGE = {
  hot: 'bg-rose-100 text-rose-700',
  warm: 'bg-amber-100 text-amber-700',
  cold: 'bg-sky-100 text-sky-700',
};

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  position: '',
  organizationId: '',
  status: 'lead',
  source: 'manual',
};

const Customers = () => {
  const { accessToken } = useAuth();
  const { user } = useUser();
  const [customers, setCustomers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchCustomers = useCallback(async () => {
    if (!user || !accessToken) return;

    setLoading(true);
    try {
      const res = await axios.get('/customers', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCustomers(listOf(res.data, 'customers'));
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [user, accessToken]);

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await axios.get('/organizations');
      setOrganizations(listOf(res.data, 'organizations'));
    } catch {
      // The account list is optional context: the contact form still works
      // without it.
    }
  }, []);

  useEffect(() => {
    if (user && accessToken) fetchCustomers();
  }, [user, accessToken, fetchCustomers]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (customer) => {
    setEditingId(customer._id);
    setForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      position: customer.position || '',
      organizationId: customer.organizationId?._id || '',
      status: customer.status || 'lead',
      source: customer.source || 'manual',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !accessToken) return toast.error('User not authenticated');

    setSubmitting(true);
    try {
      const formData = {
        ...form,
        organizationId: form.organizationId || undefined,
      };

      if (editingId) {
        await axios.put(`/customers/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        toast.success('Customer updated successfully!');
      } else {
        await axios.post('/customers', formData, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        toast.success('Customer profile created successfully!');
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      setIsModalOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error(error.response?.data?.message || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    try {
      await axios.delete(`/customers/${customer._id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast.success('Customer deleted');
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const canAddCustomer = user?.role === 'admin' || user?.role === 'manager';
  const canDeleteCustomer = user?.role === 'admin';

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.organizationId?.name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const leadCount = customers.filter((c) => c.status === 'lead' || c.status === 'contacted').length;
  const customerCount = customers.filter((c) => c.status === 'customer').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Customers & Contacts
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Manage your lead directory, contact details, and client accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCustomers}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-xs transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {canAddCustomer && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Contacts</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{customers.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Leads</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{leadCount}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Converted</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{customerCount}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">With Company</span>
          <p className="text-2xl font-black text-indigo-600 mt-1">
            {customers.filter((c) => c.organizationId).length}
          </p>
        </div>
      </div>

      {/* Customer Directory Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Search Bar & Actions Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-500 font-medium hidden sm:block">
              {filteredCustomers.length} of {customers.length}
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs text-slate-500 font-medium">Loading customer database...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No contacts found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No customers match your search query "${searchQuery}"`
                : 'Start growing your revenue by adding your first lead or customer.'}
            </p>
            {canAddCustomer && (
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                + Add First Customer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left divide-y divide-slate-100">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3.5">Customer Name</th>
                  <th className="px-6 py-3.5">Company</th>
                  <th className="px-6 py-3.5">Email Address</th>
                  <th className="px-6 py-3.5">Phone Number</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCustomers.map((customer) => {
                  const initials = (customer.name || customer.email || 'C')
                    .charAt(0)
                    .toUpperCase();

                  return (
                    <tr key={customer._id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Name with initials */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block leading-tight">
                              {customer.name || 'Unnamed Contact'}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              {customer.position || 'Contact'}
                              {customer.leadScore !== undefined && (
                                <span
                                  className={`ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold ${
                                    TEMPERATURE_BADGE[customer.temperature] || TEMPERATURE_BADGE.cold
                                  }`}
                                  title={customer.leadScoreReasons?.join(' · ')}
                                >
                                  <Flame className="w-2.5 h-2.5" />
                                  {customer.leadScore}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {customer.organizationId ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                            {customer.organizationId.name}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {customer.email ? (
                          <a
                            href={`mailto:${customer.email}`}
                            className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors group/link"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-blue-500" />
                            <span>{customer.email}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {customer.phone ? (
                          <a
                            href={`tel:${customer.phone}`}
                            className="inline-flex items-center gap-1.5 hover:text-emerald-600 transition-colors group/link"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-emerald-500" />
                            <span>{customer.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            STATUS_BADGE[customer.status] || STATUS_BADGE.lead
                          }`}
                        >
                          {customer.status || 'lead'}
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          {customer.email && (
                            <a
                              href={`mailto:${customer.email}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Send Email"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                          {customer.phone && (
                            <a
                              href={`tel:${customer.phone}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Call"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          {canAddCustomer && (
                            <button
                              onClick={() => openEditModal(customer)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit Contact"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteCustomer && (
                            <button
                              onClick={() => handleDelete(customer)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Contact"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingId ? 'Edit Customer' : 'Add New Customer'}
                  </h3>
                  <p className="text-xs text-slate-500">Record a new lead or client profile</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Full Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={form.name}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Work Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="e.g. john@company.com"
                  value={form.email}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={form.phone}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="position" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Job Title
                  </label>
                  <input
                    id="position"
                    name="position"
                    type="text"
                    placeholder="e.g. Head of Sales"
                    value={form.position}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="organizationId" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Company / B2B Account
                </label>
                <select
                  id="organizationId"
                  name="organizationId"
                  value={form.organizationId}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">No company linked</option>
                  {organizations.map((org) => (
                    <option key={org._id} value={org._id}>
                      {org.name} {org.industry ? `(${org.industry})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="status" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Lifecycle Stage
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="source" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Lead Source
                  </label>
                  <select
                    id="source"
                    name="source"
                    value={form.source}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    {SOURCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
                >
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
