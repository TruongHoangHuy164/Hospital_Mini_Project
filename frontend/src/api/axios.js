// Cấu hình axios cho gọi API (public/private)
import axios from 'axios';

// URL API từ biến môi trường VITE; fallback localhost khi phát triển
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Client công khai: không đính kèm token
const publicApi = axios.create({
  baseURL: API_URL + '/api',
});

// Client riêng: tự động đính kèm Bearer token
const privateApi = axios.create({
  baseURL: API_URL + '/api',
});

// Interceptor request: chèn Authorization từ localStorage nếu có
privateApi.interceptors.request.use((config) => {
  // Đọc token từ các key phổ biến để tránh lệch luồng
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

// Interceptor response: log ngắn gọn & propagate lỗi
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
