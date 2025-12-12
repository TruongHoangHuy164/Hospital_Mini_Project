/**
 * FILE: axios.js
 * MÔ TẢ: Cấu hình axios instance cho API calls
 * - publicApi: Cho các request không cần xác thực
 * - privateApi: Cho các request cần xác thực (tự động thêm Bearer token)
 */

import axios from 'axios';

// URL của API backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Axios instance cho public API (không cần token)
const publicApi = axios.create({
  baseURL: API_URL + '/api',
});

// Axios instance cho private API (cần token)
const privateApi = axios.create({
  baseURL: API_URL + '/api',
});

// Interceptor: Tự động thêm token vào header của mọi request
privateApi.interceptors.request.use((config) => {
  // Đọc token từ localStorage (hỗ trợ nhiều key khác nhau)
  const token = localStorage.getItem('accessToken')
    || localStorage.getItem('token')
    || localStorage.getItem('jwt');
  console.log('API Request:', config.method?.toUpperCase(), config.url);
  console.log('API Base URL:', config.baseURL);
  console.log('Token present:', !!token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: Log response và error
privateApi.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export { publicApi, privateApi };
