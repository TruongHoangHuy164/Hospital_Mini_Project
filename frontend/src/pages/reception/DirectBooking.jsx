import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DirectBooking(){
  const [params] = useSearchParams();
  const benhNhanId = params.get('benhNhanId') || '';
  const hoSoBenhNhanId = params.get('hoSoBenhNhanId') || '';
  const token = localStorage.getItem('accessToken') || '';

  const [specialtyId, setSpecialtyId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [appointment, setAppointment] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);

  const nowKhungGio = useMemo(() => {
    const d = new Date();
    const hh = d.getHours();
    const mm = d.getMinutes();
    // Round up to next 10-minute slot
    const rounded = Math.min(59, Math.ceil(mm / 10) * 10);
    const hhStr = String(rounded === 60 ? hh+1 : hh).padStart(2,'0');
    const mmStr = String(rounded === 60 ? 0 : rounded).padStart(2,'0');
    return `${hhStr}:${mmStr}`;
  }, []);

  // Walk-in flow: no need to fetch/validate shift-hours; backend permits flexible time

  async function createAppointment(){
    setError(''); setCreating(true);
    try{
      if(!benhNhanId && !hoSoBenhNhanId){
        throw { message: 'Thiếu hồ sơ bệnh nhân. Vui lòng đi từ Tiếp nhận và chọn hồ sơ.' };
      }
      if(!specialtyId){ throw { message: 'Thiếu chuyên khoa' }; }
      if(!doctorId){ throw { message: 'Thiếu bác sĩ' }; }
      const body = {
        benhNhanId: benhNhanId || undefined,
        hoSoBenhNhanId: hoSoBenhNhanId || undefined,
        bacSiId: doctorId,
        chuyenKhoaId: specialtyId,
        ghiChu: note || undefined,
        source: 'reception-direct',
      };
      setLastPayload(body);
      console.debug('[DirectBooking] Creating appointment payload:', body);
      const res = await fetch(`${API_URL}/api/booking/appointments`,{
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify(body)
      });
      const json = await res.json();
      setLastResponse({ status: res.status, ok: res.ok, body: json });
      console.debug('[DirectBooking] Create appointment response:', { status: res.status, ok: res.ok, body: json });
      if(!res.ok) throw json;
      // Handle both shapes: { appointmentDoc } or { lichKham, soThuTu }
      if(json && json.lichKham){
        setAppointment(json.lichKham);
        if(json.soThuTu){ setTicket(json.soThuTu); }
      } else {
        setAppointment(json);
      }
    }catch(e){ setError(e?.message||'Lỗi tạo lịch'); }
    finally{ setCreating(false); }
  }

  // Load specialties
  useEffect(() => {
    let mounted = true;
    (async () => {
      try{
        const res = await fetch(`${API_URL}/api/specialties?simple=1&_=${Date.now()}`,
          { headers: { Authorization: `Bearer ${token}`, 'Cache-Control':'no-cache' } });
        const json = await res.json();
        if(!res.ok) throw json;
        const list = Array.isArray(json) ? json : (json.items || json.data || []);
        if(mounted) setSpecialties(list);
      }catch(e){ /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [token]);

  // Load doctors by specialty (use public endpoint to avoid 403)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try{
        if(!specialtyId){ setDoctors([]); return; }
        const url = new URL(`${API_URL}/api/public/doctors`);
        url.searchParams.set('limit','200');
        url.searchParams.set('chuyenKhoa', specialtyId);
        url.searchParams.set('_', String(Date.now()));
        const res = await fetch(url.toString(), { headers: { 'Cache-Control': 'no-cache' } });
        const json = await res.json();
        if(!res.ok) throw json;
        const list = Array.isArray(json) ? json : (json.items || json.data || []);
        if(mounted) setDoctors(list);
      }catch(e){ /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [specialtyId, token]);

  // Optional: filter doctors to those who have a work schedule today
  const [onlyTodayWorking, setOnlyTodayWorking] = useState(true);
  const [todayDoctorIds, setTodayDoctorIds] = useState([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try{
        const month = new Date().toISOString().slice(0,7);
        const res = await fetch(`${API_URL}/api/work-schedules?month=${month}&role=doctor`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if(!res.ok) throw json;
        const today = new Date().toISOString().slice(0,10);
        const ids = (Array.isArray(json)? json: []).filter(r=> r.day === today).map(r=> r.userId);
        if(mounted) setTodayDoctorIds(Array.from(new Set(ids)));
      }catch(e){ if(mounted) setTodayDoctorIds([]); }
    })();
    return () => { mounted = false; };
  }, [token]);

  async function issueQueueAndPay(method){
    if(!appointment?._id){ setError('Chưa có lịch khám'); return; }
    setError('');
    try{
      const body = {
        method,
        amount: 0, // tiền khám mặc định, có thể chỉnh sau
        targetType: 'hosokham',
      };
      const url = method === 'momo'
        ? `${API_URL}/api/booking/appointments/${encodeURIComponent(appointment._id)}/pay/momo`
        : `${API_URL}/api/booking/appointments/${encodeURIComponent(appointment._id)}/pay`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if(!res.ok) throw json;
      // If MoMo, backend may return a payUrl
      if(method === 'momo' && json?.payUrl){
        window.location.href = json.payUrl;
        return;
      }
      // For cash, expect ticket in response
      setTicket(json?.ticket || json);
    }catch(e){ setError(e?.message||'Lỗi thanh toán hoặc cấp STT'); }
  }

  async function issueQueueOnly(){
    if(!appointment?._id){ setError('Chưa có lịch khám'); return; }
    setError('');
    try{
      const res = await fetch(`${API_URL}/api/booking/appointments/${encodeURIComponent(appointment._id)}/pay`,{
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({ method: 'cash', amount: 0, targetType: 'hosokham' })
      });
      const json = await res.json();
      if(!res.ok) throw json;
      setTicket(json?.ticket || json);
    }catch(e){ setError(e?.message||'Lỗi cấp STT'); }
  }

  return (
    <div className="container py-3">
      <h4>Đặt lịch trực tiếp (Lễ tân)</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Chuyên khoa</label>
              <select className="form-select" value={specialtyId} onChange={e=>{ setSpecialtyId(e.target.value); setDoctorId(''); }}>
                <option value="">-- Chọn chuyên khoa --</option>
                {specialties.length === 0 && <option value="" disabled>(Không có dữ liệu chuyên khoa)</option>}
                {specialties.map(sk => (
                  <option key={sk._id || sk.id} value={sk._id || sk.id}>{sk.tenChuyenKhoa || sk.name || sk.ten || sk.title}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Bác sĩ (tùy chọn)</label>
              <select className="form-select" value={doctorId} onChange={e=>setDoctorId(e.target.value)} disabled={!specialtyId}>
                <option value="">-- Chọn bác sĩ --</option>
                {doctors.length === 0 && specialtyId && <option value="" disabled>(Không có dữ liệu bác sĩ)</option>}
                {(onlyTodayWorking ? doctors.filter(d=> todayDoctorIds.includes(d._id || d.id)) : doctors).map(bs => (
                  <option key={bs._id || bs.id} value={bs._id || bs.id}>{bs.hoTen || bs.name || bs.ten}</option>
                ))}
              </select>
              <div className="form-check mt-2">
                <input className="form-check-input" type="checkbox" id="onlyTodayWorkingChk" checked={onlyTodayWorking} onChange={e=> setOnlyTodayWorking(e.target.checked)} />
                <label className="form-check-label" htmlFor="onlyTodayWorkingChk">Chỉ hiển thị bác sĩ có lịch làm việc hôm nay</label>
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label">Giờ khám</label>
              <input className="form-control" value={nowKhungGio} disabled />
            </div>
            <div className="col-12">
              <label className="form-label">Ghi chú</label>
              <input className="form-control" value={note} onChange={e=>setNote(e.target.value)} placeholder="Ghi chú (nếu có)" />
            </div>
            <div className="col-12">
              <button className="btn btn-primary me-2" disabled={creating} onClick={createAppointment}>
                <i className="bi bi-plus-circle"></i> Tạo lịch ngay (giờ hiện tại)
              </button>
              <button className="btn btn-outline-secondary me-2" disabled={!appointment} onClick={issueQueueOnly}>
                <i className="bi bi-ticket"></i> Cấp STT (không thu phí)
              </button>
              <button className="btn btn-success me-2" disabled={!appointment} onClick={()=>issueQueueAndPay('cash')}>
                <i className="bi bi-cash"></i> Thu tiền mặt + cấp STT
              </button>
              <button className="btn btn-warning" disabled={!appointment} onClick={()=>issueQueueAndPay('momo')}>
                <i className="bi bi-phone"></i> Thanh toán MoMo + cấp STT
              </button>
            </div>
          </div>
        </div>
      </div>

      {appointment && (
        <div className="card mb-3">
          <div className="card-body">
            <h6 className="card-title">Thông tin lịch vừa tạo</h6>
            <div>Ngày khám: {appointment.ngayKham}</div>
            <div>Giờ khám: {appointment.khungGio}</div>
            <div>Bệnh nhân: {appointment.benhNhan?.hoTen || appointment.hoSoBenhNhan?.hoTen || '-'}</div>
          </div>
        </div>
      )}

      {ticket && (
        <div className="card">
          <div className="card-body">
            <h6 className="card-title">STT đã cấp</h6>
            <div>STT: {ticket.stt || ticket.soThuTu || '-'}</div>
            <div>Ngày: {ticket.ngay || appointment?.ngayKham || '-'}</div>
            <div>Giờ dự kiến: {appointment?.khungGio || '-'}</div>
          </div>
        </div>
      )}

      <div className="card mt-3">
        <div className="card-body">
          <h6 className="card-title">Debug</h6>
          <div className="small text-muted">Xem chi tiết payload/response để tìm thiếu dữ liệu</div>
          <pre className="small bg-light p-2 border" style={{maxHeight:200, overflow:'auto'}}>{JSON.stringify({
            payload: lastPayload,
            response: lastResponse,
            selections: { benhNhanId, hoSoBenhNhanId, specialtyId, doctorId },
          }, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
