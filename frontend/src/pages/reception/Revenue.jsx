import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ReceptionRevenue() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRevenue = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/reception/revenue/today?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (!res.ok) throw json;
      setData(json);
    } catch (e) {
      setError(e?.message || 'Lỗi tải dữ liệu');
      toast.error('Không thể tải dữ liệu doanh thu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevenue();
  }, [date]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      'tien_mat': 'Tiền mặt',
      'momo': 'MoMo',
      'BHYT': 'BHYT'
    };
    return labels[method] || method;
  };

  const getTargetTypeLabel = (type) => {
    const labels = {
      'hosokham': 'Hồ sơ khám',
      'canlamsang': 'Cận lâm sàng',
      'donthuoc': 'Đơn thuốc',
      'lichkham': 'Lịch khám'
    };
    return labels[type] || type;
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3><i className="bi bi-bar-chart-line"></i> Doanh thu trong ngày</h3>
        <div className="d-flex gap-2">
          <input 
            type="date" 
            className="form-control" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '200px' }}
          />
          <button 
            className="btn btn-primary" 
            onClick={loadRevenue}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner-border spinner-border-sm me-2"></span>Đang tải...</>
            ) : (
              <><i className="bi bi-arrow-clockwise"></i> Tải lại</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error}
        </div>
      )}

      {data && (
        <>
          {/* Tổng quan */}
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card border-primary">
                <div className="card-body">
                  <h6 className="card-subtitle mb-2 text-muted">
                    <i className="bi bi-cash-stack"></i> Tổng doanh thu
                  </h6>
                  <h3 className="card-title text-primary mb-0">
                    {formatCurrency(data.summary.totalRevenue)}
                  </h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-success">
                <div className="card-body">
                  <h6 className="card-subtitle mb-2 text-muted">
                    <i className="bi bi-receipt"></i> Số giao dịch
                  </h6>
                  <h3 className="card-title text-success mb-0">
                    {data.summary.totalCount}
                  </h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-info">
                <div className="card-body">
                  <h6 className="card-subtitle mb-2 text-muted">
                    <i className="bi bi-graph-up"></i> Trung bình/giao dịch
                  </h6>
                  <h3 className="card-title text-info mb-0">
                    {formatCurrency(data.summary.avgTransaction)}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* Theo hình thức thanh toán */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header bg-light">
                  <h5 className="mb-0"><i className="bi bi-credit-card"></i> Theo hình thức thanh toán</h5>
                </div>
                <div className="card-body">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Hình thức</th>
                        <th className="text-end">Số GD</th>
                        <th className="text-end">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.byMethod).map(([method, stats]) => (
                        <tr key={method}>
                          <td>
                            <i className={`bi ${method === 'momo' ? 'bi-wallet2 text-danger' : method === 'tien_mat' ? 'bi-cash text-success' : 'bi-shield-check text-primary'}`}></i>
                            {' '}{getPaymentMethodLabel(method)}
                          </td>
                          <td className="text-end">{stats.count}</td>
                          <td className="text-end fw-bold">{formatCurrency(stats.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Theo loại dịch vụ */}
            <div className="col-md-6">
              <div className="card">
                <div className="card-header bg-light">
                  <h5 className="mb-0"><i className="bi bi-diagram-3"></i> Theo loại dịch vụ</h5>
                </div>
                <div className="card-body">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Loại</th>
                        <th className="text-end">Số GD</th>
                        <th className="text-end">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.byType).map(([type, stats]) => (
                        <tr key={type}>
                          <td>{getTargetTypeLabel(type)}</td>
                          <td className="text-end">{stats.count}</td>
                          <td className="text-end fw-bold">{formatCurrency(stats.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Danh sách giao dịch */}
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0"><i className="bi bi-list-ul"></i> Giao dịch gần nhất</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Bệnh nhân</th>
                      <th>Số điện thoại</th>
                      <th>Loại</th>
                      <th>Hình thức</th>
                      <th className="text-end">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          Chưa có giao dịch nào trong ngày {date}
                        </td>
                      </tr>
                    ) : (
                      data.transactions.map((t) => (
                        <tr key={t._id}>
                          <td>{formatDateTime(t.ngayThanhToan)}</td>
                          <td>{t.benhNhan?.hoTen || '-'}</td>
                          <td>{t.benhNhan?.soDienThoai || '-'}</td>
                          <td>
                            <span className="badge bg-secondary">
                              {getTargetTypeLabel(t.targetType)}
                            </span>
                          </td>
                          <td>
                            {t.hinhThuc === 'momo' && (
                              <span className="badge bg-danger">
                                <i className="bi bi-wallet2"></i> MoMo
                              </span>
                            )}
                            {t.hinhThuc === 'tien_mat' && (
                              <span className="badge bg-success">
                                <i className="bi bi-cash"></i> Tiền mặt
                              </span>
                            )}
                            {t.hinhThuc === 'BHYT' && (
                              <span className="badge bg-primary">
                                <i className="bi bi-shield-check"></i> BHYT
                              </span>
                            )}
                          </td>
                          <td className="text-end fw-bold text-success">
                            {formatCurrency(t.soTien)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
