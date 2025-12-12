/**
 * FILE: users.js
 * MÔ TẢ: API calls cho quản lý người dùng (dành cho admin)
 */

import { privateApi } from './axios';

/**
 * Lấy danh sách người dùng theo vai trò (chỉ admin được phép)
 * @param {Object} params - Tham số lọc
 * @param {string} params.role - Vai trò cần lọc (patient, doctor, nurse, v.v.)
 * @param {number} params.limit - Số lượng kết quả tối đa (mặc định 200)
 * @returns {Promise<Array>} Danh sách người dùng
 */
export async function fetchUsers({ role, limit = 200 }) {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  params.append('limit', limit);
  const { data } = await privateApi.get(`/users?${params.toString()}`);
  return data.items || [];
}
