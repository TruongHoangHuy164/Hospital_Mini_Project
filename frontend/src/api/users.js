import { privateApi } from './axios';

// Lấy danh sách người dùng theo vai trò (endpoint chỉ dành cho admin)
export async function fetchUsers({ role, limit = 200 }) {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  params.append('limit', limit);
  const { data } = await privateApi.get(`/users?${params.toString()}`);
  return data.items || [];
}
