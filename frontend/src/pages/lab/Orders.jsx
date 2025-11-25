import React, { useEffect, useMemo, useState } from 'react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function LabOrders(){
  const [status, setStatus] = useState('cho_thuc_hien');
  const [items,setItems]=useState([]);
  const [cases, setCases] = useState([]); // grouped by hoSoKham
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultDraft, setResultDraft] = useState({});
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // table | cards
  const today = useMemo(()=> new Date().toISOString().slice(0,10), []);
  const [day, setDay] = useState(today); // YYYY-MM-DD
  const [pdfDraft, setPdfDraft] = useState({}); // id -> File
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  const headers = useMemo(()=> ({ 'Authorization': `Bearer ${localStorage.getItem('accessToken')||''}`, 'Content-Type': 'application/json' }), []);

  async function load(){
    setLoading(true); setError('');
    try{
      const qs = new URLSearchParams({ status });
      if(search.trim()) qs.set('q', search.trim());
      if(day) qs.set('day', day);
      const res = await fetch(`${API_URL}/api/lab/orders?${qs.toString()}`, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setItems(json);
      // group by hoSoKhamId
      const map = new Map();
      for(const it of (json || [])){
        const hs = it.hoSoKhamId || {};
        const hid = hs._id || (typeof hs === 'string' ? hs : null);
        if(!hid) continue;
        const entry = map.get(hid) || { hoSoKhamId: hid, benhNhan: hs.benhNhanId || hs.benhNhan || {}, ngayKham: hs.ngayKham || null, count: 0 };
        entry.count = (entry.count || 0) + 1;
        map.set(hid, entry);
      }
      setCases(Array.from(map.values()));
    }catch(e){ setError(e?.message||'Lỗi tải'); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [status, day]);

  function changeDay(offset){
    // offset in days relative to current day state
    if(!day) return;
    const d = new Date(day + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setDay(d.toISOString().slice(0,10));
  }

  async function start(id){
    const res = await fetch(`${API_URL}/api/lab/orders/${id}/start`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')||''}` }});
    if(res.ok) load();
  }
  async function complete(id){
    const body = { ketQua: resultDraft[id] || '' };
    const res = await fetch(`${API_URL}/api/lab/orders/${id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')||''}` }, body: JSON.stringify(body) });
    if(res.ok) { setResultDraft(prev=> ({ ...prev, [id]: '' })); load(); }
  }

  async function uploadPdf(id){
    const file = pdfDraft[id];
    if(!file) return alert('Chọn file PDF');
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch(`${API_URL}/api/lab/orders/${id}/result`, { method:'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')||''}` }, body: fd });
    if(res.ok){ setPdfDraft(prev=> ({ ...prev, [id]: undefined })); load(); } else { const j = await res.json().catch(()=>null); alert(j?.message || 'Tải lên thất bại'); }
  }

  const totalChiPhi = items.reduce((sum,it)=> sum + (Number.isFinite(it?.dichVuId?.gia)? it.dichVuId.gia : 0),0);

  return (
    <div className="container py-2">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="m-0">Chỉ định cận lâm sàng</h3>
        <div className="btn-group btn-group-sm">
          <button className={`btn btn-outline-secondary ${viewMode==='table'?'active':''}`} onClick={()=>setViewMode('table')}>Bảng</button>
          <button className={`btn btn-outline-secondary ${viewMode==='cards'?'active':''}`} onClick={()=>setViewMode('cards')}>Thẻ</button>
        </div>
      </div>
          {/* Case-first view: list cases, click to view orders for that case */}
          {!selectedCaseId && (
            <div className="mb-3">
              <h5>Hồ sơ có chỉ định</h5>
              <div className="row g-2">
                {cases.map(c => (
                  <div key={c.hoSoKhamId} className="col-md-4">
                    <div className="card h-100">
                      <div className="card-body d-flex flex-column">
                        <div className="mb-1"><strong>{c.benhNhan?.hoTen || '-'}</strong></div>
                        <div className="small text-muted mb-2">{c.benhNhan?.soDienThoai || ''} — Ngày: {c.ngayKham? new Date(c.ngayKham).toLocaleString() : '-'}</div>
                        <div className="mb-2">Chỉ định: <strong>{c.count}</strong></div>
                        <div className="mt-auto text-end">
                          <button className="btn btn-sm btn-primary" onClick={async ()=>{ setSelectedCaseId(String(c.hoSoKhamId)); await load(); }}>Xem chỉ định</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {cases.length===0 && <div className="col-12 text-muted">Không có hồ sơ</div>}
              </div>
            </div>
          )}
          {selectedCaseId && (
            <div className="mb-3">
              <button className="btn btn-link p-0 mb-2" onClick={()=> setSelectedCaseId(null)}>← Quay lại danh sách hồ sơ</button>
              <div className="alert alert-secondary">Hiển thị chỉ định cho hồ sơ: <strong>{selectedCaseId}</strong></div>
            </div>
          )}
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <label className="form-label">Trạng thái</label>
          <select className="form-select" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="cho_thuc_hien">Chờ thực hiện</option>
            <option value="dang_thuc_hien">Đang thực hiện</option>
            <option value="da_xong">Đã xong</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Tìm kiếm (ghi chú / loại)</label>
          <input className="form-control" placeholder="Nhập từ khóa..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Ngày</label>
          <div className="d-flex gap-1">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={()=>changeDay(-1)}>&lt;</button>
            <input type="date" className="form-control" value={day} max={today} onChange={e=>setDay(e.target.value)} />
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={()=>changeDay(1)} disabled={day>=today}>&gt;</button>
            <button type="button" className="btn btn-outline-primary btn-sm" disabled={day===today} onClick={()=>setDay(today)}>Hôm nay</button>
          </div>
        </div>
        <div className="col-md-2 align-self-end"><button className="btn btn-primary w-100" disabled={loading} onClick={load}>Làm mới</button></div>
        <div className="col-md-3 align-self-end">
          <div className="border rounded p-2 bg-light small">
            <div className="d-flex justify-content-between"><span>Tổng chỉ định:</span><strong>{items.length}</strong></div>
            <div className="d-flex justify-content-between"><span>Tổng chi phí:</span><strong>{totalChiPhi.toLocaleString()}₫</strong></div>
          </div>
        </div>
      </div>
      {viewMode==='table' && (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>Bệnh nhân</th><th>Dịch vụ</th><th>Chuyên khoa</th><th>Giá</th><th>Ghi chú</th><th>Trạng thái</th><th>Kết quả</th><th>File PDF</th><th>Thời gian</th><th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(it => {
                if(!selectedCaseId) return true;
                const hid = it.hoSoKhamId?._id || (it.hoSoKhamId || '');
                return String(hid) === String(selectedCaseId);
              }).map(it => {
                const bn = it.hoSoKhamId?.benhNhanId;
                const dv = it.dichVuId;
                return (
                  <tr key={it._id}>
                    <td>{bn?.hoTen || '-'}<br/><small className="text-muted">{bn?.ngaySinh ? new Date(bn.ngaySinh).getFullYear():''}</small></td>
                    <td>{dv?.ten || it.loaiChiDinh}</td>
                    <td>{dv?.chuyenKhoaId?.ten || ''}</td>
                    <td>{Number.isFinite(dv?.gia)? dv.gia.toLocaleString()+'₫':''}</td>
                    <td style={{minWidth:160}}>{it.ghiChu || <span className="text-muted">(trống)</span>}</td>
                    <td>{it.trangThai}</td>
                    <td style={{minWidth:220}}>
                      <input className="form-control form-control-sm mb-1" placeholder="Nhập kết quả" value={resultDraft[it._id]||it.ketQua||''} onChange={e=> setResultDraft(prev=> ({ ...prev, [it._id]: e.target.value }))} />
                      {(it.trangThai==='cho_thuc_hien' || it.trangThai==='dang_thuc_hien') && <button className="btn btn-sm btn-outline-success" onClick={()=>complete(it._id)}>Lưu kết quả</button>}
                    </td>
                    <td style={{minWidth:160}}>
                      {it.ketQuaPdf ? (
                        <a href={API_URL + it.ketQuaPdf} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">Xem PDF</a>
                      ) : (
                        <div className="d-flex flex-column gap-1">
                          <input type="file" accept="application/pdf" className="form-control form-control-sm" onChange={e=> setPdfDraft(prev=> ({ ...prev, [it._id]: e.target.files?.[0] }))} />
                          <button className="btn btn-sm btn-primary" disabled={!pdfDraft[it._id]} onClick={()=>uploadPdf(it._id)}>Gửi PDF</button>
                        </div>
                      )}
                    </td>
                    <td><small>{new Date(it.createdAt).toLocaleTimeString()}</small></td>
                    <td className="text-nowrap">
                      {it.trangThai==='cho_thuc_hien' && <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>start(it._id)}>Bắt đầu</button>}
                      {(it.trangThai==='cho_thuc_hien' || it.trangThai==='dang_thuc_hien') && <button className="btn btn-sm btn-success" onClick={()=>complete(it._id)}>Hoàn tất</button>}
                    </td>
                  </tr>
                );
              })}
              {items.length===0 && <tr><td colSpan={9} className="text-center">Không có dữ liệu</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {viewMode==='cards' && (
        <div className="row g-3">
          {items.map(it => {
            const bn = it.hoSoKhamId?.benhNhanId; const dv = it.dichVuId;
            return (
              <div key={it._id} className="col-md-4">
                <div className="card shadow-sm h-100">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between">
                      <h6 className="mb-1">{dv?.ten || it.loaiChiDinh}</h6>
                      <span className="badge text-bg-light">{it.trangThai}</span>
                    </div>
                    <div className="small text-muted mb-2">{dv?.chuyenKhoaId?.ten || '---'}</div>
                    <div className="mb-2"><strong>{bn?.hoTen || '-'}</strong> {bn?.ngaySinh && <small className="text-muted">({new Date(bn.ngaySinh).getFullYear()})</small>}</div>
                    <div className="mb-2">Giá: {Number.isFinite(dv?.gia)? dv.gia.toLocaleString()+'₫':'--'}</div>
                    <div className="mb-2">
                      <label className="form-label mb-1 small">Kết quả</label>
                      <textarea rows={3} className="form-control form-control-sm" value={resultDraft[it._id]||it.ketQua||''} onChange={e=> setResultDraft(prev=> ({ ...prev, [it._id]: e.target.value }))} />
                    </div>
                    <div className="mt-auto d-flex justify-content-between align-items-center">
                      <small className="text-muted">{new Date(it.createdAt).toLocaleString()}</small>
                      <div>
                        {it.trangThai==='cho_thuc_hien' && <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>start(it._id)}>Bắt đầu</button>}
                        {(it.trangThai==='cho_thuc_hien' || it.trangThai==='dang_thuc_hien') && <button className="btn btn-sm btn-success me-2" onClick={()=>complete(it._id)}>Hoàn tất</button>}
                        {it.ketQuaPdf ? (
                          <a href={API_URL + it.ketQuaPdf} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">PDF</a>
                        ) : (
                          <div className="d-inline-block">
                            <input type="file" accept="application/pdf" className="form-control form-control-sm mb-1" onChange={e=> setPdfDraft(prev=> ({ ...prev, [it._id]: e.target.files?.[0] }))} />
                            <button className="btn btn-sm btn-primary w-100" disabled={!pdfDraft[it._id]} onClick={()=>uploadPdf(it._id)}>Gửi PDF</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length===0 && <div className="col-12 text-center text-muted">Không có dữ liệu</div>}
        </div>
      )}
    </div>
  );
}
