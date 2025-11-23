import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getInventory,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  importInventory,
  getCategories,
  createCategory,
} from '../../api/pharmacy';

const defaultForm = {
  link: '',
  ten_san_pham: '',
  gia: 0,
  don_vi: '',
  mo_ta: '',
  don_vi_dang_chon: '',
  loaiThuoc: '', // category id reference
  chi_tiet: {
    thanh_phan: { text: '', html: '' },
    cong_dung: { text: '', html: '' },
    cach_dung: { text: '', html: '' },
    tac_dung_phu: { text: '', html: '' },
    luu_y: { text: '', html: '' },
    bao_quan: { text: '', html: '' },
    anh_san_pham: [],
  },
};

export default function PharmacyInventory() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [expanded, setExpanded] = useState({});
  const [importResult, setImportResult] = useState(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getInventory({ page, limit, q, sortBy, order, categoryId: selectedCategoryId || undefined });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast.error('Tải kho thất bại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sortBy, order, selectedCategoryId]);

  const loadCategories = async () => {
    try {
      const { data } = await getCategories();
      setCategories(data);
    } catch (e) {}
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      link: item.link || '',
      ten_san_pham: item.ten_san_pham || '',
      gia: item.gia || 0,
      don_vi: item.don_vi || '',
      mo_ta: item.mo_ta || '',
      don_vi_dang_chon: item.don_vi_dang_chon || '',
      loaiThuoc: item.loaiThuoc?._id || '',
      chi_tiet: {
        thanh_phan: { text: item.chi_tiet?.thanh_phan?.text || '', html: item.chi_tiet?.thanh_phan?.html || '' },
        cong_dung: { text: item.chi_tiet?.cong_dung?.text || '', html: item.chi_tiet?.cong_dung?.html || '' },
        cach_dung: { text: item.chi_tiet?.cach_dung?.text || '', html: item.chi_tiet?.cach_dung?.html || '' },
        tac_dung_phu: { text: item.chi_tiet?.tac_dung_phu?.text || '', html: item.chi_tiet?.tac_dung_phu?.html || '' },
        luu_y: { text: item.chi_tiet?.luu_y?.text || '', html: item.chi_tiet?.luu_y?.html || '' },
        bao_quan: { text: item.chi_tiet?.bao_quan?.text || '', html: item.chi_tiet?.bao_quan?.html || '' },
        anh_san_pham: item.chi_tiet?.anh_san_pham || [],
      },
    });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (!form.ten_san_pham || !form.link) {
        toast.warn('Vui lòng nhập link và tên sản phẩm');
        return;
      }
      const payload = { ...form, loaiThuoc: form.loaiThuoc || selectedCategoryId || '' };
      if (editing) {
        await updateMedicine(editing._id, payload);
        toast.success('Đã cập nhật');
      } else {
        await createMedicine(payload);
        toast.success('Đã tạo mới');
      }
      setShowModal(false);
      load();
    } catch (e) {
      toast.error('Lưu thất bại');
    }
  };

  const removeItem = async (it) => {
    if (!confirm(`Xóa "${it.ten_san_pham}"?`)) return;
    try {
      await deleteMedicine(it._id);
      toast.success('Đã xóa');
      load();
    } catch (e) {
      toast.error('Xóa thất bại');
    }
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        toast.warn('File phải là mảng JSON');
        return;
      }
      setImporting(true);
      const res = await importInventory(data, selectedCategoryId ? { categoryId: selectedCategoryId } : {});
      setImportResult(res.data);
      toast.success('Import thành công');
      setPage(1);
      load();
      loadCategories();
    } catch (err) {
      toast.error('Import thất bại: ' + (err?.response?.data?.message || err.message));
    } finally {
      setImporting(false);
      // reset the input so same file can be re-selected
      e.target.value = '';
    }
  };

  const createCategoryInline = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const { data } = await createCategory({ ten: name });
      setNewCategoryName('');
      setSelectedCategoryId(data._id);
      await loadCategories();
      toast.success('Đã tạo loại');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Tạo loại thất bại');
    }
  };

  // Removed inline category delete/import (side panel no longer used)

  return (
    <div className="container py-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0"><i className="bi bi-capsule"></i> Quản lý kho thuốc</h4>
        <div className="d-flex gap-2">
          <label className="btn btn-outline-secondary mb-0" disabled={importing}>
            {importing ? (<><span className="spinner-border spinner-border-sm me-2"></span>Đang import...</>) : (<><i className="bi bi-upload"></i> Import JSON</>)}
            <input type="file" accept="application/json" onChange={onImportFile} hidden />
          </label>
          <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg"></i> Thêm thuốc</button>
        </div>
      </div>

      <section>
        <form className="row g-2 mb-3" onSubmit={onSearch}>
          <div className="col-md-3">
            <input className="form-control" placeholder="Tìm theo tên, mô tả..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="col-md-3">
            <div className="input-group">
              <select className="form-select" value={selectedCategoryId} onChange={(e)=>{ setSelectedCategoryId(e.target.value); setPage(1); }}>
                <option value="">-- Tất cả loại thuốc --</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.ten} ({c.count})</option>
                ))}
              </select>
              <button type="button" className="btn btn-outline-secondary" onClick={loadCategories} title="Làm mới"><i className="bi bi-arrow-clockwise"></i></button>
            </div>
          </div>
          <div className="col-md-2">
            <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="createdAt">Mới nhất</option>
              <option value="ten_san_pham">Tên</option>
              <option value="gia">Giá</option>
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="desc">Giảm dần</option>
              <option value="asc">Tăng dần</option>
            </select>
          </div>
          <div className="col-md-1">
            <select className="form-select" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className="col-md-1 d-grid">
            <button className="btn btn-outline-primary" disabled={loading}><i className="bi bi-search"></i></button>
          </div>
          <div className="col-md-3 d-flex gap-2">
            <form className="input-group" onSubmit={createCategoryInline}>
              <input className="form-control" placeholder="Tạo loại mới" value={newCategoryName} onChange={(e)=>setNewCategoryName(e.target.value)} />
              <button className="btn btn-outline-primary" type="submit"><i className="bi bi-plus-lg"></i></button>
            </form>
          </div>
        </form>
        <div className="table-responsive shadow-sm border rounded">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Tên sản phẩm</th>
                <th>Đơn vị</th>
                <th>Loại</th>
                <th>Giá</th>
                <th>Mô tả & Ảnh</th>
                <th>Đang chọn</th>
                <th style={{ width: 220 }} className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
                {loading && (
                  <tr><td colSpan={8} className="text-center py-4">Đang tải...</td></tr>
                )}
                {!loading && items.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-4">Chưa có dữ liệu</td></tr>
                )}
                {!loading && items.map((it, idx) => (
                  <React.Fragment key={it._id}>
                    <tr>
                      <td>{(page - 1) * limit + idx + 1}</td>
                      <td className="fw-semibold">{it.ten_san_pham}</td>
                      <td>{it.don_vi}</td>
                      <td>{it.loaiThuoc?.ten || <span className="text-muted">-</span>}</td>
                      <td>{(it.gia || 0).toLocaleString('vi-VN')}</td>
                      <td className="text-truncate" style={{ maxWidth: 280 }}>
                        <div>{it.mo_ta}</div>
                        {(it.chi_tiet?.anh_san_pham?.length || 0) > 0 && (
                          <div className="mt-1 d-flex gap-1 flex-wrap">
                            {(it.chi_tiet.anh_san_pham || []).slice(0,3).map((url,i)=>(
                              <img key={i} src={url} alt={it.ten_san_pham + ' ' + i} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                            ))}
                            {it.chi_tiet.anh_san_pham.length > 3 && (
                              <span className="badge bg-secondary">+{it.chi_tiet.anh_san_pham.length - 3}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>{it.don_vi_dang_chon}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-info me-2" onClick={() => setExpanded(prev => ({...prev, [it._id]: !prev[it._id]}))}>
                          {expanded[it._id] ? <i className="bi bi-chevron-up"></i> : <i className="bi bi-chevron-down"></i>} Chi tiết
                        </button>
                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => openEdit(it)}><i className="bi bi-pencil-square"></i></button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => removeItem(it)}><i className="bi bi-trash"></i></button>
                      </td>
                    </tr>
                    {expanded[it._id] && (
                      <tr>
                        <td></td>
                        <td colSpan={7}>
                          <div className="card card-body">
                            <div className="row g-3">
                              <div className="col-md-6">
                                <div className="small text-muted">Thành phần</div>
                                <div>{it.chi_tiet?.thanh_phan?.text}</div>
                              </div>
                              <div className="col-md-6">
                                <div className="small text-muted">Công dụng</div>
                                <div>{it.chi_tiet?.cong_dung?.text}</div>
                              </div>
                              <div className="col-md-6">
                                <div className="small text-muted">Cách dùng</div>
                                <div>{it.chi_tiet?.cach_dung?.text}</div>
                              </div>
                              <div className="col-md-6">
                                <div className="small text-muted">Tác dụng phụ</div>
                                <div>{it.chi_tiet?.tac_dung_phu?.text}</div>
                              </div>
                              <div className="col-md-6">
                                <div className="small text-muted">Lưu ý</div>
                                <div>{it.chi_tiet?.luu_y?.text}</div>
                              </div>
                              <div className="col-md-6">
                                <div className="small text-muted">Bảo quản</div>
                                <div>{it.chi_tiet?.bao_quan?.text}</div>
                              </div>
                              <div className="col-12">
                                <div className="small text-muted">Ảnh sản phẩm ({it.chi_tiet?.anh_san_pham?.length || 0})</div>
                                <div className="d-flex gap-2 flex-wrap">
                                  {(it.chi_tiet?.anh_san_pham || []).map((url, i) => (
                                    <img key={i} src={url} alt={it.ten_san_pham + ' ' + i} style={{ width: 80, height: 80, objectFit: 'cover' }} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted">Tổng: {total}</div>
          <div className="btn-group">
            <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Trang trước</button>
            <span className="btn btn-light disabled">{page}/{totalPages}</span>
            <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Trang sau</button>
          </div>
        </div>
      </section>

      

      {showModal && (
        <div className="modal show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Cập nhật thuốc' : 'Thêm thuốc'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={save}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Link</label>
                      <input className="form-control" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Tên sản phẩm</label>
                      <input className="form-control" value={form.ten_san_pham} onChange={(e) => setForm({ ...form, ten_san_pham: e.target.value })} required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Giá</label>
                      <input type="number" className="form-control" value={form.gia} onChange={(e) => setForm({ ...form, gia: Number(e.target.value) })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Đơn vị</label>
                      <input className="form-control" value={form.don_vi} onChange={(e) => setForm({ ...form, don_vi: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Loại thuốc</label>
                      <select className="form-select" value={form.loaiThuoc || selectedCategoryId || ''} onChange={(e)=> setForm({ ...form, loaiThuoc: e.target.value })}>
                        <option value="">-- Chưa chọn --</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.ten}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Đơn vị đang chọn</label>
                      <input className="form-control" value={form.don_vi_dang_chon} onChange={(e) => setForm({ ...form, don_vi_dang_chon: e.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Mô tả</label>
                      <textarea className="form-control" rows={2} value={form.mo_ta} onChange={(e) => setForm({ ...form, mo_ta: e.target.value })}></textarea>
                    </div>

                    <div className="col-12">
                      <div className="fw-semibold mb-2">Chi tiết</div>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Thành phần (text)</label>
                          <textarea className="form-control" rows={2} value={form.chi_tiet.thanh_phan.text} onChange={(e) => setForm({ ...form, chi_tiet: { ...form.chi_tiet, thanh_phan: { ...form.chi_tiet.thanh_phan, text: e.target.value } } })}></textarea>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Công dụng (text)</label>
                          <textarea className="form-control" rows={2} value={form.chi_tiet.cong_dung.text} onChange={(e) => setForm({ ...form, chi_tiet: { ...form.chi_tiet, cong_dung: { ...form.chi_tiet.cong_dung, text: e.target.value } } })}></textarea>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Cách dùng (text)</label>
                          <textarea className="form-control" rows={2} value={form.chi_tiet.cach_dung.text} onChange={(e) => setForm({ ...form, chi_tiet: { ...form.chi_tiet, cach_dung: { ...form.chi_tiet.cach_dung, text: e.target.value } } })}></textarea>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Tác dụng phụ (text)</label>
                          <textarea className="form-control" rows={2} value={form.chi_tiet.tac_dung_phu.text} onChange={(e) => setForm({ ...form, chi_tiet: { ...form.chi_tiet, tac_dung_phu: { ...form.chi_tiet.tac_dung_phu, text: e.target.value } } })}></textarea>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Lưu ý (text)</label>
                          <textarea className="form-control" rows={2} value={form.chi_tiet.luu_y.text} onChange={(e) => setForm({ ...form, chi_tiet: { ...form.chi_tiet, luu_y: { ...form.chi_tiet.luu_y, text: e.target.value } } })}></textarea>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Bảo quản (text)</label>
                          <textarea className="form-control" rows={2} value={form.chi_tiet.bao_quan.text} onChange={(e) => setForm({ ...form, chi_tiet: { ...form.chi_tiet, bao_quan: { ...form.chi_tiet.bao_quan, text: e.target.value } } })}></textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Đóng</button>
                  <button className="btn btn-primary" type="submit">Lưu</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {importResult && (
        <div className="modal show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Kết quả import</h5>
                <button type="button" className="btn-close" onClick={() => setImportResult(null)}></button>
              </div>
              <div className="modal-body">
                <div className="d-flex gap-3 mb-3">
                  <span className="badge bg-secondary">Tổng: {importResult.total}</span>
                  <span className="badge bg-success">Thêm mới: {importResult.inserted}</span>
                  <span className="badge bg-primary">Cập nhật: {importResult.updated}</span>
                  <span className="badge bg-danger">Lỗi: {importResult.failed}</span>
                </div>
                <div className="table-responsive" style={{maxHeight: 400}}>
                  <table className="table table-sm table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Khóa</th>
                        <th>Trạng thái</th>
                        <th>ID</th>
                        <th>Thông điệp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(importResult.details || []).map((d, i) => (
                        <tr key={i}>
                          <td>{d.index + 1}</td>
                          <td className="text-truncate" style={{maxWidth: 320}}>{typeof d.key === 'object' ? JSON.stringify(d.key) : d.key}</td>
                          <td>
                            {d.status === 'inserted' && <span className="badge bg-success">inserted</span>}
                            {d.status === 'updated' && <span className="badge bg-primary">updated</span>}
                            {d.status === 'error' && <span className="badge bg-danger">error</span>}
                          </td>
                          <td className="text-muted small">{d.id || ''}</td>
                          <td className="text-danger small">{d.message || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={() => setImportResult(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
