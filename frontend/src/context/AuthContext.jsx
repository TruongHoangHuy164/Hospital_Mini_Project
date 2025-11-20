import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getProfile } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const profile = await getProfile();
        if (!mounted) return;
        setUser(profile.user);
      } catch {
        // not logged in or token invalid
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  const signIn = async (email, password) => {
    try {
      const u = await apiLogin(email, password);
      setUser(u);
      return u;
    } catch (error) {
      console.error('AuthContext: Sign in failed:', error);
      throw error;
    }
  };

  const signUp = async (name, email, phone, password) => {
    try {
      const u = await apiRegister(name, email, phone, password);
      setUser(u);
      return u;
    } catch (error) {
      console.error('AuthContext: Sign up failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try { await apiLogout(); } catch {}
    setUser(null);
  };

  const value = { user, loading, isAuthenticated: !!user, signIn, signUp, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
