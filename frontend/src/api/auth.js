/**
 * FILE: auth.js
 * MÔ TẢ: Module xử lý xác thực người dùng (đăng ký, đăng nhập, đăng xuất)
 * Tự động làm mới token khi hết hạn
 */

// URL của API backend, lấy từ biến môi trường hoặc mặc định localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Lấy access token và refresh token từ localStorage
 * @returns {Object} Object chứa accessToken và refreshToken
 */
function getTokens() {
  return {
    accessToken: localStorage.getItem('accessToken') || '',
    refreshToken: localStorage.getItem('refreshToken') || '',
  };
}

/**
 * Lưu access token và refresh token vào localStorage
 * @param {Object} tokens - Object chứa accessToken và refreshToken
 */
function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

/**
 * Xóa tất cả token khỏi localStorage (khi đăng xuất)
 */
function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

/**
 * Hàm gửi request đến API với tự động làm mới token
 * @param {string} path - Đường dẫn API endpoint
 * @param {Object} options - Các tùy chọn cho fetch request
 * @returns {Promise<Response>} Response từ server
 */
async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  console.log('Auth API Request:', url);
  
  try {
    const tokens = getTokens();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (tokens.accessToken) headers['Authorization'] = `Bearer ${tokens.accessToken}`;

    let res = await fetch(url, { ...options, headers });
    
    // Nếu token hết hạn (401), tự động làm mới token và thử lại
    if (res.status === 401 && tokens.refreshToken && path !== '/api/auth/refresh') {
      console.log('Auth: Attempting token refresh...');
      // Gọi API refresh token
      const r = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (r.ok) {
        const data = await r.json();
        setTokens(data);
        // Thử lại request ban đầu với token mới
        const retryHeaders = { ...headers, Authorization: `Bearer ${data.accessToken}` };
        res = await fetch(url, { ...options, headers: retryHeaders });
      } else {
        console.log('Auth: Token refresh failed, clearing tokens');
        clearTokens();
      }
    }
    
    console.log('Auth API Response:', res.status, res.statusText);
    return res;
  } catch (error) {
    console.error('Auth API Network Error:', error);
    throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và đảm bảo server đang chạy.');
  }
}

/**
 * Đăng ký tài khoản mới
 * @param {string} name - Họ tên người dùng
 * @param {string} email - Email (tùy chọn)
 * @param {string} phone - Số điện thoại (tùy chọn)
 * @param {string} password - Mật khẩu
 * @returns {Promise<Object>} Thông tin user sau khi đăng ký thành công
 */
export async function register(name, email, phone, password) {
  try {
    console.log('Auth: Attempting registration for', email || phone);
    const payload = { name, password };
    if (email) payload.email = email;
    if (phone) payload.phone = phone;

    const res = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Auth: Registration failed:', errorData);
      throw errorData;
    }

    const data = await res.json();
    setTokens(data); // Lưu token sau khi đăng ký thành công
    console.log('Auth: Registration successful');
    return data.user;
  } catch (error) {
    console.error('Auth: Registration error:', error);
    if (error.message && error.message.includes('kết nối')) {
      throw error;
    }
    throw error;
  }
}

/**
 * Đăng nhập vào hệ thống
 * @param {string} email - Email hoặc số điện thoại
 * @param {string} password - Mật khẩu
 * @returns {Promise<Object>} Thông tin user sau khi đăng nhập thành công
 */
export async function login(email, password) {
  try {
    console.log('Auth: Attempting login for', email);
    const payload = { password };
    if (email && email.includes('@')) payload.email = email;
    else payload.identifier = email; // Có thể là số điện thoại
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      console.error('Auth: Login failed:', errorData);
      throw errorData;
    }
    
    const data = await res.json();
    setTokens(data); // Lưu token sau khi đăng nhập thành công
    console.log('Auth: Login successful');
    return data.user;
  } catch (error) {
    console.error('Auth: Login error:', error);
    if (error.message && error.message.includes('kết nối')) {
      throw error;
    }
    throw error;
  }
}

/**
 * Đăng xuất khỏi hệ thống
 * Gửi refresh token đến server để vô hiệu hóa và xóa token khỏi localStorage
 */
export async function logout() {
  const { refreshToken } = getTokens();
  if (refreshToken) {
    await request('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }
  clearTokens(); // Xóa token khỏi trình duyệt
}

/**
 * Lấy thông tin profile của user hiện tại
 * @returns {Promise<Object>} Thông tin profile của user
 */
export async function getProfile() {
  const res = await request('/api/profile');
  if (!res.ok) throw await res.json();
  return res.json();
}

/**
 * Kiểm tra xem user đã đăng nhập chưa
 * @returns {boolean} true nếu đã có access token
 */
export function isAuthenticated() {
  return !!localStorage.getItem('accessToken');
}
