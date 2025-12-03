import React, { useEffect, useState } from 'react';
import { adminListPosts, adminCreatePost, adminUpdatePost, adminDeletePost } from '../../../api/news';
import { privateApi } from '../../../api/axios';

export default function AdminNews() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', slug: '', content: '', coverImage: '', tags: '', isPublished: false });
  const [editing, setEditing] = useState(null);

  const load = () => adminListPosts().then(d => setItems(d.items || []));
  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    if (editing) {
      await adminUpdatePost(editing._id, payload);
    } else {
      await adminCreatePost(payload);
    }
    setForm({ title: '', slug: '', content: '', coverImage: '', tags: '', isPublished: false });
    setEditing(null);
    load();
  };

  const onUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await privateApi.post('/uploads/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.url;
      if (url) setForm(f => ({ ...f, coverImage: url }));
    } catch (err) {
      console.error('Upload cover failed', err);
      alert('Upload ảnh bìa thất bại');
    }
  };

  const onEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || '',
      slug: item.slug || '',
      content: item.content || '',
      coverImage: item.coverImage || '',
      tags: (item.tags || []).join(','),
      isPublished: !!item.isPublished,
    });
  };

  const onDelete = async (id) => {
    await adminDeletePost(id);
    load();
  };

  return (
    <div className="container-fluid">
      <h3 className="mb-3"><i className="bi bi-newspaper"></i> Quản lý tin tức</h3>
      <form className="card p-3 mb-3" onSubmit={onSubmit}>
        <div className="row g-2">
          <div className="col-md-6">
            <label className="form-label">Tiêu đề</label>
            <input className="form-control" value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))} required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Slug</label>
            <input className="form-control" value={form.slug} onChange={e=>setForm(f=>({ ...f, slug: e.target.value }))} required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Ảnh bìa</label>
            <div className="input-group">
              <input className="form-control" placeholder="URL ảnh" value={form.coverImage} onChange={e=>setForm(f=>({ ...f, coverImage: e.target.value }))} />
              <input type="file" className="form-control" accept="image/*" onChange={onUploadCover} />
            </div>
            {form.coverImage && (
              <div className="mt-2">
                <img src={form.coverImage} alt="cover" className="img-fluid rounded" />
              </div>
            )}
          </div>
          <div className="col-md-6">
            <label className="form-label">Tags (phân cách bằng dấu phẩy)</label>
            <input className="form-control" value={form.tags} onChange={e=>setForm(f=>({ ...f, tags: e.target.value }))} />
          </div>
          <div className="col-12">
            <label className="form-label">Nội dung (HTML)</label>
            <textarea className="form-control" rows={6} value={form.content} onChange={e=>setForm(f=>({ ...f, content: e.target.value }))} required />
          </div>
          <div className="col-12 d-flex justify-content-between align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="publishCheck" checked={form.isPublished} onChange={e=>setForm(f=>({ ...f, isPublished: e.target.checked }))} />
              <label className="form-check-label" htmlFor="publishCheck">Công khai</label>
            </div>
            <button className="btn btn-primary" type="submit">{editing ? 'Cập nhật' : 'Tạo bài viết'}</button>
          </div>
        </div>
      </form>

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Slug</th>
                  <th>Tags</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it._id}>
                    <td>{it.title}</td>
                    <td>{it.slug}</td>
                    <td>{(it.tags||[]).join(', ')}</td>
                    <td>{it.isPublished ? 'Công khai' : 'Nháp'}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-secondary me-2" onClick={()=>onEdit(it)}>Sửa</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>onDelete(it._id)}>Xóa</button>
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
