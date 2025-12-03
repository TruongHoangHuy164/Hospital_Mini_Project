import React, { useEffect, useState } from 'react';
import { fetchReviews, submitReview } from '../../api/reviews';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../../components/StarRating';
import { updateOwnReview, deleteOwnReview } from '../../api/reviews';

export default function ReviewsPage() {
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('');
  const [editingId, setEditingId] = useState(null);

  const load = () => fetchReviews(20).then(d => setItems(d.items || []));
  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    if (!isAuthenticated) { setStatus('Vui lòng đăng nhập để đánh giá.'); return; }
    try {
      if (editingId) {
        await updateOwnReview(editingId, { rating, comment });
      } else {
        await submitReview({ rating, comment });
      }
      setComment('');
      setRating(5);
      setEditingId(null);
      setStatus('Đã gửi đánh giá, cảm ơn bạn!');
      load();
    } catch (err) {
      setStatus('Gửi đánh giá thất bại.');
    }
  };

  const onEdit = (r) => {
    setEditingId(r._id);
    setRating(r.rating);
    setComment(r.comment || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDeleteOwn = async (id) => {
    if (!confirm('Xóa đánh giá của bạn?')) return;
    try {
      await deleteOwnReview(id);
      load();
    } catch {
      setStatus('Xóa đánh giá thất bại.');
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3"><i className="bi bi-star"></i> Đánh giá bệnh viện</h2>
      <div className="row">
        <div className="col-md-6">
          <form onSubmit={onSubmit} className="card p-3 mb-3">
            <label className="form-label">Chọn số sao</label>
            <div className="mb-2">
              <StarRating value={rating} onChange={setRating} size={28} />
            </div>
            <label className="form-label">Nhận xét</label>
            <textarea className="form-control mb-3" rows={3} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Chia sẻ trải nghiệm của bạn" />
            <button className="btn btn-primary" type="submit">Gửi đánh giá</button>
            {status && <p className="mt-2 text-muted">{status}</p>}
          </form>
        </div>
        <div className="col-md-6">
          <div className="list-group">
            {items.map(r => (
              <div className="list-group-item review-item" key={r._id}>
                <div className="d-flex justify-content-between">
                  <strong><StarRating value={r.rating} readOnly size={18} /></strong>
                  <span className="text-muted small">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <div className="small text-muted">{r.user?.name}</div>
                {r.comment && <p className="mb-0">{r.comment}</p>}
                {isAuthenticated && (r.user?._id === user?.id || r.user?._id === user?._id) && (
                  <div className="mt-2 d-flex gap-2">
                    <button className="btn btn-outline-secondary btn-sm" onClick={()=>onEdit(r)}>
                      <i className="bi bi-pencil"></i> Sửa
                    </button>
                    <button className="btn btn-outline-danger btn-sm" onClick={()=>onDeleteOwn(r._id)}>
                      <i className="bi bi-trash"></i> Xóa
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
