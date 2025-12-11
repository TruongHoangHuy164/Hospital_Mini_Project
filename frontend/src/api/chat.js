// API chat: gọi các endpoint liên quan phòng chat và tin nhắn
import { privateApi } from './axios';

// Liệt kê phòng chat
// Tham số:
// - q: từ khoá tìm kiếm (tuỳ chọn)
// - page, limit: phân trang
// Trả về: danh sách phòng từ backend (res.data)
export async function listChatRooms({ q = '', page = 1, limit = 20 } = {}){
  const res = await privateApi.get('/chat/rooms', { params: { q, page, limit } });
  return res.data;
}
