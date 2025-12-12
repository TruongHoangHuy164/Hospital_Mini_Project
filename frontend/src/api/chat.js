/**
 * FILE: chat.js
 * MÔ TẢ: API calls cho chức năng chat/nhắn tin
 */

import { privateApi } from './axios';

/**
 * Lấy danh sách phòng chat
 * @param {Object} params - Tham số truy vấn
 * @param {string} params.q - Từ khóa tìm kiếm (mặc định rỗng)
 * @param {number} params.page - Trang hiện tại (mặc định 1)
 * @param {number} params.limit - Số lượng kết quả mỗi trang (mặc định 20)
 * @returns {Promise<Object>} Danh sách phòng chat và thông tin phân trang
 */
export async function listChatRooms({ q = '', page = 1, limit = 20 } = {}){
  const res = await privateApi.get('/chat/rooms', { params: { q, page, limit } });
  return res.data;
}
