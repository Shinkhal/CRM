import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from "jwt-decode";
import { useAuth } from './AuthContext';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { accessToken } = useAuth();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (accessToken) {
      try {
        const decoded = jwtDecode(accessToken);
        setUser(decoded); // decoded contains id, email, name, role, businessId
      } catch (err) {
        console.error('Failed to decode token:', err);
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [accessToken]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
