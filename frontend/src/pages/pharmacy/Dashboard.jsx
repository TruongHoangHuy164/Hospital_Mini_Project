import React, { useEffect, useState } from 'react';
import { getPharmacyStats, getPharmacyOrders } from '../../api/pharmacy';

export default function PharmacyDashboard() {
  const [stats, setStats] = useState({ waiting: 0, paid: 0, preparing: 0, completed: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        getPharmacyStats({ date: today }),
        getPharmacyOrders({ day: today })
      ]);
      setStats(statsRes.data || { waiting: 0, paid: 0, preparing: 0, completed: 0 });
      setRecentOrders((ordersRes.data || []).slice(0, 10));
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statusBadgeMap = {
    'issued': { bg: 'warning', text: 'Chờ thanh toán' },
    'pending_pharmacy': { bg: 'info', text: 'Đã thanh toán' },
    'dispensing': { bg: 'primary', text: 'Đang chuẩn bị' },
    'dispensed': { bg: 'success', text: 'Hoàn tất' }
  };

  return (
    <div className="container py-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0"><i className="bi bi-capsule"></i> Bảng điều khiển Nhà thuốc</h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>
          <i className="bi bi-arrow-clockwise"></i> Làm mới
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-warning bg-opacity-10 h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <i className="bi bi-hourglass-split fs-3 text-warning"></i>
                </div>
                <div>
                  <small className="text-muted d-block">Chờ thanh toán</small>
                  <h5 className="mb-0 fw-bold text-warning">{stats.waiting || 0}</h5>
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
                  <i className="bi bi-credit-card fs-3 text-info"></i>
                </div>
                <div>
                  <small className="text-muted d-block">Đã thanh toán</small>
                  <h5 className="mb-0 fw-bold text-info">{stats.paid || 0}</h5>
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
                  <i className="bi bi-box fs-3 text-primary"></i>
                </div>
                <div>
                  <small className="text-muted d-block">Đang chuẩn bị</small>
                  <h5 className="mb-0 fw-bold text-primary">{stats.preparing || 0}</h5>
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
                  <small className="text-muted d-block">Hoàn tất</small>
                  <h5 className="mb-0 fw-bold text-success">{stats.completed || 0}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-light border-bottom">
          <h6 className="m-0">Đơn thuốc gần đây hôm nay</h6>
        </div>
        <div className="card-body p-0">
          {loading && <div className="p-3 text-center text-muted">Đang tải...</div>}
          {!loading && recentOrders.length === 0 && <div className="p-3 text-center text-muted">Không có đơn</div>}
          {!loading && recentOrders.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Bệnh nhân</th>
                    <th>SĐT</th>
                    <th>Bác sĩ</th>
                    <th>Trạng thái</th>
                    <th>Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o, idx) => {
                    const badgeInfo = statusBadgeMap[o.status] || { bg: 'secondary', text: o.status };
                    return (
                      <tr key={o._id}>
                        <td>{idx + 1}</td>
                        <td className="fw-semibold">{o.hoSoKhamId?.benhNhanId?.hoTen || '-'}</td>
                        <td className="text-muted">{o.hoSoKhamId?.benhNhanId?.soDienThoai || '-'}</td>
                        <td>{o.hoSoKhamId?.bacSiId?.hoTen || '-'}</td>
                        <td><span className={`badge bg-${badgeInfo.bg}`}>{badgeInfo.text}</span></td>
                        <td className="text-muted small">{new Date(o.ngayKeDon).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Info */}
      <div className="alert alert-primary mt-4 mb-0">
        <strong>Quy trình công việc:</strong>
        <div className="mt-2 small">
          <div>1. <strong>Chờ thanh toán:</strong> Xem danh sách đơn, kiểm tra và thu tiền</div>
          <div>2. <strong>Đã thanh toán:</strong> Chuẩn bị thuốc</div>
          <div>3. <strong>Đang chuẩn bị:</strong> Giao thuốc cho bệnh nhân</div>
          <div>4. <strong>Hoàn tất:</strong> Cập nhật hồ sơ - Xong</div>
        </div>
      </div>
    </div>
  );
}
