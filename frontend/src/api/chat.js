import { privateApi } from './axios';

export async function listChatRooms({ q = '', page = 1, limit = 20 } = {}){
  const res = await privateApi.get('/chat/rooms', { params: { q, page, limit } });
  return res.data;
}
