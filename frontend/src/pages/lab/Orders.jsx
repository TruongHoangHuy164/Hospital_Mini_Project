import React, { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function LabOrders(){
  const [status, setStatus] = useState('cho_thuc_hien');
  const [items, setItems] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ paid: 0, pending: 0, done: 0, ready: 0 });
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [modalOrder, setModalOrder] = useState(null);
  const [resultText, setResultText] = useState('');
  const [resultFile, setResultFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [day, setDay] = useState(today);

  const headers = useMemo(() => ({
    'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json'
  }), []);

  async function loadStats() {
    try {
      const res = await fetch(`${API_URL}/api/lab/stats?date=${today}`, { headers });
      const json = await res.json();
      if (res.ok) setStats(json);
    } catch (e) {
      console.error('Load stats error:', e);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/lab/orders?status=${status}&day=${day}`,
        { headers }
      );
      const json = await res.json();
      if (!res.ok) throw json;
      
      // Backend trả về mảng trực tiếp, không phải { items: [...] }
      const labItems = Array.isArray(json) ? json : (json.items || []);
      setItems(labItems);
      
      const grouped = {};
      labItems.forEach(item => {
        const hsId = item.hoSoKhamId?._id;
        if (!grouped[hsId]) {
          grouped[hsId] = {
            hoSoKhamId: hsId,
            benhNhan: item.hoSoKhamId?.benhNhanId,
            ngayKham: item.hoSoKhamId?.ngayKham,
            count: 0
          };
        }
        grouped[hsId].count++;
      });
      setCases(Object.values(grouped));
      setError('');
    } catch (e) {
      setError(e?.message || 'Tải dữ liệu thất bại');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    load();
    loadStats();
  }, [status, day]);

  useEffect(() => {
    if (!autoRefresh || day !== today) return;
    const timer = setInterval(() => { load(); }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, day, today]);

  function changeDay(offset) {
    const d = new Date(day);
    d.setDate(d.getDate() + offset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    setDay(`${year}-${month}-${dayStr}`);
  }

  async function startOrder(id) {
    try {
      const res = await fetch(`${API_URL}/api/lab/orders/${id}/start`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({})
      });
      if (!res.ok) throw await res.json();
      load();
    } catch (e) {
      alert('❌ ' + (e?.message || 'Bắt đầu thất bại'));
    }
  }

  async function submitResult(id) {
    if (!resultText.trim()) {
      alert('⚠️ Vui lòng nhập kết quả');
      return;
    }
    setSubmitting(true);
    try {
      let res;
      if (resultFile) {
        const fd = new FormData();
        fd.append('ketQua', resultText);
        fd.append('file', resultFile);
        res = await fetch(`${API_URL}/api/lab/orders/${id}/result`, {
          method: 'PATCH',
          headers: { 'Authorization': headers.Authorization },
          body: fd
        });
      } else {
        res = await fetch(`${API_URL}/api/lab/orders/${id}/result`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ ketQua: resultText })
        });
      }

      if (!res.ok) throw await res.json();
      setModalOrder(null);
      setResultText('');
      setResultFile(null);
      load();
      alert('✅ Đã lưu kết quả');
    } catch (e) {
      alert('❌ ' + (e?.message || 'Lưu kết quả thất bại'));
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    return !q || 
      it.hoSoKhamId?.benhNhanId?.hoTen?.toLowerCase().includes(q) ||
      it.dichVuId?.ten?.toLowerCase().includes(q);
  });

  const totalChiPhi = filtered.reduce((sum, it) => 
    sum + (Number.isFinite(it?.dichVuId?.gia) ? it.dichVuId.gia : 0), 0
  );

  const getStatusBadge = (trangThai) => {
    const badges = {
      'cho_thuc_hien': <span className="badge bg-warning">⏳ Chờ thực hiện</span>,
      'dang_thuc_hien': <span className="badge bg-info">⚙️ Đang thực hiện</span>,
      'da_xong': <span className="badge bg-success">✓ Hoàn thành</span>
    };
    return badges[trangThai] || <span className="badge bg-secondary">{trangThai}</span>;
  };

  return (
    <div className="py-4">
      <div className="row mb-4">
        <div className="col-12">
          <h2 className="mb-1">
            <i className="bi bi-clipboard-check text-primary me-2"></i>Tiếp nhận & Xử lý chỉ định
          </h2>
          <p className="text-muted small mb-0">Quy trình: Nhận chỉ định (PAID) → Gọi bệnh nhân → Thực hiện → Nhập kết quả → Hoàn thành (RESULT_READY)</p>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {/* Statistics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-warning bg-opacity-10 h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <i className="bi bi-credit-card fs-3 text-warning"></i>
                </div>
                <div>
                  <small className="text-muted d-block">Chỉ định đã thanh toán</small>
                  <h5 className="mb-0 fw-bold text-warning">{stats.paid || 0}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-info bg-opacity-10 h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <i className="bi bi-hourglass-split fs-3 text-info"></i>
                </div>
                <div>
                  <small className="text-muted d-block">Đang thực hiện</small>
                  <h5 className="mb-0 fw-bold text-info">{stats.pending || 0}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-success bg-opacity-10 h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <i className="bi bi-check-circle fs-3 text-success"></i>
                </div>
                <div>
                  <small className="text-muted d-block">Hoàn thành xử lý</small>
                  <h5 className="mb-0 fw-bold text-success">{stats.done || 0}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-primary bg-opacity-10 h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <i className="bi bi-file-earmark-check fs-3 text-primary"></i>
                </div>
                <div>
                  <small className="text-muted d-block">Sẵn sàng trả kết quả</small>
                  <h5 className="mb-0 fw-bold text-primary">{stats.ready || 0}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-3">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label fw-semibold">Trạng thái</label>
              <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="cho_thuc_hien">⏳ Chờ thực hiện</option>
                <option value="dang_thuc_hien">⚙️ Đang thực hiện</option>
                <option value="da_xong">✓ Hoàn thành</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Tìm kiếm</label>
              <input className="form-control" placeholder="Bệnh nhân, dịch vụ..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Ngày</label>
              <div className="d-flex gap-1">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => changeDay(-1)}>&lt;</button>
                <input type="date" className="form-control form-control-sm" value={day} max={today} onChange={e => setDay(e.target.value)} />
                <button className="btn btn-sm btn-outline-secondary" onClick={() => changeDay(1)} disabled={day >= today}>&gt;</button>
              </div>
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button className="btn btn-primary flex-fill" onClick={load} disabled={loading}>
                <i className="bi bi-arrow-repeat me-1"></i>{loading ? 'Đang...' : 'Làm mới'}
              </button>
              <button className="btn btn-outline-secondary flex-fill" onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}>
                <i className={`bi bi-${viewMode === 'table' ? 'list' : 'column-gap'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-md-6">
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="autoRefresh" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} disabled={day !== today} />
                <label className="form-check-label" htmlFor="autoRefresh">
                  <i className="bi bi-arrow-repeat me-1"></i><strong>Cập nhật tự động ({refreshInterval}s)</strong>
                </label>
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={refreshInterval} onChange={e => setRefreshInterval(Number(e.target.value))} disabled={!autoRefresh}>
                <option value={3}>3 giây (nhanh)</option>
                <option value={5}>5 giây (mặc định)</option>
                <option value={10}>10 giây</option>
                <option value={15}>15 giây</option>
              </select>
            </div>
            <div className="col-md-3">
              <div className="alert alert-sm alert-info mb-0 py-2">
                <small>
                  {day !== today ? '📅 Chuyển sang "Hôm nay" để bật' : autoRefresh ? `⏱ Cập nhật mỗi ${refreshInterval}s` : '⏸ Tự động tắt'}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!selectedCaseId && cases.length > 0 && (
        <div className="mb-3">
          <h5 className="mb-3"><i className="bi bi-folder-check me-2"></i>Hồ sơ có chỉ định ({cases.length})</h5>
          <div className="row g-2">
            {cases.map(c => (
              <div key={c.hoSoKhamId} className="col-md-4">
                <div className="card h-100" style={{cursor: 'pointer'}}>
                  <div className="card-body d-flex flex-column">
                    <h6 className="card-title mb-2"><i className="bi bi-person-fill text-primary me-2"></i>{c.benhNhan?.hoTen || 'N/A'}</h6>
                    <small className="text-muted mb-2">📞 {c.benhNhan?.soDienThoai || 'N/A'}</small>
                    <div className="mb-3"><span className="badge bg-primary">{c.count} chỉ định</span></div>
                    <button className="btn btn-sm btn-primary mt-auto" onClick={() => setSelectedCaseId(c.hoSoKhamId)}>
                      <i className="bi bi-arrow-right me-1"></i>Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedCaseId && (
        <div className="alert alert-secondary mb-3 d-flex justify-content-between align-items-center">
          <div><strong>📂 Xem chỉ định cho hồ sơ:</strong> <span className="ms-2 badge bg-primary">{selectedCaseId}</span></div>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedCaseId(null)}>← Quay lại</button>
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="card border-0 bg-light">
            <div className="card-body p-3">
              <div className="small text-muted">Tổng chỉ định</div>
              <h5 className="mb-0 fw-bold">{filtered.length}</h5>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 bg-light">
            <div className="card-body p-3">
              <div className="small text-muted">Tổng chi phí</div>
              <h5 className="mb-0 fw-bold text-success">{totalChiPhi.toLocaleString()}₫</h5>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 bg-light">
            <div className="card-body p-3">
              <div className="small text-muted">Trạng thái</div>
              <h5 className="mb-0">{status === 'cho_thuc_hien' ? '⏳ Chờ' : status === 'dang_thuc_hien' ? '⚙️ Đang xử lý' : '✓ Hoàn thành'}</h5>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'table' && (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th><i className="bi bi-person"></i> Bệnh nhân</th>
                  <th><i className="bi bi-clipboard"></i> Dịch vụ</th>
                  <th><i className="bi bi-tag"></i> Chuyên khoa</th>
                  <th><i className="bi bi-cash"></i> Giá</th>
                  <th><i className="bi bi-status"></i> Trạng thái</th>
                  <th><i className="bi bi-file"></i> Kết quả</th>
                  <th className="text-center" style={{width: 150}}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(it => (
                  <tr key={it._id}>
                    <td>
                      <strong>{it.hoSoKhamId?.benhNhanId?.hoTen || 'N/A'}</strong>
                      <br /><small className="text-muted">{it.hoSoKhamId?.benhNhanId?.soDienThoai}</small>
                    </td>
                    <td>{it.dichVuId?.ten || 'N/A'}</td>
                    <td><small>{it.dichVuId?.chuyenKhoaId?.ten}</small></td>
                    <td><strong>{Number.isFinite(it.dichVuId?.gia) ? it.dichVuId.gia.toLocaleString() + '₫' : ''}</strong></td>
                    <td>{getStatusBadge(it.trangThai)}</td>
                    <td>{it.ketQua ? <span className="text-success">✓ Có</span> : <span className="text-muted">-</span>}</td>
                    <td className="text-center">
                      {it.trangThai === 'cho_thuc_hien' && <button className="btn btn-sm btn-info" onClick={() => startOrder(it._id)}>Bắt đầu</button>}
                      {it.trangThai === 'dang_thuc_hien' && <button className="btn btn-sm btn-success" onClick={() => {setModalOrder(it); setResultText(it.ketQua || '');}}>Nhập kết quả</button>}
                      {it.trangThai === 'da_xong' && <span className="badge bg-success">✓ Xong</span>}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="text-center text-muted py-4">Không có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'cards' && (
        <div className="row g-3">
          {filtered.length > 0 ? filtered.map(it => (
            <div key={it._id} className="col-md-6">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="mb-1">{it.dichVuId?.ten || 'N/A'}</h6>
                      <small className="text-muted">👤 {it.hoSoKhamId?.benhNhanId?.hoTen || 'N/A'}</small>
                    </div>
                    {getStatusBadge(it.trangThai)}
                  </div>
                  <div className="small mb-3">
                    <div className="mb-1"><strong>Chuyên khoa:</strong> {it.dichVuId?.chuyenKhoaId?.ten}</div>
                    <div className="mb-1"><strong>Giá:</strong> {Number.isFinite(it.dichVuId?.gia) ? it.dichVuId.gia.toLocaleString() + '₫' : ''}</div>
                  </div>
                  <div className="d-flex gap-2">
                    {it.trangThai === 'cho_thuc_hien' && <button className="btn btn-sm btn-info flex-fill" onClick={() => startOrder(it._id)}><i className="bi bi-play-fill me-1"></i>Bắt đầu</button>}
                    {it.trangThai === 'dang_thuc_hien' && <button className="btn btn-sm btn-success flex-fill" onClick={() => {setModalOrder(it); setResultText(it.ketQua || '');}}><i className="bi bi-check-circle me-1"></i>Nhập kết quả</button>}
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-12 text-center text-muted py-5">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              <p>Không có dữ liệu</p>
            </div>
          )}
        </div>
      )}

      {modalOrder && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-light border-0">
                <h5 className="modal-title"><i className="bi bi-file-earmark-text text-success me-2"></i>Nhập kết quả xét nghiệm</h5>
                <button type="button" className="btn-close" onClick={() => {setModalOrder(null); setResultText(''); setResultFile(null);}}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Thông tin chỉ định</label>
                  <div className="alert alert-info mb-0">
                    <div><strong>Dịch vụ:</strong> {modalOrder.dichVuId?.ten}</div>
                    <div><strong>Bệnh nhân:</strong> {modalOrder.hoSoKhamId?.benhNhanId?.hoTen}</div>
                    <div><strong>Thời gian:</strong> {new Date(modalOrder.createdAt).toLocaleString('vi-VN')}</div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold"><i className="bi bi-chat-left-dots me-2"></i>Kết quả</label>
                  <textarea className="form-control" rows={6} placeholder="Nhập kết quả chi tiết..." value={resultText} onChange={e => setResultText(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold"><i className="bi bi-file-pdf me-2"></i>Upload file kết quả (tùy chọn)</label>
                  <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setResultFile(e.target.files?.[0])} />
                  {resultFile && <small className="text-success d-block mt-1">✓ {resultFile.name}</small>}
                </div>
              </div>
              <div className="modal-footer bg-light border-0">
                <button type="button" className="btn btn-secondary" onClick={() => {setModalOrder(null); setResultText(''); setResultFile(null);}} disabled={submitting}>Hủy</button>
                <button type="button" className="btn btn-success" onClick={() => submitResult(modalOrder._id)} disabled={submitting || !resultText.trim()}>
                  {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang lưu...</> : <><i className="bi bi-check-circle me-1"></i>Lưu kết quả</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
