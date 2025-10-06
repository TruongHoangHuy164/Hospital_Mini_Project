import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ChangeAppointmentManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(''); // 'approve' or 'reject'
  const [processForm, setProcessForm] = useState({
    ghiChuXuLy: '',
    lyDoTuChoi: ''
  });

  const getHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchRequests = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/change-appointment/pending?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
        { headers: getHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách yêu cầu');
      }
      
      const data = await response.json();
      setRequests(data.requests);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (error) {
      console.error('Lỗi tải danh sách yêu cầu:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRequests(1, searchTerm);
  };

  const openProcessModal = (request, action) => {
    setSelectedRequest(request);
    setModalAction(action);
    setProcessForm({ ghiChuXuLy: '', lyDoTuChoi: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setModalAction('');
    setProcessForm({ ghiChuXuLy: '', lyDoTuChoi: '' });
  };

  const handleProcessRequest = async (e) => {
    e.preventDefault();
    
    if (!selectedRequest) return;
    
    const requestId = selectedRequest._id;
    setProcessing(prev => ({ ...prev, [requestId]: true }));
    
    try {
      const requestData = {
        trangThai: modalAction === 'approve' ? 'da_duyet' : 'tu_choi',
        ghiChuXuLy: processForm.ghiChuXuLy,
        lyDoTuChoi: modalAction === 'reject' ? processForm.lyDoTuChoi : ''
      };
      
      const response = await fetch(`${API_URL}/api/change-appointment/process/${requestId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra');
      }
      
      toast.success(data.message);
      closeModal();
      fetchRequests(currentPage, searchTerm);
      
    } catch (error) {
      console.error('Lỗi xử lý yêu cầu:', error);
      toast.error(error.message);
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: false }));
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const calculateAge = (birthDate) => {
    return new Date().getFullYear() - new Date(birthDate).getFullYear();
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
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>
          <i className="bi bi-calendar-check me-2"></i>
          Quản lý yêu cầu thay đổi lịch hẹn
        </h3>
        <div className="badge bg-warning fs-6">
          {requests.length} yêu cầu chờ duyệt
        </div>
      </div>

      {/* Search form */}
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch} className="row g-3">
            <div className="col-md-10">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo tên bệnh nhân, mã hồ sơ, CCCD..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-primary w-100">
                <i className="bi bi-search me-2"></i>
                Tìm kiếm
              </button>
            </div>
          </form>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-calendar-check display-1 text-muted"></i>
          <h4 className="mt-3 text-muted">Không có yêu cầu nào</h4>
          <p className="text-muted">Hiện tại không có yêu cầu thay đổi lịch hẹn nào cần xử lý.</p>
        </div>
      ) : (
        <>
          <div className="row">
            {requests.map((request) => (
              <div key={request._id} className="col-xl-6 mb-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-header">
                    <div className="row align-items-center">
                      <div className="col">
                        <h6 className="mb-0">
                          <i className="bi bi-person-circle me-2"></i>
                          {request.tenBenhNhan}
                        </h6>
                        <small className="text-muted">
                          Tuổi: {request.tuoi} | CCCD: {request.cccd}
                        </small>
                      </div>
                      <div className="col-auto">
                        <span className="badge bg-warning">Chờ duyệt</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-body">
                    {/* Thông tin bệnh nhân */}
                    <div className="mb-3">
                      <h6 className="text-primary mb-2">
                        <i className="bi bi-file-medical me-2"></i>
                        Thông tin bệnh nhân
                      </h6>
                      <div className="row">
                        <div className="col-md-6">
                          <p className="mb-1"><strong>Mã hồ sơ:</strong> {request.maHoSo}</p>
                          <p className="mb-1"><strong>Địa chỉ:</strong> {request.diaChi}</p>
                        </div>
                        <div className="col-md-6">
                          <p className="mb-1"><strong>Email:</strong> {request.userId?.email}</p>
                          <p className="mb-1"><strong>SĐT:</strong> {request.userId?.soDienThoai}</p>
                        </div>
                      </div>
                    </div>

                    <hr />

                    {/* So sánh lịch cũ và mới */}
                    <div className="row">
                      <div className="col-md-6">
                        <h6 className="text-danger mb-2">
                          <i className="bi bi-calendar-minus me-2"></i>
                          Lịch hiện tại
                        </h6>
                        <p className="mb-1">
                          <strong>Ngày:</strong> {new Date(request.ngayHenCu).toLocaleDateString('vi-VN')}
                        </p>
                        <p className="mb-1">
                          <strong>Giờ:</strong> {request.gioHenCu}
                        </p>
                        <p className="mb-1">
                          <strong>Bác sĩ:</strong> {request.bacSiCu?.hoTen || 'N/A'}
                        </p>
                        <p className="mb-0">
                          <strong>Chuyên khoa:</strong> {request.chuyenKhoaCu?.ten || 'N/A'}
                        </p>
                      </div>
                      
                      <div className="col-md-6">
                        <h6 className="text-success mb-2">
                          <i className="bi bi-calendar-plus me-2"></i>
                          Lịch mới (yêu cầu)
                        </h6>
                        <p className="mb-1">
                          <strong>Ngày:</strong> {new Date(request.ngayHenMoi).toLocaleDateString('vi-VN')}
                        </p>
                        <p className="mb-1">
                          <strong>Giờ:</strong> {request.gioHenMoi}
                        </p>
                        <p className="mb-1">
                          <strong>Bác sĩ:</strong> {request.bacSiMoi?.hoTen || 'N/A'}
                        </p>
                        <p className="mb-0">
                          <strong>Chuyên khoa:</strong> {request.chuyenKhoaMoi?.ten}
                        </p>
                      </div>
                    </div>

                    <hr />

                    {/* Lý do và thông tin khác */}
                    <div className="mb-3">
                      <h6 className="text-muted mb-2">
                        <i className="bi bi-chat-left-text me-2"></i>
                        Lý do thay đổi
                      </h6>
                      <p className="mb-2">
                        <strong>{request.lyDoThayDoi}</strong>
                      </p>
                      {request.lyDoKhac && (
                        <p className="text-muted mb-0 fst-italic">"{request.lyDoKhac}"</p>
                      )}
                    </div>

                    {/* Thống kê */}
                    <div className="alert alert-info">
                      <small>
                        <i className="bi bi-info-circle me-2"></i>
                        <strong>Thống kê:</strong> 
                        Đã đổi lịch {request.kiemTraKhaThi.soLanDoiLich}/3 lần trong tháng | 
                        Báo trước {request.kiemTraKhaThi.thoiGianBaoTruoc} giờ
                      </small>
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        Gửi lúc: {new Date(request.ngayTao).toLocaleString('vi-VN')}
                      </small>
                      
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => openProcessModal(request, 'approve')}
                          disabled={processing[request._id]}
                        >
                          <i className="bi bi-check-lg me-1"></i>
                          Duyệt
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => openProcessModal(request, 'reject')}
                          disabled={processing[request._id]}
                        >
                          <i className="bi bi-x-lg me-1"></i>
                          Từ chối
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Page navigation">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => fetchRequests(currentPage - 1, searchTerm)}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </button>
                </li>
                
                {[...Array(totalPages)].map((_, index) => (
                  <li key={index + 1} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => fetchRequests(index + 1, searchTerm)}
                    >
                      {index + 1}
                    </button>
                  </li>
                ))}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => fetchRequests(currentPage + 1, searchTerm)}
                    disabled={currentPage === totalPages}
                  >
                    Sau
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}

      {/* Modal xử lý yêu cầu */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modalAction === 'approve' ? (
                    <><i className="bi bi-check-circle text-success me-2"></i>Duyệt yêu cầu</>
                  ) : (
                    <><i className="bi bi-x-circle text-danger me-2"></i>Từ chối yêu cầu</>
                  )}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              
              <form onSubmit={handleProcessRequest}>
                <div className="modal-body">
                  {selectedRequest && (
                    <div className="mb-3">
                      <h6>Thông tin yêu cầu:</h6>
                      <p><strong>Bệnh nhân:</strong> {selectedRequest.tenBenhNhan}</p>
                      <p><strong>Từ:</strong> {new Date(selectedRequest.ngayHenCu).toLocaleDateString('vi-VN')} {selectedRequest.gioHenCu}</p>
                      <p><strong>Sang:</strong> {new Date(selectedRequest.ngayHenMoi).toLocaleDateString('vi-VN')} {selectedRequest.gioHenMoi}</p>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label htmlFor="ghiChuXuLy" className="form-label">Ghi chú xử lý</label>
                    <textarea
                      className="form-control"
                      id="ghiChuXuLy"
                      rows="3"
                      value={processForm.ghiChuXuLy}
                      onChange={(e) => setProcessForm(prev => ({ ...prev, ghiChuXuLy: e.target.value }))}
                      placeholder="Nhập ghi chú về việc xử lý yêu cầu này..."
                    />
                  </div>
                  
                  {modalAction === 'reject' && (
                    <div className="mb-3">
                      <label htmlFor="lyDoTuChoi" className="form-label">
                        Lý do từ chối <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        id="lyDoTuChoi"
                        rows="3"
                        value={processForm.lyDoTuChoi}
                        onChange={(e) => setProcessForm(prev => ({ ...prev, lyDoTuChoi: e.target.value }))}
                        placeholder="Nhập lý do tại sao từ chối yêu cầu này..."
                        required
                      />
                    </div>
                  )}
                </div>
                
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className={`btn ${modalAction === 'approve' ? 'btn-success' : 'btn-danger'}`}
                    disabled={processing[selectedRequest?._id]}
                  >
                    {processing[selectedRequest?._id] ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Đang xử lý...
                      </>
                    ) : (
                      modalAction === 'approve' ? 'Duyệt yêu cầu' : 'Từ chối yêu cầu'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}