import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ChangeAppointmentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/change-appointment/my-requests`, {
        headers: getHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách yêu cầu');
      }
      
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Lỗi tải danh sách yêu cầu:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!confirm('Bạn có chắc chắn muốn hủy yêu cầu này?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/change-appointment/${requestId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Không thể hủy yêu cầu');
      }
      
      toast.success('Đã hủy yêu cầu thành công');
      fetchRequests();
    } catch (error) {
      console.error('Lỗi hủy yêu cầu:', error);
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'cho_duyet':
        return <span className="badge bg-warning">Chờ duyệt</span>;
      case 'da_duyet':
        return <span className="badge bg-success">Đã duyệt</span>;
      case 'tu_choi':
        return <span className="badge bg-danger">Từ chối</span>;
      case 'huy':
        return <span className="badge bg-secondary">Đã hủy</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'cho_duyet':
        return 'bi-clock-history text-warning';
      case 'da_duyet':
        return 'bi-check-circle text-success';
      case 'tu_choi':
        return 'bi-x-circle text-danger';
      case 'huy':
        return 'bi-dash-circle text-secondary';
      default:
        return 'bi-question-circle text-muted';
    }
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Đang tải danh sách yêu cầu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>
          <i className="bi bi-calendar-week me-2"></i>
          Yêu cầu thay đổi lịch hẹn
        </h3>
        <Link to="/booking/history" className="btn btn-outline-primary">
          <i className="bi bi-arrow-left me-2"></i>
          Quay lại lịch sử
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-calendar-x display-1 text-muted"></i>
          <h4 className="mt-3 text-muted">Chưa có yêu cầu nào</h4>
          <p className="text-muted">Bạn chưa gửi yêu cầu thay đổi lịch hẹn nào.</p>
          <Link to="/booking/history" className="btn btn-primary">
            <i className="bi bi-calendar-plus me-2"></i>
            Xem lịch hẹn
          </Link>
        </div>
      ) : (
        <div className="row">
          {requests.map((request) => (
            <div key={request._id} className="col-lg-6 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-0">
                      <i className={`bi ${getStatusIcon(request.trangThai)} me-2`}></i>
                      {request.tenBenhNhan}
                    </h6>
                    <small className="text-muted">Mã HS: {request.maHoSo}</small>
                  </div>
                  {getStatusBadge(request.trangThai)}
                </div>
                
                <div className="card-body">
                  {/* Thông tin lịch cũ */}
                  <div className="mb-3">
                    <h6 className="text-muted mb-2">
                      <i className="bi bi-calendar-minus me-2"></i>
                      Lịch hẹn hiện tại
                    </h6>
                    <p className="mb-1">
                      <strong>Ngày:</strong> {new Date(request.ngayHenCu).toLocaleDateString('vi-VN')}
                    </p>
                    <p className="mb-1">
                      <strong>Giờ:</strong> {request.gioHenCu}
                    </p>
                    <p className="mb-1">
                      <strong>Bác sĩ:</strong> {request.bacSiCu?.ten}
                    </p>
                    <p className="mb-0">
                      <strong>Chuyên khoa:</strong> {request.chuyenKhoaCu?.ten}
                    </p>
                  </div>

                  <hr />

                  {/* Thông tin lịch mới */}
                  <div className="mb-3">
                    <h6 className="text-success mb-2">
                      <i className="bi bi-calendar-plus me-2"></i>
                      Lịch hẹn mới (yêu cầu)
                    </h6>
                    <p className="mb-1">
                      <strong>Ngày:</strong> {new Date(request.ngayHenMoi).toLocaleDateString('vi-VN')}
                    </p>
                    <p className="mb-1">
                      <strong>Giờ:</strong> {request.gioHenMoi}
                    </p>
                    <p className="mb-1">
                      <strong>Bác sĩ:</strong> {request.bacSiMoi?.ten}
                    </p>
                    <p className="mb-0">
                      <strong>Chuyên khoa:</strong> {request.chuyenKhoaMoi?.ten}
                    </p>
                  </div>

                  {/* Lý do thay đổi */}
                  <div className="mb-3">
                    <h6 className="text-muted mb-2">
                      <i className="bi bi-chat-left-text me-2"></i>
                      Lý do thay đổi
                    </h6>
                    <p className="mb-0">
                      <strong>{request.lyDoThayDoi}</strong>
                      {request.lyDoKhac && (
                        <><br /><em>{request.lyDoKhac}</em></>
                      )}
                    </p>
                  </div>

                  {/* Thông tin xử lý */}
                  {request.trangThai !== 'cho_duyet' && (
                    <div className="mb-3">
                      <h6 className="text-muted mb-2">
                        <i className="bi bi-person-check me-2"></i>
                        Thông tin xử lý
                      </h6>
                      {request.nguoiXuLy && (
                        <p className="mb-1">
                          <strong>Người xử lý:</strong> {request.nguoiXuLy.ten}
                        </p>
                      )}
                      {request.ngayXuLy && (
                        <p className="mb-1">
                          <strong>Ngày xử lý:</strong> {new Date(request.ngayXuLy).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                      {request.ghiChuXuLy && (
                        <p className="mb-1">
                          <strong>Ghi chú:</strong> {request.ghiChuXuLy}
                        </p>
                      )}
                      {request.lyDoTuChoi && (
                        <p className="mb-0 text-danger">
                          <strong>Lý do từ chối:</strong> {request.lyDoTuChoi}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      Gửi lúc: {new Date(request.ngayTao).toLocaleDateString('vi-VN')} {new Date(request.ngayTao).toLocaleTimeString('vi-VN')}
                    </small>
                    
                    {request.trangThai === 'cho_duyet' && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleCancelRequest(request._id)}
                      >
                        <i className="bi bi-x-lg me-1"></i>
                        Hủy yêu cầu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}