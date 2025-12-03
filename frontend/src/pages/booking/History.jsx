import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function BookingHistory(){
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);




  async function load(p=1){
    setLoading(true); setError('');
    try{
      const res = await fetch(`${API_URL}/api/booking/my-appointments?page=${p}&limit=10&_=${Date.now()}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }
      );
      if(res.status === 304){
        // Not modified: keep current items
        setPage(p);
        return;
      }
      const json = await res.json().catch(()=>({ items: [], page: 1, totalPages: 1 }));
      console.log('API Response:', json);
      if(!res.ok) throw json;
      const list = Array.isArray(json.items) ? json.items : [];
      setItems(list);
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

  async function openDetail(id){
    setSelectedId(id);
    setDetailOpen(true);
    setDetailLoading(true);
    try{
      const dres = await fetch(`${API_URL}/api/booking/appointments/${id}/detail-simple`, { headers: { 'Content-Type':'application/json' } });
      const djson = await dres.json();
      if(dres.ok) setDetail(djson); else setDetail(null);
      const tres = await fetch(`${API_URL}/api/booking/appointments/${id}/ticket`);
      const tjson = await tres.json();
      if(tres.ok) setTicket({ soThuTu: tjson.soThuTu, trangThai: tjson.sttTrangThai || 'dang_cho' }); else setTicket(null);
    }catch(e){ setDetail(null); setTicket(null); }
    finally{ setDetailLoading(false); }
  }

  function closeDetail(){
    setDetailOpen(false);
    setSelectedId(null);
    setDetail(null);
    setTicket(null);
  }

  return (
    <div className="container my-4">
      <h3>Lịch sử đặt khám</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="table-responsive">
        <table className="table table-striped">
          <thead><tr><th>Ngày</th><th>Tên bệnh nhân</th><th>Khung giờ</th><th>Bác sĩ</th><th>Chuyên khoa</th><th>Trạng thái</th><th>STT</th><th>Hủy lịch</th><th>Chi tiết</th></tr></thead>
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
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleCancelAppointment(it._id)}
                      disabled={actionLoading === it._id}
                    >
                      {actionLoading === it._id ? 'Đang hủy...' : 'Hủy lịch'}
                    </button>
                  ) : (
                    <span className="text-muted small">Không thể hủy</span>
                  )}
                </td>
                <td>
                  <button className="btn btn-sm btn-outline-primary" onClick={()=>openDetail(it._id)}>
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
            {(!Array.isArray(items) || items.length===0) && (
              <tr><td colSpan={9} className="text-center">Không có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="d-flex justify-content-between align-items-center">
        <button disabled={loading || page<=1} className="btn btn-outline-secondary" onClick={()=>load(page-1)}>Trang trước</button>
        <span>Trang {page}/{totalPages}</span>
        <button disabled={loading || page>=totalPages} className="btn btn-outline-secondary" onClick={()=>load(page+1)}>Trang sau</button>
      </div>


      {/* Detail Modal */}
      {detailOpen && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết lịch khám</h5>
                <button type="button" className="btn-close" onClick={closeDetail}></button>
              </div>
              <div className="modal-body">
                {detailLoading ? (
                  <div className="text-center py-3">
                    <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
                  </div>
                ) : (
                  <>
                    <div className="mb-2"><span className="text-muted small">Ngày khám:</span> <strong>{detail?.ngayKham ? new Date(detail.ngayKham).toLocaleDateString('vi-VN') : '-'}</strong></div>
                    <div className="mb-2"><span className="text-muted small">Giờ khám:</span> <strong>{detail?.khungGio || '-'}</strong></div>
                    <div className="mb-2"><span className="text-muted small">STT:</span> <strong>{ticket?.soThuTu ?? '-'}</strong> <span className="badge text-bg-secondary ms-2">{ticket?.trangThai || 'dang_cho'}</span></div>
                    {detail?.bacSi && (
                      <div className="mb-2">
                        <span className="text-muted small">Bác sĩ:</span> <strong>{detail.bacSi.hoTen}</strong> <span className="text-muted">• {detail.bacSi.chuyenKhoa}</span>
                      </div>
                    )}
                    {detail?.bacSi?.phongKham && (
                      <div className="mb-2"><span className="text-muted small">Phòng khám:</span> <strong>{detail.bacSi.phongKham.tenPhong || '-'}</strong></div>
                    )}
                    <div className="alert alert-warning mt-3">Vui lòng đến trước <strong>15 phút</strong> so với giờ khám.</div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeDetail}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
