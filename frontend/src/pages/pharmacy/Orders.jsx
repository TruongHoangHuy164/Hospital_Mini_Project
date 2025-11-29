import React, { useEffect, useState, useMemo } from 'react';
import { getPharmacyOrders, payOrder } from '../../api/pharmacy';
import { privateApi } from '../../api/axios';

export default function PharmacyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [day, setDay] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [payingId, setPayingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPharmacyOrders({ status: 'WAITING_FOR_MEDICINE', day });
      setOrders(res.data || []);
    } catch (e) {
      setError('Không thể tải danh sách đơn');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [day]);

  const filtered = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(o => 
      o.hoSoKhamId?.benhNhanId?.hoTen?.toLowerCase().includes(q) ||
      o.hoSoKhamId?.benhNhanId?.soDienThoai?.includes(q)
    );
  }, [orders, search]);

  const changeDay = (offset) => {
    const d = new Date(day);
    d.setDate(d.getDate() + offset);
    setDay(d.toISOString().split('T')[0]);
  };

  const computeTotal = (o) => {
    if (!o) return 0;
    if (typeof o.tongTien === 'number' && o.tongTien > 0) return o.tongTien;
    const direct = o.totalAmount || o.amount;
    if (typeof direct === 'number' && direct > 0) return direct;
    if (Array.isArray(o.items)) {
      return o.items.reduce((sum, it) => {
        const qty = it.soLuong || it.quantity || 0;
        const price = (it.thuocId && typeof it.thuocId.gia === 'number') ? it.thuocId.gia : (it.giaBan || it.price || it.unitPrice || 0);
        return sum + qty * price;
      }, 0);
    }
    return 0;
  };

  const onPay = async (orderId) => {
    const order = orders.find(o => o._id === orderId);
    if (!order) return;
    const amount = computeTotal(order);
    if (!Number.isFinite(amount) || amount <= 0) { alert('Không xác định được số tiền (>0)'); return; }
    setPayingId(orderId);
    try {
      await privateApi.post(`/payments/prescription/${orderId}/cash`, { amount });
      await load();
      alert('Đã thu tiền mặt thành công');
    } catch (e) {
      alert('Lỗi: ' + (e.response?.data?.error || e.message));
    } finally { setPayingId(null); }
  };

  const onPayMomo = async (orderId) => {
    const order = orders.find(o => o._id === orderId);
    if (!order) return;
    const amount = computeTotal(order);
    if (!Number.isFinite(amount) || amount <= 0) { alert('Không xác định được số tiền (>0)'); return; }
    setPayingId(orderId);
    try {
      const resp = await privateApi.post(`/payments/prescription/${orderId}/momo`, { amount });
      const payUrl = resp.data?.momo?.payUrl || resp.data?.momo?.deeplink || null;
      await load();
      if (payUrl) {
        window.open(payUrl, '_blank');
      } else {
        alert('Đã tạo yêu cầu MoMo. Vui lòng kiểm tra trạng thái.');
      }
    } catch (e) {
      alert('Lỗi: ' + (e.response?.data?.error || e.message));
    } finally { setPayingId(null); }
  };

  return (
    <div className="container py-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0"><i className="bi bi-receipt"></i> Thu tiền thuốc (Chờ thanh toán)</h4>
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
              <th>Số tiền</th>
              <th>Ngày kê</th>
              <th style={{ width: 150 }} className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="text-center py-4">Đang tải...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} className="text-center py-4">Không có đơn chờ thanh toán</td></tr>}
            {!loading && filtered.map((o, idx) => (
              <React.Fragment key={o._id}>
              <tr>
                <td>{idx + 1}</td>
                <td className="fw-semibold">{o.hoSoKhamId?.benhNhanId?.hoTen || '-'}</td>
                <td className="text-muted">{o.hoSoKhamId?.benhNhanId?.soDienThoai || '-'}</td>
                <td>{o.hoSoKhamId?.bacSiId?.hoTen || '-'}</td>
                <td><span className="badge bg-secondary">{o.items?.length || 0}</span></td>
                <td className="fw-semibold text-danger">{computeTotal(o).toLocaleString('vi-VN')} đ</td>
                <td className="text-muted small">{new Date(o.ngayKeDon).toLocaleDateString('vi-VN')}</td>
                <td className="text-end d-flex flex-column gap-1">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setExpandedId(expandedId === o._id ? null : o._id)}
                  >
                    <i className="bi bi-info-circle"></i> {expandedId === o._id ? 'Ẩn' : 'Chi tiết'}
                  </button>
                  <button 
                    className="btn btn-sm btn-success"
                    onClick={() => onPay(o._id)}
                    disabled={payingId === o._id || computeTotal(o) <= 0}
                    title="Thanh toán tiền mặt"
                  >
                    {payingId === o._id ? '...' : <><i className="bi bi-cash-coin"></i> Tiền mặt ({computeTotal(o).toLocaleString('vi-VN')} đ)</>}
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => onPayMomo(o._id)}
                    disabled={payingId === o._id || computeTotal(o) <= 0}
                    title="Thanh toán MoMo"
                  >
                    {payingId === o._id ? '...' : <><i className="bi bi-phone"></i> MoMo ({computeTotal(o).toLocaleString('vi-VN')} đ)</>}
                  </button>
                </td>
              </tr>
              {expandedId === o._id && (
                <tr className="bg-light">
                  <td colSpan={8}>
                    <div className="p-2">
                      <div className="fw-semibold mb-2">Chi tiết thuốc ({o.items?.length || 0})</div>
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
        Tổng: <strong>{filtered.length}</strong> đơn chờ thanh toán
      </div>
    </div>
  );
}
