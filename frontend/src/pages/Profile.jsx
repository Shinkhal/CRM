import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/userContext.js';
import { useAuth } from '../context/authContext.js';
import { authClient } from '../api/axios';
import { toast } from 'react-toastify';
import {
  User,
  Mail,
  Shield,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  Edit2,
  Save,
  X,
  Layers,
  ExternalLink,
  LogOut,
  Sparkles,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Avatar,
} from '../components/ui';

const Profile = () => {
  const { user, setUser, enabledModules } = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [businessData, setBusinessData] = useState(null);

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const res = await authClient.get('/auth/me');
        if (res.data?.user) {
          setProfileData(res.data.user);
          setNewName(res.data.user.name || '');
        }
        if (res.data?.business) {
          setBusinessData(res.data.business);
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
        toast.error('Failed to load latest profile information');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.warning('Name cannot be empty');
      return;
    }

    try {
      setSavingName(true);
      const res = await authClient.put('/auth/profile', { name: newName.trim() });
      toast.success(res.data?.message || 'Profile updated successfully');
      setProfileData((prev) => ({ ...prev, name: newName.trim() }));
      setUser((prev) => (prev ? { ...prev, name: newName.trim() } : prev));
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error(err.response?.data?.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      toast.error('Failed to sign out');
    }
  };

  const currentUser = profileData || user || {};
  const currentBusiness = businessData || {};

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Active Member';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Active Member';
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Active now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Active now';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 py-16">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading profile & workspace credentials...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <User className="w-7 h-7 text-blue-600" />
            <span>Profile & Account</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your personal profile, credentials, and workspace settings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/home">
            <Button variant="outline" size="sm">
              Back to Dashboard
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar name={currentUser.name || currentUser.email} size="xl" status="online" />

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {currentUser.name || 'Workspace Member'}
                </h2>
                <Badge variant="purple" className="capitalize">
                  {currentUser.role || 'Member'}
                </Badge>
                <Badge variant="success" dot={true}>
                  Active
                </Badge>
              </div>

              <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{currentUser.email || 'user@example.com'}</span>
              </p>

              {currentBusiness.name && (
                <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Workspace:</span>
                  <span className="font-semibold text-white">{currentBusiness.name}</span>
                  {currentBusiness.industry && (
                    <span className="text-slate-400">({currentBusiness.industry})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex sm:flex-col justify-start sm:items-end gap-3 sm:gap-1.5 pt-4 md:pt-0 border-t md:border-t-0 border-white/10 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Member Since:</span>
              <span className="font-semibold text-white">{formatDate(currentUser.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Login:</span>
              <span className="font-semibold text-white">{formatDateTime(currentUser.lastLoginAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Personal & Organization */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Personal Details</span>
                </CardTitle>
                <CardDescription>
                  Update your display name and view account email.
                </CardDescription>
              </div>
              {!isEditingName && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingName(true)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Name</span>
                </Button>
              )}
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                {isEditingName ? (
                  <form onSubmit={handleUpdateName} className="flex items-center gap-2 max-w-md">
                    <Input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      placeholder="Your full name"
                      autoFocus
                    />
                    <Button type="submit" variant="primary" size="md" loading={savingName}>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditingName(false);
                        setNewName(currentUser.name || '');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 max-w-md">
                    <span className="text-sm font-semibold text-slate-800">
                      {currentUser.name || 'Not provided'}
                    </span>
                    <Badge variant="outline">Verified Name</Badge>
                  </div>
                )}
              </div>

              {/* Work Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Work Email Address
                </label>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 max-w-md">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{currentUser.email}</span>
                  </div>
                  <Badge variant="success" dot={true}>
                    Verified
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Primary corporate email used for login and notifications.
                </p>
              </div>

              {/* Account Status Details */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Account Standing
                  </span>
                  <div className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>In Good Standing</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Access Level
                  </span>
                  <div className="text-sm font-bold text-blue-700 mt-1 capitalize flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>{currentUser.role || 'Member'} Privileges</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization & Workspace Profile Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Organization & Workspace</span>
                </CardTitle>
                <CardDescription>
                  Your current business profile and currency ledger configuration.
                </CardDescription>
              </div>
              {(currentUser.role === 'admin' || currentUser.role === 'superadmin') && (
                <Link to="/team">
                  <Button variant="outline" size="sm">
                    <span>Manage Team</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              )}
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Company Name
                  </span>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {currentBusiness.name || 'Primary Workspace'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Industry: {currentBusiness.industry || 'General Business'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ledger Currency
                  </span>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {currentBusiness.settings?.currency || 'INR (₹)'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Standard billing currency for orders & deals
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Enterprise Data Privacy Guarantee
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Your organization's client records, deals, and marketing campaigns are strictly private and accessible only by authorized team members.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Security, Roles & Modules */}
        <div className="space-y-6">
          {/* Security & Authentication Details */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Account Security</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  Credentials Status
                </span>
                <Badge variant="outline">Encrypted & Secure</Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Access Protocol
                </span>
                <Badge variant="outline">OAuth & Token Auth</Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Current Session
                </span>
                <Badge variant="success" dot={true}>
                  Active & Verified
                </Badge>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500 space-y-1">
                <div className="font-semibold text-slate-700">Data Protection Enabled</div>
                <p className="text-[11px] leading-relaxed">
                  Your workspace sessions and stored credentials are protected by enterprise encryption and automatic token rotation.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Role & Permissions Info */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Role Permissions</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-blue-900 capitalize text-sm">
                    {currentUser.role || 'Member'} Access
                  </span>
                  <Badge variant="primary">Level 1</Badge>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {currentUser.role === 'admin' || currentUser.role === 'superadmin'
                    ? 'Full governance access: Manage team members, toggle App Store plugins, edit organization metadata, review full pipeline logs, and export intelligence reports.'
                    : currentUser.role === 'manager'
                    ? 'Operational access: Create customers, manage deals in the sales pipeline, trigger marketing campaigns, and assign tasks to teammates.'
                    : 'Standard read-only access: View customer directories, pipeline analytics, and active marketing campaign progress.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Active Enterprise Modules Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-600" />
                <span>Installed Modules</span>
              </CardTitle>
              <Link
                to="/store"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>App Store</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-1.5">
                {(enabledModules || []).map((mod) => (
                  <Badge key={mod} variant="default" className="capitalize">
                    {mod.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
