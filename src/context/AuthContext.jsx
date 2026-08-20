import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { tokenStorage } from '../api/axios';

const AuthContext = createContext(null);

const USER_KEY = 'erp_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!tokenStorage.getAccessToken()
  );
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // On first load, trust whatever token/user is already in storage.
    setInitializing(false);
  }, []);

  const login = async (credentials) => {
    const data = await authService.login(credentials);

    // Backend is expected to respond with at least a token; support a few
    // common shapes so this keeps working regardless of exact field names.
    const accessToken = data?.token || data?.accessToken || data?.jwt;
    const refreshToken = data?.refreshToken;
    const loggedInUser = data?.user || {
      username: data?.username,
      email: data?.email ?? credentials.email,
      roleId: data?.roleId,
    };

    if (!accessToken) {
      throw new Error('Login response did not include an access token.');
    }

    tokenStorage.setTokens({ accessToken, refreshToken });
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));

    setUser(loggedInUser);
    setIsAuthenticated(true);
    toast.success('Logged in successfully');
    return loggedInUser;
  };

  const logout = () => {
    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Logged out');
  };

  const value = useMemo(
    () => ({ user, isAuthenticated, initializing, login, logout }),
    [user, isAuthenticated, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default AuthContext;
