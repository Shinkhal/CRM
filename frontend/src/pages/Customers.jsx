import { useEffect, useState, useCallback } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';

const Customers = () => {
  const { accessToken } = useAuth(); // access token for API calls
  const { user } = useUser(); // user details (id, role, businessId)
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    if (!user || !accessToken) return;

    setLoading(true);
    try {
      const res = await axios.get('/customers', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setCustomers(res.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, accessToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !accessToken) return toast.error('User not authenticated');

    try {
      const formData = { ...form, userId: user.id }; // attach userId from context

      await axios.post('/customers', formData, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setForm({ name: '', email: '', phone: '' });
      toast.success('Customer added successfully!');
      fetchCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (user && accessToken) fetchCustomers();
  }, [user, accessToken, fetchCustomers]);

  const canAddCustomer = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Customer Management</h1>

        {canAddCustomer && (
          <div className="bg-white shadow-sm rounded-lg p-8 mb-10 border border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Add New Customer</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors shadow-md"
                >
                  Add Customer
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg p-8 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Customer List</h3>
            <button
              onClick={fetchCustomers}
              className="text-indigo-600 hover:text-indigo-800 flex items-center focus:outline-none"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-md">
              <p className="mt-2 text-gray-500">No customers found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Customers;
