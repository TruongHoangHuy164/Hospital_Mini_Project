import React, { useEffect, useState } from 'react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function QueuePage(){
  const [date, setDate] = useState(()=> new Date().toISOString().slice(0,10));
  const [bacSiId, setBacSiId] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Tra cứu lịch hẹn
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  // Danh sách bác sĩ
  const [doctors, setDoctors] = useState([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  async function loadDoctors(){
    try{
      const res = await fetch(`${API_URL}/api/public/doctors`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` }
      });
      const json = await res.json();
      if(res.ok) setDoctors(json);
    }catch(e){ console.error('Lỗi tải danh sách bác sĩ:', e); }
  }

  async function load(){
    setLoading(true); setError('');
    try{
      const q = new URLSearchParams({ date, ...(bacSiId? { bacSiId } : {}) });
      const res = await fetch(`${API_URL}/api/booking/queues?${q.toString()}`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` } });
      const json = await res.json();
      if(!res.ok) throw json;
      setItems(json);
    }catch(e){ setError(e?.message||'Lỗi tải'); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ 
    loadDoctors();
    load(); 
    /* eslint-disable-next-line */ 
  }, []);

  async function searchAppointment(){
    if(!searchQuery.trim()){ setSearchError('Vui lòng nhập SĐT hoặc mã BHYT'); return; }
    setSearching(true); setSearchError(''); setSearchResult(null);
    try{
      // Tìm trực tiếp trong danh sách items đã load
      const query = searchQuery.trim().toLowerCase();
      const appointment = items.find(a => {
        const sdt = a.benhNhan?.soDienThoai?.toLowerCase() || '';
        const bhyt = a.benhNhan?.maBHYT?.toLowerCase() || '';
        const hoTen = a.benhNhan?.hoTen?.toLowerCase() || '';
        return sdt.includes(query) || bhyt.includes(query) || hoTen.includes(query);
      });
      
      if(!appointment){
        setSearchError('Không tìm thấy bệnh nhân với thông tin này trong danh sách hôm nay');
        return;
      }
      
      setSearchResult({
        patient: appointment.benhNhan,
        appointment,
        soThuTu: appointment.soThuTu,
        tenBacSi: appointment.bacSi?.hoTen || 'Chưa xác định',
        phongKham: appointment.bacSi?.phongKham?.tenPhong || 'Chưa xác định',
        khungGio: appointment.khungGio,
        ngayKham: appointment.ngayKham
      });
    }catch(e){ 
      setSearchError(e?.message||'Lỗi tra cứu'); 
    } finally{ 
      setSearching(false); 
    }
  }

  function printTicket(){
    if(!searchResult) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu khám bệnh</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .ticket { max-width: 400px; margin: 0 auto; border: 2px solid #333; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .stt { font-size: 48px; font-weight: bold; text-align: center; color: #2c3e50; margin: 20px 0; }
          .info { margin: 10px 0; }
          .label { font-weight: bold; display: inline-block; width: 120px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <h2>PHIẾU KHÁM BỆNH</h2>
            <p>${new Date(searchResult.ngayKham).toLocaleDateString('vi-VN')}</p>
          </div>
          <div class="stt">STT: ${searchResult.soThuTu}</div>
          <div class="info"><span class="label">Họ tên:</span> ${searchResult.patient.hoTen}</div>
          <div class="info"><span class="label">Bác sĩ:</span> ${searchResult.tenBacSi}</div>
          <div class="info"><span class="label">Phòng khám:</span> ${searchResult.phongKham}</div>
          <div class="info"><span class="label">Giờ khám:</span> ${searchResult.khungGio}</div>
          <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
            Vui lòng đến đúng giờ và mang theo giấy tờ tùy thân
          </div>
        </div>
        <script>
          window.onload = function(){ window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function printTicketForItem(item){
    if(!item) return;
    
    // Debug: log item để kiểm tra cấu trúc dữ liệu
    console.log('🎫 Print item:', item);
    console.log('🏥 Phòng khám:', item.bacSi?.phongKham);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu khám bệnh</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .ticket { max-width: 400px; margin: 0 auto; border: 2px solid #333; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .stt { font-size: 48px; font-weight: bold; text-align: center; color: #2c3e50; margin: 20px 0; }
          .info { margin: 10px 0; }
          .label { font-weight: bold; display: inline-block; width: 120px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <h2>PHIẾU KHÁM BỆNH</h2>
            <p>${new Date(item.ngayKham).toLocaleDateString('vi-VN')}</p>
          </div>
          <div class="stt">STT: ${item.soThuTu || '-'}</div>
          <div class="info"><span class="label">Họ tên:</span> ${item.benhNhan?.hoTen || '-'}</div>
          <div class="info"><span class="label">Bác sĩ:</span> ${item.bacSi?.hoTen || '-'}</div>
          <div class="info"><span class="label">Phòng khám:</span> ${item.bacSi?.phongKham?.tenPhong || '-'}</div>
          <div class="info"><span class="label">Giờ khám:</span> ${item.khungGio || '-'}</div>
          <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
            Vui lòng đến đúng giờ và mang theo giấy tờ tùy thân
          </div>
        </div>
        <script>
          window.onload = function(){ window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div>
      <h3>Danh sách số thứ tự</h3>
      
      {/* Tra cứu lịch hẹn */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title"><i className="bi bi-search"></i> Tra cứu lịch hẹn</h5>
          <p className="text-muted small">Nhập số điện thoại hoặc mã BHYT để kiểm tra lịch hẹn hôm nay</p>
          
          {searchError && <div className="alert alert-warning">{searchError}</div>}
          
          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <input 
                className="form-control" 
                placeholder="Nhập SĐT hoặc mã BHYT..." 
                value={searchQuery}
                onChange={e=>setSearchQuery(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') searchAppointment(); }}
              />
            </div>
            <div className="col-md-3">
              <button 
                className="btn btn-primary w-100" 
                onClick={searchAppointment}
                disabled={searching}
              >
                <i className="bi bi-search"></i> {searching ? 'Đang tìm...' : 'Tra cứu'}
              </button>
            </div>
          </div>
          
          {searchResult && (
            <div className="alert alert-success">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h4 className="alert-heading">✓ Đã tìm thấy lịch hẹn</h4>
                  <hr/>
                  <p className="mb-2"><strong>Họ tên:</strong> {searchResult.patient.hoTen}</p>
                  <p className="mb-2"><strong>Số điện thoại:</strong> {searchResult.patient.soDienThoai || '-'}</p>
                </div>
                <div className="text-end">
                  <div style={{fontSize: '3rem', fontWeight: 'bold', color: '#28a745'}}>
                    {searchResult.soThuTu}
                  </div>
                  <small className="text-muted">Số thứ tự</small>
                </div>
              </div>
              
              <div className="row g-3">
                <div className="col-md-6">
                  <strong><i className="bi bi-person-badge"></i> Bác sĩ:</strong><br/>
                  {searchResult.tenBacSi}
                </div>
                <div className="col-md-6">
                  <strong><i className="bi bi-hospital"></i> Phòng khám:</strong><br/>
                  {searchResult.phongKham}
                </div>
                <div className="col-md-6">
                  <strong><i className="bi bi-clock"></i> Giờ khám:</strong><br/>
                  {searchResult.khungGio}
                </div>
                <div className="col-md-6">
                  <strong><i className="bi bi-calendar3"></i> Ngày khám:</strong><br/>
                  {new Date(searchResult.ngayKham).toLocaleDateString('vi-VN')}
                </div>
              </div>
              
              <div className="mt-3">
                <button className="btn btn-success" onClick={printTicket}>
                  <i className="bi bi-printer"></i> In phiếu khám bệnh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danh sách tất cả */}
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Danh sách tất cả bệnh nhân</h5>
          {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <label className="form-label">Ngày</label>
          <input type="date" className="form-control" value={date} onChange={e=>setDate(e.target.value)} />
        </div>
        <div className="col-md-7">
          <label className="form-label">Bác sĩ (tùy chọn)</label>
          <div className="d-flex gap-2">
            <div style={{position: 'relative', flex: 1}}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Tìm tên bác sĩ hoặc chuyên khoa..."
                value={doctorSearch}
                onChange={e=>{
                  setDoctorSearch(e.target.value);
                  setShowDoctorDropdown(true);
                }}
                onFocus={()=>setShowDoctorDropdown(true)}
              />
              {showDoctorDropdown && doctorSearch && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {doctors
                    .filter(doc => {
                      const search = doctorSearch.toLowerCase();
                      return doc.hoTen.toLowerCase().includes(search) || 
                             doc.chuyenKhoa.toLowerCase().includes(search);
                    })
                    .map(doc => (
                      <div 
                        key={doc._id}
                        style={{
                          padding: '10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee'
                        }}
                        onMouseEnter={e=>e.target.style.backgroundColor='#f0f0f0'}
                        onMouseLeave={e=>e.target.style.backgroundColor='white'}
                        onClick={()=>{
                          setBacSiId(doc._id);
                          setDoctorSearch(`${doc.hoTen} - ${doc.chuyenKhoa}`);
                          setShowDoctorDropdown(false);
                        }}
                      >
                        <div style={{fontWeight: 'bold'}}>{doc.hoTen}</div>
                        <div style={{fontSize: '0.9em', color: '#666'}}>{doc.chuyenKhoa}</div>
                      </div>
                    ))
                  }
                  {doctors.filter(doc => {
                    const search = doctorSearch.toLowerCase();
                    return doc.hoTen.toLowerCase().includes(search) || 
                           doc.chuyenKhoa.toLowerCase().includes(search);
                  }).length === 0 && (
                    <div style={{padding: '10px', textAlign: 'center', color: '#999'}}>
                      Không tìm thấy bác sĩ
                    </div>
                  )}
                </div>
              )}
            </div>
            {bacSiId && (
              <button 
                className="btn btn-outline-secondary" 
                onClick={()=>{
                  setBacSiId('');
                  setDoctorSearch('');
                }}
                title="Xóa lựa chọn"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>
        </div>
        <div className="col-md-2">
          <label className="form-label">&nbsp;</label>
          <button className="btn btn-primary w-100 d-block" onClick={load} disabled={loading}>Tải</button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-striped">
          <thead><tr><th>STT</th><th>Họ tên</th><th>Giờ</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {items.map((it, idx)=> (
              <tr key={idx}>
                <td>{it.soThuTu ?? '-'}</td>
                <td>{it.benhNhan?.hoTen || '-'}</td>
                <td>{it.khungGio || '-'}</td>
                <td>{it.trangThai}</td>
                <td><button className="btn btn-sm btn-outline-secondary" onClick={()=>printTicketForItem(it)}><i className="bi bi-printer"></i> In</button></td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={5} className="text-center">Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>
        </div>
      </div>
    </div>
  );
}
