import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function BookingHistory(){
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);




  async function load(p=1){
    setLoading(true); setError('');
    try{
      const res = await fetch(`${API_URL}/api/booking/my-appointments?page=${p}&limit=10`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` } });
      const json = await res.json();
      console.log('API Response:', json);
      if(!res.ok) throw json;
      setItems(json.items||[]);
      setPage(json.page||1);
      setTotalPages(json.totalPages||1);
    }catch(e){ 
      console.error('API Error:', e);
      setError(e?.message||'Lỗi tải'); 
    }
    finally{ setLoading(false); }
  }

  const canModifyAppointment = (appointment) => {
    console.log('Checking appointment:', appointment);
    
    // Check status from API response
    if (appointment.trangThai === 'da_kham') {
      console.log('Cannot modify: already examined');
      return false;
    }
    
    // Check if appointment is in the future
    const appointmentDate = new Date(appointment.ngayKham);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    console.log('Date comparison:', {
      appointmentDate: appointmentDate.toDateString(),
      today: today.toDateString(),
      isInFuture: appointmentDate >= today
    });
    
    // Allow modification if appointment is today or in the future
    return appointmentDate >= today;
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch khám này?')) return;
    
    setActionLoading(appointmentId);
    try {
      const res = await fetch(`${API_URL}/api/booking/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` }
      });
      
      const json = await res.json();
      if(!res.ok) throw json;
      
      alert('Hủy lịch khám thành công');
      load(page); // Reload current page
    } catch (err) {
      console.error('Cancel appointment error:', err);
      alert(err?.message || 'Không thể hủy lịch khám');
    } finally {
      setActionLoading(null);
    }
  };





  useEffect(()=>{ load(1); },[]);

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Lịch sử đặt khám</h3>
        <div>
          <Link to="/user/change-appointment-requests" className="btn btn-outline-primary me-2">
            <i className="bi bi-calendar-week me-2"></i>
            Yêu cầu thay đổi lịch
          </Link>
          <Link to="/booking" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i>
            Đặt lịch mới
          </Link>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="table-responsive">
        <table className="table table-striped">
          <thead><tr><th>Ngày</th><th>Tên bệnh nhân</th><th>Khung giờ</th><th>Bác sĩ</th><th>Chuyên khoa</th><th>Trạng thái</th><th>STT</th><th>Thao tác</th></tr></thead>
          <tbody>
            {Array.isArray(items) && items.map(it=> (
              <tr key={it._id}>
                <td>{it.ngayKham? new Date(it.ngayKham).toLocaleDateString() : '-'}</td>
                <td>{it.benhNhan?.hoTen || '-'}</td>
                <td>{it.khungGio || '-'}</td>
                <td>{it.bacSi?.hoTen || '-'}</td>
                <td>{it.chuyenKhoa?.ten || '-'}</td>
                <td>
                  <span className={`badge ${
                    it.trangThai === 'da_kham' ? 'bg-success' :
                    it.trangThai === 'da_thanh_toan' ? 'bg-primary' :
                    'bg-warning'
                  }`}>
                    {it.trangThai === 'da_kham' ? 'Đã khám' :
                     it.trangThai === 'da_thanh_toan' ? 'Đã thanh toán' :
                     'Chờ thanh toán'}
                  </span>
                </td>
                <td>{it.soThuTu ?? '-'}</td>
                <td>
                  {canModifyAppointment(it) ? (
                    <div className="btn-group">
                      <Link 
                        to={`/user/change-appointment/${it._id}`}
                        className="btn btn-sm btn-outline-warning"
                        title="Yêu cầu thay đổi lịch"
                      >
                        <i className="bi bi-calendar-event"></i>
                      </Link>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleCancelAppointment(it._id)}
                        disabled={actionLoading === it._id}
                        title="Hủy lịch khám"
                      >
                        {actionLoading === it._id ? (
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                        ) : (
                          <i className="bi bi-trash"></i>
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted small">Đã kết thúc</span>
                  )}
                </td>
              </tr>
            ))}
            {(!Array.isArray(items) || items.length===0) && (
              <tr><td colSpan={8} className="text-center">Không có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="d-flex justify-content-between align-items-center">
        <button disabled={loading || page<=1} className="btn btn-outline-secondary" onClick={()=>load(page-1)}>Trang trước</button>
        <span>Trang {page}/{totalPages}</span>
        <button disabled={loading || page>=totalPages} className="btn btn-outline-secondary" onClick={()=>load(page+1)}>Trang sau</button>
      </div>


    </div>
  );
}
