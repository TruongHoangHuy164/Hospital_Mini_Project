/**
 * FILE: AuthContext.jsx
 * MÔ TẢ: Context quản lý trạng thái xác thực người dùng toàn ứng dụng
 * Cung cấp: user, loading, isAuthenticated, signIn, signUp, signOut
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getProfile } from '../api/auth';

// Tạo context cho xác thực
const AuthContext = createContext(null);

/**
 * Provider component cung cấp context xác thực cho toàn bộ app
 * @param {ReactNode} children - Các component con
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Thông tin user hiện tại
  const [loading, setLoading] = useState(true); // Trạng thái đang tải thông tin user

  // Khi component mount, tự động lấy thông tin user từ token (nếu có)
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const profile = await getProfile();
        if (!mounted) return;
        setUser(profile.user);
      } catch {
        // Chưa đăng nhập hoặc token không hợp lệ
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  /**
   * Đăng nhập
   * @param {string} email - Email hoặc số điện thoại
   * @param {string} password - Mật khẩu
   * @returns {Promise<Object>} Thông tin user sau khi đăng nhập
   */
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

  /**
   * Đăng ký tài khoản mới
   * @param {string} name - Họ tên
   * @param {string} email - Email
   * @param {string} phone - Số điện thoại
   * @param {string} password - Mật khẩu
   * @returns {Promise<Object>} Thông tin user sau khi đăng ký
   */
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

  /**
   * Đăng xuất
   */
  const signOut = async () => {
    try { await apiLogout(); } catch {}
    setUser(null);
  };

  const value = { user, loading, isAuthenticated: !!user, signIn, signUp, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook để sử dụng AuthContext trong các component
 * @returns {Object} Context chứa user, loading, isAuthenticated, signIn, signUp, signOut
 * @throws {Error} Nếu sử dụng ngoài AuthProvider
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
