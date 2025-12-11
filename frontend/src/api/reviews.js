import { publicApi, privateApi } from './axios';

// Lấy danh sách đánh giá (public)
export function fetchReviews(limit = 20) {
  return publicApi.get(`/reviews?limit=${limit}`).then(r => r.data);
}

// Gửi đánh giá (cần đăng nhập)
export function submitReview(payload) {
  return privateApi.post('/reviews', payload).then(r => r.data);
}

// Quản trị: xoá đánh giá theo id
export function deleteReview(id) {
  return privateApi.delete(`/reviews/${id}`).then(r => r.data);
}

// Người dùng: cập nhật đánh giá của chính mình
export function updateOwnReview(id, payload) {
  return privateApi.put(`/reviews/${id}`, payload).then(r => r.data);
}

// Người dùng: xoá đánh giá của chính mình
export function deleteOwnReview(id) {
  return privateApi.delete(`/reviews/${id}/own`).then(r => r.data);
}
