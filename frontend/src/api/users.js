import { privateApi } from './axios';

// Fetch users filtered by role (admin-only endpoint on backend)
export async function fetchUsers({ role, limit = 200 }) {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  params.append('limit', limit);
  const { data } = await privateApi.get(`/users?${params.toString()}`);
  return data.items || [];
}
