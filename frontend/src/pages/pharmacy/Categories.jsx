import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getCategories, createCategory, deleteCategory, importToCategory } from '../../api/pharmacy';

export default function PharmacyCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const fileInputRef = useRef({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getCategories();
      setCategories(data);
    } catch (e) {
      toast.error('Tải loại thuốc thất bại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createCategory({ ten: name.trim() });
      setName('');
      await load();
      toast.success('Đã tạo loại thuốc');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Tạo thất bại');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (c) => {
    if (!confirm(`Xóa loại "${c.ten}"?`)) return;
    try {
      await deleteCategory(c._id);
      await load();
      toast.success('Đã xóa');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Không thể xóa');
    }
  };

  const onPickFile = (id) => {
    if (!fileInputRef.current[id]) return;
    fileInputRef.current[id].click();
  };

  const onImportFile = async (c, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) { toast.warn('File phải là mảng JSON'); return; }
      await importToCategory(c._id, data);
      toast.success('Import thành công');
      await load();
    } catch (err) {
      toast.error('Import thất bại: ' + (err?.response?.data?.message || err.message));
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="container py-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0"><i className="bi bi-tags"></i> Loại thuốc</h4>
      </div>
      <form className="row g-2 mb-3" onSubmit={onCreate}>
        <div className="col-md-6">
          <input className="form-control" placeholder="Tên loại thuốc" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="col-md-3 d-grid">
          <button className="btn btn-primary" disabled={creating}>{creating ? 'Đang tạo...' : 'Tạo loại'}</button>
        </div>
      </form>

      <div className="table-responsive shadow-sm border rounded">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Tên</th>
              <th>Mô tả</th>
              <th>Số thuốc</th>
              <th style={{ width: 220 }} className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="text-center py-4">Đang tải...</td></tr>}
            {!loading && categories.length === 0 && <tr><td colSpan={5} className="text-center py-4">Chưa có loại thuốc</td></tr>}
            {!loading && categories.map((c, idx) => (
              <tr key={c._id}>
                <td>{idx + 1}</td>
                <td>{c.ten}</td>
                <td className="text-truncate" style={{ maxWidth: 360 }}>{c.mo_ta}</td>
                <td><span className="badge bg-secondary">{c.count}</span></td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-success me-2" onClick={() => onPickFile(c._id)}><i className="bi bi-upload"></i> Import JSON</button>
                  <input ref={(el) => (fileInputRef.current[c._id] = el)} type="file" hidden accept="application/json" onChange={(e) => onImportFile(c, e)} />
                  <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(c)} disabled={c.count > 0}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
