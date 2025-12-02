import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchNews } from '../../api/news';

export default function NewsIndex() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tag, setTag] = useState('');
  const limit = 9;

  useEffect(() => {
    fetchNews({ page, limit, tag: tag || undefined }).then(d => {
      setItems(d.items || []);
      setTotal(d.total || 0);
    });
  }, [page, tag]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="container py-4">
      <h2 className="mb-3"><i className="bi bi-newspaper"></i> Tin tức</h2>
      <div className="d-flex gap-2 align-items-center mb-3">
        <input className="form-control" placeholder="Lọc theo thẻ (ví dụ: khuyen-mai)" value={tag} onChange={e=>setTag(e.target.value)} />
      </div>
      <div className="row g-3">
        {items.map(post => (
          <div className="col-md-4" key={post.slug}>
            <div className="card h-100" style={{ transition: 'transform .15s ease, box-shadow .15s ease' }}>
              {post.coverImage && <img src={post.coverImage} className="card-img-top" alt={post.title} />}
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{post.title}</h5>
                <p className="text-muted small mb-2">{new Date(post.publishedAt).toLocaleDateString()}</p>
                <div className="mt-auto">
                  <Link to={`/news/${post.slug}`} className="btn btn-outline-primary btn-sm">Đọc bài</Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="d-flex justify-content-center align-items-center gap-2 mt-4">
        <button className="btn btn-secondary btn-sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Trang trước</button>
        <span>Trang {page} / {totalPages}</span>
        <button className="btn btn-secondary btn-sm" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Trang sau</button>
      </div>
    </div>
  );
}
