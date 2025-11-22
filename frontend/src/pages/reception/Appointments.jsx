import React, { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ReceptionAppointments(){
  const urlParams = new URLSearchParams(location.search);
  const initialBenhNhanId = urlParams.get('benhNhanId') || '';
  const initialHoSoId = urlParams.get('hoSoBenhNhanId') || '';
  const [benhNhanId, setBenhNhanId] = useState(initialBenhNhanId);
  const [hoSoBenhNhanId, setHoSoBenhNhanId] = useState(initialHoSoId);
  const [specialties, setSpecialties] = useState([]);
  const [chuyenKhoaId, setChuyenKhoaId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [availability, setAvailability] = useState(null);
  const [selected, setSelected] = useState({ bacSiId: '', khungGio: ''});
  const [appt, setAppt] = useState(null);
  const [error, setError] = useState('');

  useEffect(()=>{ (async ()=>{
    try{ const res = await fetch(`${API_URL}/api/booking/specialties`); const json = await res.json(); if(res.ok) setSpecialties(json); }catch{}
  })() },[]);

  async function loadAvailability(){
    setError(''); setAvailability(null);
    try{
      const q = new URLSearchParams({ chuyenKhoaId, date });
      const res = await fetch(`${API_URL}/api/booking/availability?${q.toString()}`);
      const json = await res.json();
      if(!res.ok) throw json;
      setAvailability(json);
    }catch(e){ setError(e?.message||'Lỗi tải'); }
  }

  async function createAppointment(){
    try{
      const body = {
        bacSiId: selected.bacSiId,
        chuyenKhoaId,
        date,
        khungGio: selected.khungGio
      };
      // Add either benhNhanId or hoSoBenhNhanId
      if(benhNhanId) body.benhNhanId = benhNhanId;
      if(hoSoBenhNhanId) body.hoSoBenhNhanId = hoSoBenhNhanId;
      
      const res = await fetch(`${API_URL}/api/booking/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if(!res.ok) throw json;
      setAppt(json);
    }catch(e){ alert(e?.message||'Lỗi đặt lịch'); }
  }

  async function payAndQueue(){
    try{
      const res = await fetch(`${API_URL}/api/booking/appointments/${appt._id}/pay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}` }
      });
      const json = await res.json();
      if(!res.ok) throw json;
      alert(`Số thứ tự: ${json.soThuTu?.soThuTu}`);
    }catch(e){ alert(e?.message||'Lỗi thanh toán'); }
  }

  return (
    <div>
      <h3>Quản lý lịch hẹn</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {(benhNhanId || hoSoBenhNhanId) && (
        <div className="alert alert-info">
          <i className="bi bi-info-circle"></i> Đang đặt lịch cho: <strong>{benhNhanId ? `Bệnh nhân ID: ${benhNhanId}` : `Hồ sơ người thân ID: ${hoSoBenhNhanId}`}</strong>
        </div>
      )}
      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <label className="form-label">Bệnh nhân ID</label>
          <input 
            className="form-control" 
            value={benhNhanId} 
            onChange={e=>setBenhNhanId(e.target.value)} 
            placeholder="Hoặc nhập thủ công"
            disabled={!!hoSoBenhNhanId}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Hồ sơ người thân ID</label>
          <input 
            className="form-control" 
            value={hoSoBenhNhanId} 
            onChange={e=>setHoSoBenhNhanId(e.target.value)} 
            placeholder="Hoặc nhập thủ công"
            disabled={!!benhNhanId}
          />
        </div>
        <div className="col-md-3"><label className="form-label">Chuyên khoa</label>
          <select className="form-select" value={chuyenKhoaId} onChange={e=>setChuyenKhoaId(e.target.value)}>
            <option value="">-- Chọn --</option>
            {specialties.map(s=> <option key={s._id} value={s._id}>{s.ten}</option>)}
          </select>
        </div>
        <div className="col-md-2"><label className="form-label">Ngày</label><input type="date" className="form-control" value={date} onChange={e=>setDate(e.target.value)} /></div>
        <div className="col-md-2 align-self-end"><button className="btn btn-primary w-100" onClick={loadAvailability}>Xem lịch trống</button></div>
      </div>
      {availability && (
        <div className="row">
          {availability.doctors.map(d=> (
            <div className="col-md-4 mb-3" key={d.bacSiId}>
              <div className={`card ${selected.bacSiId===d.bacSiId? 'border-primary': ''}`}>
                <div className="card-body">
                  <h6 className="card-title">{d.hoTen}</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {d.khungGioTrong.map(s=> (
                      <button key={s} className={`btn btn-sm ${selected.bacSiId===d.bacSiId && selected.khungGio===s? 'btn-primary':'btn-outline-secondary'}`} onClick={()=> setSelected({ bacSiId: d.bacSiId, khungGio: s })}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3">
        <button 
          className="btn btn-success" 
          disabled={(!benhNhanId && !hoSoBenhNhanId) || !chuyenKhoaId || !selected.bacSiId || !selected.khungGio} 
          onClick={createAppointment}
        >
          Đặt lịch
        </button>
      </div>

      {appt && (
        <div className="alert alert-info mt-3">
          Đã tạo lịch hẹn #{appt._id}. Trạng thái: {appt.trangThai}. <button className="btn btn-sm btn-primary ms-2" onClick={payAndQueue}>Thanh toán & Cấp số</button>
        </div>
      )}
    </div>
  );
}
