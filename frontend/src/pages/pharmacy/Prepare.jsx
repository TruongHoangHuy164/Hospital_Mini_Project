import React, { useEffect, useState, useMemo } from 'react';
import { getPharmacyOrders, prepareOrder, dispenseOrder } from '../../api/pharmacy';

export default function PharmacyPrepare() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [day, setDay] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('paid'); // 'paid' or 'preparing'
  const [processingId, setProcessingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [paidRes, prepRes] = await Promise.all([
        getPharmacyOrders({ status: 'PAID', day }),
        getPharmacyOrders({ status: 'PREPARING', day })
      ]);
      setOrders([
        ...(paidRes.data || []).map(o => ({ ...o, _tab: 'paid' })),
        ...(prepRes.data || []).map(o => ({ ...o, _tab: 'preparing' }))
      ]);
    } catch (e) {
      setError('Không thể tải danh sách');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [day]);

  const tabOrders = useMemo(() => {
    return orders.filter(o => o._tab === activeTab);
  }, [orders, activeTab]);

  const filtered = useMemo(() => {
    if (!search) return tabOrders;
    const q = search.toLowerCase();
    return tabOrders.filter(o => 
      o.hoSoKhamId?.benhNhanId?.hoTen?.toLowerCase().includes(q) ||
      o.hoSoKhamId?.benhNhanId?.soDienThoai?.includes(q)
    );
  }, [tabOrders, search]);

  const changeDay = (offset) => {
    const d = new Date(day);
    d.setDate(d.getDate() + offset);
    setDay(d.toISOString().split('T')[0]);
  };

  const onPrepare = async (orderId) => {
    if (!confirm('Bắt đầu chuẩn bị thuốc?')) return;
    setProcessingId(orderId);
    try {
      await prepareOrder(orderId);
      await load();
      alert('Bắt đầu chuẩn bị thành công');
    } catch (e) {
      alert('Lỗi: ' + (e.response?.data?.message || e.message));
    } finally {
      setProcessingId(null);
    }
  };

  const onDispense = async (orderId) => {
    if (!confirm('Giao thuốc cho bệnh nhân?')) return;
    setProcessingId(orderId);
    try {
      await dispenseOrder(orderId);
      await load();
      alert('Giao thuốc thành công - Đơn hoàn tất');
    } catch (e) {
      alert('Lỗi: ' + (e.response?.data?.message || e.message));
    } finally {
      setProcessingId(null);
    }
  };

  const computeTotal = (o) => {
    if (!o) return 0;
    if (typeof o.tongTien === 'number' && o.tongTien > 0) return o.tongTien;
    if (Array.isArray(o.items)) {
      return o.items.reduce((sum, it) => {
        const qty = it.soLuong || 0;
        const gia = (it.thuocId && typeof it.thuocId.gia === 'number') ? it.thuocId.gia : 0;
        return sum + gia * qty;
      }, 0);
    }
    return 0;
  };

  return (
    <div className="container py-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0"><i className="bi bi-box"></i> Chuẩn bị và Giao thuốc</h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => load()} disabled={loading}>
          <i className="bi bi-arrow-clockwise"></i> Làm mới
        </button>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {/* Filter Controls */}
      <div className="row g-2 mb-3">
        <div className="col-md-6">
          <div className="input-group input-group-sm">
            <button className="btn btn-outline-secondary" onClick={() => changeDay(-1)}>← Hôm trước</button>
            <input type="date" className="form-control" value={day} onChange={(e) => setDay(e.target.value)} />
            <button className="btn btn-outline-secondary" onClick={() => changeDay(1)}>Hôm sau →</button>
            {day !== today && <button className="btn btn-outline-primary" onClick={() => setDay(today)}>Hôm nay</button>}
          </div>
        </div>
        <div className="col-md-6">
          <input 
            type="text" 
            className="form-control form-control-sm" 
            placeholder="Tìm bệnh nhân..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'paid' ? 'active' : ''}`}
            onClick={() => setActiveTab('paid')}
          >
            <i className="bi bi-credit-card"></i> Đã thanh toán 
            <span className="badge bg-secondary ms-2">
              {orders.filter(o => o._tab === 'paid').length}
            </span>
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'preparing' ? 'active' : ''}`}
            onClick={() => setActiveTab('preparing')}
          >
            <i className="bi bi-box"></i> Đang chuẩn bị 
            <span className="badge bg-primary ms-2">
              {orders.filter(o => o._tab === 'preparing').length}
            </span>
          </button>
        </li>
      </ul>

      {/* Orders Table */}
      <div className="table-responsive shadow-sm border rounded">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Bệnh nhân</th>
              <th>SĐT</th>
              <th>Bác sĩ</th>
              <th>Số thuốc</th>
              <th>Ngày kê</th>
              <th style={{ width: 220 }} className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-4">Đang tải...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={7} className="text-center py-4">
              {activeTab === 'paid' ? 'Không có đơn chờ chuẩn bị' : 'Không có đơn đang chuẩn bị'}
            </td></tr>}
            {!loading && filtered.map((o, idx) => (
              <React.Fragment key={o._id}>
              <tr>
                <td>{idx + 1}</td>
                <td className="fw-semibold">{o.hoSoKhamId?.benhNhanId?.hoTen || '-'}</td>
                <td className="text-muted">{o.hoSoKhamId?.benhNhanId?.soDienThoai || '-'}</td>
                <td>{o.hoSoKhamId?.bacSiId?.hoTen || '-'}</td>
                <td><span className="badge bg-secondary">{o.items?.length || 0}</span></td>
                <td className="text-muted small">{new Date(o.ngayKeDon).toLocaleDateString('vi-VN')}</td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-outline-secondary me-1"
                    onClick={() => setExpandedId(expandedId === o._id ? null : o._id)}
                  >
                    <i className="bi bi-info-circle"></i> {expandedId === o._id ? 'Ẩn' : 'Chi tiết'}
                  </button>
                  {activeTab === 'paid' ? (
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => onPrepare(o._id)}
                      disabled={processingId === o._id}
                    >
                      {processingId === o._id ? 'Đang...' : <><i className="bi bi-box"></i> Chuẩn bị</>}
                    </button>
                  ) : (
                    <button 
                      className="btn btn-sm btn-success"
                      onClick={() => onDispense(o._id)}
                      disabled={processingId === o._id}
                    >
                      {processingId === o._id ? 'Đang...' : <><i className="bi bi-check-circle"></i> Giao thuốc</>}
                    </button>
                  )}
                </td>
              </tr>
              {expandedId === o._id && (
                <tr className="bg-light">
                  <td colSpan={7}>
                    <div className="p-2">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-semibold">Chi tiết thuốc ({o.items?.length || 0})</span>
                        <span className="text-danger small">Tổng: {computeTotal(o).toLocaleString('vi-VN')} đ</span>
                      </div>
                      {(!o.items || o.items.length === 0) && <div className="text-muted">Không có dữ liệu thuốc.</div>}
                      {Array.isArray(o.items) && o.items.length > 0 && (
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Tên thuốc</th>
                                <th>Số lượng</th>
                                <th>Sáng</th>
                                <th>Trưa</th>
                                <th>Chiều</th>
                                <th>Ngày dùng</th>
                                <th>Ghi chú</th>
                                <th>Giá</th>
                                <th>Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.items.map((it, iIdx) => {
                                const gia = (it.thuocId && typeof it.thuocId.gia === 'number') ? it.thuocId.gia : 0;
                                const qty = it.soLuong || 0;
                                return (
                                  <tr key={iIdx}>
                                    <td>{iIdx + 1}</td>
                                    <td>{it.tenThuoc || it.thuocId?.ten_san_pham || '-'}</td>
                                    <td>{qty}</td>
                                    <td>{it.dosageMorning || 0}</td>
                                    <td>{it.dosageNoon || 0}</td>
                                    <td>{it.dosageEvening || 0}</td>
                                    <td>{it.days || 0}</td>
                                    <td className="small">{it.usageNote || '-'}</td>
                                    <td>{gia.toLocaleString('vi-VN')} đ</td>
                                    <td>{(gia * qty).toLocaleString('vi-VN')} đ</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr>
                                <th colSpan={9} className="text-end">Tổng</th>
                                <th className="text-danger">{computeTotal(o).toLocaleString('vi-VN')} đ</th>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-muted small mt-3">
        <strong>{activeTab === 'paid' ? 'Chờ chuẩn bị:' : 'Đang chuẩn bị:'}</strong> {filtered.length} đơn
      </div>
    </div>
  );
}
