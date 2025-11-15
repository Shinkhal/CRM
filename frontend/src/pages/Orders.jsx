import { useEffect, useState, useCallback } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';

const Orders = () => {
  const { accessToken } = useAuth();
  const { user } = useUser(); 
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ customerId: '', amount: '' });

  // Fetch both customers and orders
  const fetchData = useCallback(async () => {
    if (!user || !accessToken) return;

    setLoading(true);
    try {
      const [customerRes, orderRes] = await Promise.all([
        axios.get('/customers', { headers: { Authorization: `Bearer ${accessToken}` } }),
        axios.get('/orders', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      setCustomers(customerRes.data);
      setOrders(orderRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, accessToken]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !accessToken) return toast.error('User not authenticated');

    try {
      const formData = { ...form, userId: user.id }; // attach userId from context
      await axios.post('/orders', formData, { headers: { Authorization: `Bearer ${accessToken}` } });

      setForm({ customerId: '', amount: '' });
      toast.success('Order created successfully!');
      fetchData();
    } catch (err) {
      console.error('Error creating order:', err);
      toast.error('Failed to create order. Please try again.');
    }
  };

  // Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  useEffect(() => {
    if (user && accessToken) fetchData();
  }, [user, accessToken, fetchData]);

  // Only admins/managers can create orders
  const canCreateOrder = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Order Management</h1>

        {/* Create Order Form */}
        {canCreateOrder && (
          <div className="bg-white shadow-sm rounded-lg p-8 mb-10 border border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Create New Order</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="customerId" className="block text-sm font-medium text-gray-700">Select Customer</label>
                  <select
                    id="customerId"
                    name="customerId"
                    value={form.customerId}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name} ({customer.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Order Amount (₹)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      id="amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="1"
                      value={form.amount}
                      onChange={handleInputChange}
                      className="w-full pl-8 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors shadow-md"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Order List */}
        <div className="bg-white shadow-sm rounded-lg p-8 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Recent Orders</h3>
            <button onClick={fetchData} className="text-indigo-600 hover:text-indigo-800 flex items-center focus:outline-none">
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-md">
              <p className="mt-2 text-gray-500">No orders yet. Create your first order above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.customerId?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{order.customerId?.email || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(order.amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatDate(order.createdAt)}</div>
                      </td>
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

export default Orders;
