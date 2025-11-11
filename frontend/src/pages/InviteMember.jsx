import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useUser } from '../context/UserContext';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';

const InviteMemberPage = () => {
  const { user } = useUser();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState([]);
  const [pending, setPending] = useState([]);
  const [fetchingTeam, setFetchingTeam] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      setFetchingTeam(true);
      try {
        const res = await api.get('/business/team');
        setTeam(res.data.users || []);
        setPending(res.data.pendingInvites || []);
      } catch (err) {
        console.error('Error fetching team:', err);
        toast.error('Failed to fetch team data');
      } finally {
        setFetchingTeam(false);
      }
    };
    fetchTeam();
  }, []);

  // Only admins can access this page
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
        <div className="p-8 rounded-2xl text-center max-w-md" style={{ 
          backgroundColor: 'var(--color-secondary)',
          boxShadow: 'var(--shadow-soft)',
          border: '1px solid var(--color-border-soft)'
        }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{
            backgroundColor: '#FEE2E2'
          }}>
            <svg className="w-10 h-10" style={{ color: 'var(--color-danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Access Restricted
          </h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Only administrators can invite team members to your organization.
          </p>
        </div>
      </div>
    );
  }

  const handleInvite = async (e) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/business/invite', {
        email,
        role,
        businessId: user.businessId
      });

      toast.success(res.data.message || 'Invite sent successfully!');
      setEmail('');
      setRole('viewer');
    } catch (err) {
      console.error('Error sending invite:', err);
      toast.error(err.response?.data?.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  const roleDescriptions = {
    viewer: "View-only access to data, reports, and analytics",
    manager: "Manage operations, edit data, and create detailed reports",
    admin: "Complete control including user management and system settings"
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return { bg: '#FEE2E2', text: 'var(--color-danger)', border: '#FECACA' };
      case 'manager':
        return { bg: '#DBEAFE', text: 'var(--color-accent)', border: '#BFDBFE' };
      case 'viewer':
        return { bg: '#D1FAE5', text: 'var(--color-success)', border: '#A7F3D0' };
      default:
        return { bg: 'var(--color-elevated)', text: 'var(--color-text-secondary)', border: 'var(--color-border-soft)' };
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-primary)' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header with gradient accent */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-glow) 100%)',
              boxShadow: 'var(--shadow-glow)'
            }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13.5 9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Team Management
              </h1>
            </div>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>
            Invite new members and manage your organization's team
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invite Form */}
            <div className="rounded-2xl p-8 transition-all duration-300 hover:shadow-lg" style={{ 
              backgroundColor: 'var(--color-secondary)',
              boxShadow: 'var(--shadow-soft)',
              border: '1px solid var(--color-border-soft)'
            }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                  backgroundColor: 'var(--color-elevated)'
                }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--color-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Invite New Member
                </h2>
              </div>

              <form onSubmit={handleInvite} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full px-4 py-3.5 rounded-xl transition-all duration-200"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      border: '2px solid var(--color-border-soft)',
                      color: 'var(--color-text-primary)',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border-soft)'}
                    placeholder="member@company.com"
                  />
                  <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    We'll send an invitation link to this email address
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Role & Permissions
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full px-4 py-3.5 rounded-xl transition-all duration-200"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      border: '2px solid var(--color-border-soft)',
                      color: 'var(--color-text-primary)',
                      outline: 'none'
                    }}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <div className="mt-3 p-4 rounded-xl" style={{
                    backgroundColor: 'var(--color-elevated)',
                    border: '1px solid var(--color-border-soft)'
                  }}>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {roleDescriptions[role]}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-semibold text-white transition-all duration-200"
                  style={{
                    background: loading ? 'var(--color-text-secondary)' : 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-glow) 100%)',
                    boxShadow: loading ? 'none' : 'var(--shadow-glow)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Invitation
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Team Members Table */}
            <div className="rounded-2xl overflow-hidden" style={{ 
              backgroundColor: 'var(--color-secondary)',
              boxShadow: 'var(--shadow-soft)',
              border: '1px solid var(--color-border-soft)'
            }}>
              <div className="px-8 py-6" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                    backgroundColor: 'var(--color-elevated)'
                  }}>
                    <svg className="w-5 h-5" style={{ color: 'var(--color-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      Team Members
                    </h2>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      Active members in your organization
                    </p>
                  </div>
                </div>
              </div>
              
              {fetchingTeam ? (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center">
                    <svg className="animate-spin h-8 w-8" style={{ color: 'var(--color-accent)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="mt-4 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    Loading team members...
                  </p>
                </div>
              ) : team.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{
                    backgroundColor: 'var(--color-elevated)'
                  }}>
                    <svg className="w-8 h-8" style={{ color: 'var(--color-text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <p className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    No team members yet
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Invite your first team member to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead style={{ backgroundColor: 'var(--color-primary)' }}>
                      <tr>
                        <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                          Member
                        </th>
                        <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                          Role
                        </th>
                        <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((member, index) => {
                        const userData = member.user && member.user.length > 0 ? member.user[0] : null;
                        const colors = getRoleBadgeColor(member.role);
                        
                        return (
                          <tr 
                            key={member._id} 
                            className="transition-all duration-200"
                            style={{ borderTop: index > 0 ? '1px solid var(--color-border-soft)' : 'none' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-elevated)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white" style={{
                                  background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-glow) 100%)'
                                }}>
                                  {userData?.name ? userData.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div>
                                  <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                    {userData?.name || 'Unknown User'}
                                  </div>
                                  <div className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    {userData?.email || 'No email available'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className="inline-flex px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wide" style={{
                                backgroundColor: colors.bg,
                                color: colors.text,
                                border: `1px solid ${colors.border}`
                              }}>
                                {member.role}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }}></div>
                                <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
                                  Active
                                </span>
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

            {/* Pending Invites */}
            {pending.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ 
                backgroundColor: 'var(--color-secondary)',
                boxShadow: 'var(--shadow-soft)',
                border: '1px solid var(--color-border-soft)'
              }}>
                <div className="px-8 py-6" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                      backgroundColor: '#FEF3C7'
                    }}>
                      <svg className="w-5 h-5" style={{ color: 'var(--color-warn)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        Pending Invitations
                      </h2>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        Awaiting acceptance from invited members
                      </p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead style={{ backgroundColor: 'var(--color-primary)' }}>
                      <tr>
                        <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                          Email
                        </th>
                        <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                          Role
                        </th>
                        <th className="px-8 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((invite, index) => {
                        const colors = getRoleBadgeColor(invite.role);
                        return (
                          <tr 
                            key={invite.email || index}
                            className="transition-all duration-200"
                            style={{ borderTop: index > 0 ? '1px solid var(--color-border-soft)' : 'none' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-elevated)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{
                                  backgroundColor: '#FEF3C7',
                                  border: '2px solid #FDE68A'
                                }}>
                                  <svg className="w-6 h-6" style={{ color: 'var(--color-warn)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                    {invite.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className="inline-flex px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wide" style={{
                                backgroundColor: colors.bg,
                                color: colors.text,
                                border: `1px solid ${colors.border}`
                              }}>
                                {invite.role}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-warn)' }}></div>
                                <span className="text-sm font-medium" style={{ color: 'var(--color-warn)' }}>
                                  Pending
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Permissions</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-green-400 pl-4">
                  <h4 className="font-medium text-gray-900">Viewer</h4>
                  <p className="text-sm text-gray-600 mt-1">Read-only access to data and reports</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <h4 className="font-medium text-gray-900">Manager</h4>
                  <p className="text-sm text-gray-600 mt-1">Can edit data and manage operations</p>
                </div>
                <div className="border-l-4 border-red-400 pl-4">
                  <h4 className="font-medium text-gray-900">Administrator</h4>
                  <p className="text-sm text-gray-600 mt-1">Full access including user management</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Need Help?</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Invited members will receive an email with instructions to join your organization.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
export default InviteMemberPage;