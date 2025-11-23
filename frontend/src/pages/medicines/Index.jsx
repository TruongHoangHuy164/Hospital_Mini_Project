import React, { useEffect, useState, useMemo } from 'react';
import { getPublicMedicines, getPublicMedicine, getPublicMedicineCategories } from '../../api/pharmacy';
import { toast } from 'react-toastify';

export default function MedicinesIndex() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(24);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [order, setOrder] = useState('asc');
  const [sortBy, setSortBy] = useState('ten_san_pham');

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const load = async (append = false) => {
    setLoading(true);
    try {
      const { data } = await getPublicMedicines({ page, limit, q, categoryId, sortBy, order });
      setTotal(data.total);
      setItems(prev => append ? [...prev, ...data.items] : data.items);
    } catch (e) {
      toast.error('Không tải được danh sách thuốc');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, limit, sortBy, order, categoryId]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getPublicMedicineCategories();
        setCategories(data);
      } catch (e) { /* silent */ }
    })();
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const openDetail = async (id) => {
    setFetchingDetail(true);
    try {
      const { data } = await getPublicMedicine(id);
      setDetail(data);
    } catch (e) {
      toast.error('Không lấy được chi tiết thuốc');
    } finally { setFetchingDetail(false); }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0"><i className="bi bi-capsule"></i> Danh sách thuốc</h4>
      </div>

      <form className="row g-2 mb-4" onSubmit={onSearch}>
        <div className="col-md-4">
          <input className="form-control" placeholder="Tìm tên hoặc mô tả..." value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>
        <div className="col-md-3">
          <select className="form-select" value={categoryId} onChange={(e)=>{ setCategoryId(e.target.value); setPage(1); }}>
            <option value="">-- Tất cả loại --</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.ten} ({c.count})</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
            <option value="ten_san_pham">Tên</option>
            <option value="gia">Giá</option>
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={order} onChange={(e)=>setOrder(e.target.value)}>
            <option value="asc">Tăng dần</option>
            <option value="desc">Giảm dần</option>
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={limit} onChange={(e)=>{ setLimit(Number(e.target.value)); setPage(1); }}>
            <option value="12">12 / trang</option>
            <option value="24">24 / trang</option>
            <option value="48">48 / trang</option>
          </select>
        </div>
        <div className="col-md-1 d-grid">
          <button className="btn btn-primary" disabled={loading}><i className="bi bi-search"></i></button>
        </div>
      </form>

      <div className="row g-3">
        {items.map(it => (
          <div key={it._id} className="col-6 col-md-3 col-lg-2">
            <div className="card h-100 shadow-sm medicine-card" role="button" onClick={() => openDetail(it._id)}>
              <div className="ratio ratio-1x1 bg-light">
                {it.anh_san_pham && it.anh_san_pham.length > 0 ? (
                  <img src={it.anh_san_pham[0]} alt={it.ten_san_pham} style={{objectFit:'cover'}} />
                ) : (
                  <div className="d-flex align-items-center justify-content-center text-muted">No Image</div>
                )}
              </div>
              <div className="card-body p-2 d-flex flex-column">
                <div className="small text-truncate fw-semibold" title={it.ten_san_pham}>{it.ten_san_pham}</div>
                <div className="mt-1">
                  <span className="badge" style={{background:'#e6f9ed', color:'#0a7a28', border:'1px solid #b4e7c7'}}>{(it.gia||0).toLocaleString('vi-VN')} đ</span>
                </div>
                {it.loaiThuoc?.ten && <span className="badge bg-secondary mt-auto align-self-start">{it.loaiThuoc.ten}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="d-flex justify-content-center my-4">
        {page < totalPages && (
          <button className="btn btn-outline-primary" disabled={loading} onClick={() => setPage(p=>p+1)}>
            {loading ? 'Đang tải...' : 'Xem thêm'}
          </button>
        )}
        {page >= totalPages && totalPages > 1 && (
          <span className="text-muted small">Đã hiển thị tất cả</span>
        )}
      </div>

      {detail && (
        <div className="modal show" style={{display:'block'}}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <div>
                  <h5 className="modal-title fw-bold mb-1">{detail.ten_san_pham}</h5>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <span className="badge" style={{background:'#e6f9ed', color:'#0a7a28', border:'1px solid #b4e7c7'}}>{(detail.gia||0).toLocaleString('vi-VN')} đ</span>
                    {detail.loaiThuoc?.ten && <span className="badge bg-info text-dark fw-semibold">{detail.loaiThuoc.ten}</span>}
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={()=>setDetail(null)}></button>
              </div>
              <div className="modal-body pt-2">
                {detail.mo_ta && <div className="mb-3"><span className="fw-semibold">Mô tả:</span> <span>{detail.mo_ta}</span></div>}
                <div className="mb-3">
                  <div className="fw-semibold mb-2">Hình ảnh</div>
                  <div className="row g-2">
                    {(detail.chi_tiet?.anh_san_pham||[]).map((url,i)=>(
                      <div key={i} className="col-4 col-md-3">
                        <div className="ratio ratio-1x1 rounded overflow-hidden border" role="button" onClick={()=>{ setPreviewIndex(i); setPreviewImg(url); }}>
                          <img src={url} alt={detail.ten_san_pham+' '+i} style={{objectFit:'cover'}} />
                        </div>
                      </div>
                    ))}
                    {(detail.chi_tiet?.anh_san_pham?.length||0)===0 && <div className="text-muted small">Không có ảnh</div>}
                  </div>
                </div>
                <div className="row g-3">
                  {detail.chi_tiet?.thanh_phan?.text && (
                    <div className="col-md-6">
                      <div className="fw-semibold">Thành phần</div>
                      <div className="text-secondary small">{detail.chi_tiet.thanh_phan.text}</div>
                    </div>
                  )}
                  {detail.chi_tiet?.cong_dung?.text && (
                    <div className="col-md-6">
                      <div className="fw-semibold">Công dụng</div>
                      <div className="text-secondary small">{detail.chi_tiet.cong_dung.text}</div>
                    </div>
                  )}
                  {detail.chi_tiet?.cach_dung?.text && (
                    <div className="col-md-6">
                      <div className="fw-semibold">Cách dùng</div>
                      <div className="text-secondary small">{detail.chi_tiet.cach_dung.text}</div>
                    </div>
                  )}
                  {detail.chi_tiet?.tac_dung_phu?.text && (
                    <div className="col-md-6">
                      <div className="fw-semibold">Tác dụng phụ</div>
                      <div className="text-secondary small">{detail.chi_tiet.tac_dung_phu.text}</div>
                    </div>
                  )}
                  {detail.chi_tiet?.luu_y?.text && (
                    <div className="col-md-6">
                      <div className="fw-semibold">Lưu ý</div>
                      <div className="text-secondary small">{detail.chi_tiet.luu_y.text}</div>
                    </div>
                  )}
                  {detail.chi_tiet?.bao_quan?.text && (
                    <div className="col-md-6">
                      <div className="fw-semibold">Bảo quản</div>
                      <div className="text-secondary small">{detail.chi_tiet.bao_quan.text}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-light" onClick={()=>setDetail(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {detail && <div className="modal-backdrop show" style={{background:'rgba(0,0,0,0.25)'}} onClick={()=>setDetail(null)} />}
      {previewImg && (
        <div className="modal show" style={{display:'block'}}>
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content bg-dark text-white border-0">
              <div className="modal-header border-0">
                <div className="d-flex align-items-center gap-3 w-100">
                  <span className="small text-muted">Ảnh {previewIndex+1}/{(detail?.chi_tiet?.anh_san_pham||[]).length}</span>
                  <div className="ms-auto d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-outline-light" disabled={previewIndex<=0} onClick={()=>{
                      const imgs = detail?.chi_tiet?.anh_san_pham||[];
                      if (previewIndex>0){
                        const ni = previewIndex - 1;
                        setPreviewIndex(ni); setPreviewImg(imgs[ni]);
                      }
                    }}><i className="bi bi-chevron-left"></i></button>
                    <button type="button" className="btn btn-sm btn-outline-light" disabled={previewIndex>=( (detail?.chi_tiet?.anh_san_pham||[]).length -1)} onClick={()=>{
                      const imgs = detail?.chi_tiet?.anh_san_pham||[];
                      if (previewIndex < imgs.length -1){
                        const ni = previewIndex + 1;
                        setPreviewIndex(ni); setPreviewImg(imgs[ni]);
                      }
                    }}><i className="bi bi-chevron-right"></i></button>
                    <button type="button" className="btn btn-sm btn-light" onClick={()=>setPreviewImg(null)}><i className="bi bi-x-lg"></i></button>
                  </div>
                </div>
              </div>
              <div className="modal-body p-0">
                <div className="ratio ratio-16x9 bg-black">
                  <img src={previewImg} alt="preview" style={{objectFit:'contain', background:'#000'}} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {previewImg && <div className="modal-backdrop show" style={{background:'rgba(0,0,0,0.7)'}} onClick={()=>setPreviewImg(null)} />}
      {fetchingDetail && !detail && (
        <div className="position-fixed top-0 start-0 w-100 d-flex justify-content-center" style={{pointerEvents:'none'}}>
          <div className="spinner-border text-primary mt-5"></div>
        </div>
      )}
    </div>
  );
}
