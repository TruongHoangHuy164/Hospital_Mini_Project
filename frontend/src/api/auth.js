const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getTokens() {
  return {
    accessToken: localStorage.getItem('accessToken') || '',
    refreshToken: localStorage.getItem('refreshToken') || '',
  };
}

function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  console.log('Auth API Request:', url);
  
  try {
    const tokens = getTokens();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (tokens.accessToken) headers['Authorization'] = `Bearer ${tokens.accessToken}`;

    let res = await fetch(url, { ...options, headers });
    
    if (res.status === 401 && tokens.refreshToken && path !== '/api/auth/refresh') {
      console.log('Auth: Attempting token refresh...');
      // try refresh
      const r = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (r.ok) {
        const data = await r.json();
        setTokens(data);
        // retry original
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
    setTokens(data);
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

export async function login(email, password) {
  try {
    console.log('Auth: Attempting login for', email);
    const payload = { password };
    if (email && email.includes('@')) payload.email = email;
    else payload.identifier = email;
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
    setTokens(data);
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

export async function logout() {
  const { refreshToken } = getTokens();
  if (refreshToken) {
    await request('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }
  clearTokens();
}

export async function getProfile() {
  const res = await request('/api/profile');
  if (!res.ok) throw await res.json();
  return res.json();
}

export function isAuthenticated() {
  return !!localStorage.getItem('accessToken');
}
