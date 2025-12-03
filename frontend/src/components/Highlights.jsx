import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchNews } from '../api/news'

export default function Highlights() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchNews({ page: 1, limit: 3 })
      .then(d => {
        if (!mounted) return
        setItems(Array.isArray(d.items) ? d.items : [])
        setError('')
      })
      .catch(() => {
        if (!mounted) return
        setError('Không tải được tin tức.')
      })
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  return (
    <section className="section container">
      <div className="section__head d-flex justify-content-between align-items-center">
        <h2 className="mb-0"><i className="bi bi-newspaper"></i> Tin nổi bật</h2>
        <Link to="/news" className="text-decoration-none">Xem tất cả</Link>
      </div>
      {loading && (
        <div className="text-muted small mt-2">Đang tải tin tức…</div>
      )}
      {error && !loading && (
        <div className="text-danger small mt-2">{error}</div>
      )}
      <div className="row g-3 mt-1">
        {items.map(post => (
          <div className="col-md-4" key={post.slug}>
            <article className="card h-100" style={{ transition: 'transform .15s ease, box-shadow .15s ease' }}>
              {post.coverImage && (
                <img src={post.coverImage} alt={post.title} className="card-img-top" />
              )}
              <div className="card-body d-flex flex-column">
                <h5 className="card-title mb-2">{post.title}</h5>
                {post.publishedAt && (
                  <p className="text-muted small mb-3">{new Date(post.publishedAt).toLocaleDateString()}</p>
                )}
                <div className="mt-auto">
                  <Link to={`/news/${post.slug}`} className="btn btn-outline-primary btn-sm">Đọc bài</Link>
                </div>
              </div>
            </article>
          </div>
        ))}
        {!loading && !error && items.length === 0 && (
          <div className="col-12 text-muted small">Chưa có tin tức.</div>
        )}
      </div>
    </section>
  )
}
