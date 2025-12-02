import { publicApi, privateApi } from './axios';

export function fetchNews({ page = 1, limit = 10, tag }) {
  const params = new URLSearchParams({ page, limit });
  if (tag) params.set('tag', tag);
  return publicApi.get(`/news?${params.toString()}`).then(r => r.data);
}

export function fetchPost(slug) {
  return publicApi.get(`/news/${slug}`).then(r => r.data);
}

export function adminListPosts() {
  return privateApi.get('/admin/news').then(r => r.data);
}

export function adminCreatePost(payload) {
  return privateApi.post('/admin/news', payload).then(r => r.data);
}

export function adminUpdatePost(id, payload) {
  return privateApi.put(`/admin/news/${id}`, payload).then(r => r.data);
}

export function adminDeletePost(id) {
  return privateApi.delete(`/admin/news/${id}`).then(r => r.data);
}
