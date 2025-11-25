import React, { useEffect, useState, useMemo } from 'react';
import { getPharmacyOrders, payOrder } from '../../api/pharmacy';

export default function PharmacyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [day, setDay] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [payingId, setPayingId] = useState(null);

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

  const onPay = async (orderId) => {
    const order = orders.find(o => o._id === orderId);
    if (!order) return;
    
    const amount = prompt(`Nhập số tiền thanh toán cho đơn ${order.hoSoKhamId?.benhNhanId?.hoTen}:`, '0');
    if (amount === null) return;
    
    setPayingId(orderId);
    try {
      await payOrder(orderId, { amount: Number(amount) });
      await load();
      alert('Đã thu tiền thành công');
    } catch (e) {
      alert('Lỗi: ' + (e.response?.data?.message || e.message));
    } finally {
      setPayingId(null);
    }
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
              <th>Ngày kê</th>
              <th style={{ width: 150 }} className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-4">Đang tải...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={7} className="text-center py-4">Không có đơn chờ thanh toán</td></tr>}
            {!loading && filtered.map((o, idx) => (
              <tr key={o._id}>
                <td>{idx + 1}</td>
                <td className="fw-semibold">{o.hoSoKhamId?.benhNhanId?.hoTen || '-'}</td>
                <td className="text-muted">{o.hoSoKhamId?.benhNhanId?.soDienThoai || '-'}</td>
                <td>{o.hoSoKhamId?.bacSiId?.hoTen || '-'}</td>
                <td><span className="badge bg-secondary">{o.items?.length || 0}</span></td>
                <td className="text-muted small">{new Date(o.ngayKeDon).toLocaleDateString('vi-VN')}</td>
                <td className="text-end">
                  <button 
                    className="btn btn-sm btn-success"
                    onClick={() => onPay(o._id)}
                    disabled={payingId === o._id}
                  >
                    {payingId === o._id ? 'Đang...' : <><i className="bi bi-credit-card"></i> Thu tiền</>}
                  </button>
                </td>
              </tr>
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
