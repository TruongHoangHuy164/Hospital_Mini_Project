import { publicApi, privateApi } from './axios';

// Danh sách bài viết tin tức (public)
// Tham số: page, limit, tag (tuỳ chọn)
export function fetchNews({ page = 1, limit = 10, tag }) {
  const params = new URLSearchParams({ page, limit });
  if (tag) params.set('tag', tag);
  return publicApi.get(`/news?${params.toString()}`).then(r => r.data);
}

// Lấy chi tiết bài viết theo slug (public)
export function fetchPost(slug) {
  return publicApi.get(`/news/${slug}`).then(r => r.data);
}

// Quản trị: liệt kê bài viết
export function adminListPosts() {
  return privateApi.get('/admin/news').then(r => r.data);
}

// Quản trị: tạo bài viết mới
export function adminCreatePost(payload) {
  return privateApi.post('/admin/news', payload).then(r => r.data);
}

// Quản trị: cập nhật bài viết
export function adminUpdatePost(id, payload) {
  return privateApi.put(`/admin/news/${id}`, payload).then(r => r.data);
}

// Quản trị: xoá bài viết
export function adminDeletePost(id) {
  return privateApi.delete(`/admin/news/${id}`).then(r => r.data);
}
