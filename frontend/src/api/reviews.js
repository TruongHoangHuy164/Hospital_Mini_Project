import { publicApi, privateApi } from './axios';

export function fetchReviews(limit = 20) {
  return publicApi.get(`/reviews?limit=${limit}`).then(r => r.data);
}

export function submitReview(payload) {
  return privateApi.post('/reviews', payload).then(r => r.data);
}

export function deleteReview(id) {
  return privateApi.delete(`/reviews/${id}`).then(r => r.data);
}

export function updateOwnReview(id, payload) {
  return privateApi.put(`/reviews/${id}`, payload).then(r => r.data);
}

export function deleteOwnReview(id) {
  return privateApi.delete(`/reviews/${id}/own`).then(r => r.data);
}
