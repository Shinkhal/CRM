import { useEffect, useState, useCallback } from 'react';
import { jwtDecode } from "jwt-decode";
import { useAuth } from './authContext.js';
import axios from '../api/axios';

import { UserContext } from './userContext.js';

const DEFAULT_MODULE_IDS = [
  'sales_pipeline',
  'organizations',
  'campaigns',
  'orders',
  'ai_insights',
  'tasks',
];

export const UserProvider = ({ children }) => {
  const { accessToken } = useAuth();
  const [user, setUser] = useState(null);
  const [enabledModules, setEnabledModules] = useState(DEFAULT_MODULE_IDS);
  const [modulesCatalog, setModulesCatalog] = useState([]);
  const [businessSettings, setBusinessSettings] = useState({ currency: 'INR' });
  const [modulesLoading, setModulesLoading] = useState(false);

  // Fetch enabled modules for current business
  const fetchModules = useCallback(async () => {
    if (!accessToken) return;
    setModulesLoading(true);
    try {
      const res = await axios.get('/business/modules');
      if (res.data?.enabledModules) {
        setEnabledModules(res.data.enabledModules);
      }
      if (res.data?.modules) {
        setModulesCatalog(res.data.modules);
      }
      if (res.data?.settings) {
        setBusinessSettings(res.data.settings);
      }
    } catch (err) {
      console.warn('Using default module configuration:', err);
      setEnabledModules(DEFAULT_MODULE_IDS);
    } finally {
      setModulesLoading(false);
    }
  }, [accessToken]);

  // Decode JWT user token
  useEffect(() => {
    if (accessToken) {
      try {
        const decoded = jwtDecode(accessToken);
        setUser(decoded); // contains id, email, name, role, businessId
      } catch (err) {
        console.error('Failed to decode token:', err);
        setUser(null);
      }
    } else {
      setUser(null);
      setEnabledModules(DEFAULT_MODULE_IDS);
      setModulesCatalog([]);
    }
  }, [accessToken]);

  // Fetch modules whenever user/business is authenticated
  useEffect(() => {
    if (user?.businessId && accessToken) {
      fetchModules();
    }
  }, [user?.businessId, accessToken, fetchModules]);

  // Check if a specific module is enabled
  const isModuleEnabled = useCallback(
    (moduleId) => {
      return enabledModules.includes(moduleId);
    },
    [enabledModules]
  );

  // Toggle module on/off
  const toggleModule = useCallback(
    async (moduleId, enabled) => {
      try {
        const res = await axios.post('/business/modules/toggle', { moduleId, enabled });
        if (res.data?.enabledModules) {
          setEnabledModules(res.data.enabledModules);
        }
        if (res.data?.modules) {
          setModulesCatalog(res.data.modules);
        }
        return { success: true, message: res.data?.message };
      } catch (err) {
        console.error('Failed to toggle module:', err);
        const errMsg = err.response?.data?.message || 'Failed to update module';
        return { success: false, error: errMsg };
      }
    },
    []
  );

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        enabledModules,
        modulesCatalog,
        businessSettings,
        modulesLoading,
        isModuleEnabled,
        toggleModule,
        refreshModules: fetchModules,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
