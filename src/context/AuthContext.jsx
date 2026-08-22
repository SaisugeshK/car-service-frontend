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
      userId: data?.userId,
      username: data?.username,
      email: data?.email ?? credentials.email,
      roleId: data?.roleId,
      role: data?.roleName ?? null, // null = no role assigned yet, treated as least-privilege
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
    // Best-effort, fire-and-forget: revokes the refresh token server-side (Phase 33/34) so it
    // can't be replayed after logout. The user is logged out either way — this never blocks or
    // fails the local logout, it just also closes the door on the backend when it can.
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) authService.logout(refreshToken).catch(() => {});

    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Logged out');
  };

  // SUPER_ADMIN = full access. A user with no role assigned yet (null) gets treated as
  // MANAGER-level — least privilege, not a crash — until a SUPER_ADMIN assigns one via Users.
  const role = user?.role || (user ? 'MANAGER' : null);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const value = useMemo(
    () => ({ user, role, isSuperAdmin, isAuthenticated, initializing, login, logout }),
    [user, role, isSuperAdmin, isAuthenticated, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default AuthContext;
