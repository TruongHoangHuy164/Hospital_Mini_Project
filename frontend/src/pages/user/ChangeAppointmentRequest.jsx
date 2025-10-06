import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ChangeAppointmentRequest() {
  const navigate = useNavigate();
  const { appointmentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingAppointment, setLoadingAppointment] = useState(true);
  const [appointmentInfo, setAppointmentInfo] = useState(null);
  const [conditions, setConditions] = useState(null);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    ngayHenMoi: '',
    gioHenMoi: '',
    bacSiMoi: '',
    chuyenKhoaMoi: '',
    lyDoThayDoi: '',
    lyDoKhac: ''
  });

  // Danh sách lý do phổ biến
  const commonReasons = [
    'Bận việc đột xuất',
    'Thay đổi lịch làm việc',
    'Vấn đề sức khỏe khẩn cấp',
    'Điều kiện thời tiết xấu',
    'Vấn đề gia đình',
    'Khác'
  ];

  // Danh sách khung giờ khám
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30'
  ];

  const getHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Lấy thông tin lịch hẹn hiện tại
  useEffect(() => {
    const fetchAppointmentInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/api/change-appointment/appointment/${appointmentId}`, {
          headers: getHeaders()
        });
        
        if (!response.ok) {
          throw new Error('Không thể tải thông tin lịch hẹn');
        }
        
        const data = await response.json();
        setAppointmentInfo(data.lichHen);
        setConditions(data.dieuKien);
        
        // Khởi tạo form với thông tin hiện tại
        setFormData(prev => ({
          ...prev,
          bacSiMoi: data.lichHen.bacSiId._id,
          chuyenKhoaMoi: data.lichHen.chuyenKhoaId._id
        }));
        
      } catch (error) {
        console.error('Lỗi tải thông tin lịch hẹn:', error);
        toast.error(error.message);
        navigate('/booking/history');
      } finally {
        setLoadingAppointment(false);
      }
    };

    if (appointmentId) {
      fetchAppointmentInfo();
    }
  }, [appointmentId, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Xóa lỗi khi user bắt đầu nhập
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.ngayHenMoi) {
      newErrors.ngayHenMoi = 'Vui lòng chọn ngày hẹn mới';
    } else {
      const selectedDate = new Date(formData.ngayHenMoi);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate <= today) {
        newErrors.ngayHenMoi = 'Ngày hẹn mới phải sau ngày hôm nay';
      }
    }
    
    if (!formData.gioHenMoi) {
      newErrors.gioHenMoi = 'Vui lòng chọn giờ hẹn mới';
    }
    
    if (!formData.lyDoThayDoi) {
      newErrors.lyDoThayDoi = 'Vui lòng chọn lý do thay đổi';
    }
    
    if (formData.lyDoThayDoi === 'Khác' && !formData.lyDoKhac.trim()) {
      newErrors.lyDoKhac = 'Vui lòng nhập lý do cụ thể';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const requestData = {
        lichHenCuId: appointmentId,
        ngayHenMoi: formData.ngayHenMoi,
        gioHenMoi: formData.gioHenMoi,
        bacSiMoi: formData.bacSiMoi,
        chuyenKhoaMoi: formData.chuyenKhoaMoi,
        lyDoThayDoi: formData.lyDoThayDoi,
        lyDoKhac: formData.lyDoKhac
      };
      
      const response = await fetch(`${API_URL}/api/change-appointment/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra');
      }
      
      toast.success('Yêu cầu thay đổi lịch hẹn đã được gửi thành công!');
      navigate('/user/change-appointment-requests');
      
    } catch (error) {
      console.error('Lỗi gửi yêu cầu:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi gửi yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  if (loadingAppointment) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Đang tải thông tin lịch hẹn...</p>
        </div>
      </div>
    );
  }

  if (!appointmentInfo) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">
          Không tìm thấy thông tin lịch hẹn
        </div>
      </div>
    );
  }

  // Kiểm tra điều kiện có thể thay đổi
  if (!conditions?.canChange) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">
          <h5>Không thể thay đổi lịch hẹn</h5>
          <p>Lịch hẹn này đã qua hoặc không đủ điều kiện để thay đổi.</p>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/booking/history')}
          >
            Quay lại lịch sử
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header">
              <h4 className="mb-0">
                <i className="bi bi-calendar-check me-2"></i>
                Yêu cầu thay đổi lịch hẹn khám
              </h4>
            </div>
            
            <div className="card-body">
              {/* Thông tin lịch hẹn hiện tại */}
              <div className="alert alert-info">
                <h6><i className="bi bi-info-circle me-2"></i>Thông tin lịch hẹn hiện tại</h6>
                <div className="row">
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Bệnh nhân:</strong> {appointmentInfo?.hoSoBenhNhanId?.ten || 'N/A'}</p>
                    <p className="mb-1"><strong>Mã hồ sơ:</strong> {appointmentInfo?.hoSoBenhNhanId?.maHoSo || 'N/A'}</p>
                    <p className="mb-1"><strong>CCCD:</strong> {appointmentInfo?.hoSoBenhNhanId?.cccd || 'N/A'}</p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1"><strong>Ngày khám:</strong> {appointmentInfo?.ngayKham ? new Date(appointmentInfo.ngayKham).toLocaleDateString('vi-VN') : 'N/A'}</p>
                    <p className="mb-1"><strong>Giờ khám:</strong> {appointmentInfo?.khungGio || 'N/A'}</p>
                    <p className="mb-1"><strong>Bác sĩ:</strong> {appointmentInfo?.bacSiId?.hoTen || 'N/A'}</p>
                    <p className="mb-1"><strong>Chuyên khoa:</strong> {appointmentInfo?.chuyenKhoaId?.ten || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Cảnh báo về quy định */}
              <div className="alert alert-warning">
                <h6><i className="bi bi-exclamation-triangle me-2"></i>Lưu ý quan trọng</h6>
                <ul className="mb-0">
                  <li>Bạn đã sử dụng <strong>{conditions.requestsThisMonth}/{conditions.maxRequestsPerMonth}</strong> lần đổi lịch trong tháng này</li>
                  <li>Phải báo trước ít nhất <strong>{conditions.minHoursNotice} giờ</strong> (hiện tại còn <strong>{conditions.hoursDiff} giờ</strong>)</li>
                  <li>Yêu cầu sẽ được lễ tân xem xét và phê duyệt</li>
                  <li>Bạn sẽ nhận được thông báo kết quả qua email</li>
                </ul>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="ngayHenMoi" className="form-label">
                        Ngày hẹn mới <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className={`form-control ${errors.ngayHenMoi ? 'is-invalid' : ''}`}
                        id="ngayHenMoi"
                        name="ngayHenMoi"
                        value={formData.ngayHenMoi}
                        onChange={handleInputChange}
                        min={new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]}
                        required
                      />
                      {errors.ngayHenMoi && (
                        <div className="invalid-feedback">{errors.ngayHenMoi}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="gioHenMoi" className="form-label">
                        Giờ hẹn mới <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.gioHenMoi ? 'is-invalid' : ''}`}
                        id="gioHenMoi"
                        name="gioHenMoi"
                        value={formData.gioHenMoi}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Chọn giờ khám</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      {errors.gioHenMoi && (
                        <div className="invalid-feedback">{errors.gioHenMoi}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="lyDoThayDoi" className="form-label">
                    Lý do thay đổi <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.lyDoThayDoi ? 'is-invalid' : ''}`}
                    id="lyDoThayDoi"
                    name="lyDoThayDoi"
                    value={formData.lyDoThayDoi}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Chọn lý do</option>
                    {commonReasons.map(reason => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                  {errors.lyDoThayDoi && (
                    <div className="invalid-feedback">{errors.lyDoThayDoi}</div>
                  )}
                </div>

                {formData.lyDoThayDoi === 'Khác' && (
                  <div className="mb-3">
                    <label htmlFor="lyDoKhac" className="form-label">
                      Lý do cụ thể <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className={`form-control ${errors.lyDoKhac ? 'is-invalid' : ''}`}
                      id="lyDoKhac"
                      name="lyDoKhac"
                      rows="3"
                      value={formData.lyDoKhac}
                      onChange={handleInputChange}
                      placeholder="Vui lòng mô tả cụ thể lý do bạn cần thay đổi lịch hẹn"
                      required
                    />
                    {errors.lyDoKhac && (
                      <div className="invalid-feedback">{errors.lyDoKhac}</div>
                    )}
                  </div>
                )}

                <div className="d-flex gap-2 justify-content-end">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/booking/history')}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send me-2"></i>
                        Gửi yêu cầu
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}