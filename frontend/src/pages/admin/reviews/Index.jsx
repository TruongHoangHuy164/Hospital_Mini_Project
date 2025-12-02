import React, { useEffect, useState } from 'react';
import { fetchReviews, deleteReview } from '../../../api/reviews';
import StarRating from '../../../components/StarRating';

export default function AdminReviews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { const d = await fetchReviews(200); setItems(d.items || []); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id) => {
    if (!confirm('Xóa đánh giá này?')) return;
    await deleteReview(id);
    load();
  };

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0"><i className="bi bi-star"></i> Đánh giá của người dùng</h3>
        <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
          <i className="bi bi-arrow-clockwise"></i> Tải lại
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading && <div className="text-muted small mb-2">Đang tải...</div>}
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Đánh giá</th>
                  <th>Nhận xét</th>
                  <th>Thời gian</th>
                  <th className="text-end">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r._id}>
                    <td>{r.user?.name || r.user?.email}</td>
                    <td><StarRating value={r.rating} readOnly size={16} /></td>
                    <td style={{maxWidth: '520px'}}>{r.comment}</td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="text-end">
                      <button className="btn btn-outline-danger btn-sm" onClick={()=>onDelete(r._id)}>
                        <i className="bi bi-trash"></i> Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
