/**
 * FILE: DirectBooking.jsx
 * MÔ TẢ: Trang đặt lịch khám trực tiếp cho lễ tân (walk-in patients)
 * Cho phép tạo lịch khám ngay lập tức và cấp số thứ tự
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DirectBooking(){
  const [params, setParams] = useSearchParams();
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
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [fullAppointmentData, setFullAppointmentData] = useState(null);
  const [patientNameFromUrl, setPatientNameFromUrl] = useState('');

  // Lấy tên bệnh nhân từ URL params nếu có
  useEffect(() => {
    const name = params.get('patientName') || params.get('hoTen') || '';
    if(name) setPatientNameFromUrl(decodeURIComponent(name));
  }, [params]);

  /**
   * Fetch chi tiết appointment với đầy đủ thông tin populate
   * Sử dụng API queues giống Queue.jsx để lấy data đã populate đầy đủ
   */
  async function fetchAppointmentDetail(appointmentId){
    try{
      // Lấy ngày hiện tại
      const today = new Date().toISOString().slice(0,10);
      
      // Fetch từ API queues - backend đã populate đầy đủ
      const res = await fetch(`${API_URL}/api/booking/queues?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if(!res.ok) throw await res.json();
      const queues = await res.json();
      
      // Tìm queue item theo appointmentId
      const queueItem = queues.find(q => 
        String(q.lichKhamId || q._id) === String(appointmentId) ||
        String(q._id) === String(appointmentId)
      );
      
      if(queueItem){
        console.log('✅ Found queue item with full data:', queueItem);
        setFullAppointmentData(queueItem);
        
        // Update ticket info nếu có
        if(queueItem.soThuTu){
          setTicket({
            soThuTu: queueItem.soThuTu,
            trangThai: queueItem.trangThai,
            ngay: queueItem.ngayKham
          });
        }
        
        return queueItem;
      } else {
        console.warn('⚠️ Queue item not found for appointment:', appointmentId);
      }
      
      return null;
    }catch(e){
      console.error('❌ Lỗi tải chi tiết appointment:', e);
      return null;
    }
  }

  // Xử lý kết quả thanh toán MoMo từ URL params
  useEffect(() => {
    const status = params.get('status');
    const stt = params.get('stt');
    const msg = params.get('msg');
    
    if(status === 'success' && stt){
      alert(`✅ Thanh toán MoMo thành công! Đã cấp số thứ tự: ${stt}`);
      setTicket({ soThuTu: stt, trangThai: 'dang_cho' });
      // Xóa params thanh toán khỏi URL nhưng giữ lại benhNhanId và hoSoBenhNhanId
      const newParams = new URLSearchParams(params);
      newParams.delete('status');
      newParams.delete('stt');
      newParams.delete('id');
      newParams.delete('msg');
      newParams.delete('code');
      setParams(newParams);
    } else if(status === 'fail'){
      alert(`❌ Thanh toán MoMo thất bại: ${msg || 'Vui lòng thử lại'}`);
      const newParams = new URLSearchParams(params);
      newParams.delete('status');
      newParams.delete('msg');
      newParams.delete('code');
      setParams(newParams);
    }
  }, [params, setParams]);

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
        // Fetch chi tiết để có đầy đủ thông tin
        await fetchAppointmentDetail(json.lichKham._id || json.lichKham.id);
        if(json.soThuTu){ setTicket(json.soThuTu); }
      } else {
        setAppointment(json);
        // Fetch chi tiết để có đầy đủ thông tin
        await fetchAppointmentDetail(json._id || json.id);
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

  // Load patient info
  useEffect(() => {
    let mounted = true;
    (async () => {
      try{
        if(!benhNhanId && !hoSoBenhNhanId) {
          console.warn('No patient ID found in URL params');
          return;
        }
        
        // Try to get patient profile first
        if(hoSoBenhNhanId){
          console.log('Fetching patient profile:', hoSoBenhNhanId);
          const res = await fetch(`${API_URL}/api/patient-profiles/${hoSoBenhNhanId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Patient profile response:', res.status, res.ok);
          if(res.ok){
            const json = await res.json();
            console.log('✅ Loaded patient profile:', json);
            if(mounted) setPatientInfo(json);
            return;
          } else {
            const error = await res.json().catch(() => ({}));
            console.error('❌ Failed to load patient profile:', error);
          }
        }
        
        // Fallback to booking/patients API
        if(benhNhanId){
          console.log('Fetching from booking/patients:', benhNhanId);
          const res = await fetch(`${API_URL}/api/booking/patients`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if(res.ok){
            const patients = await res.json();
            const patient = patients.find(p => (p._id || p.id) === benhNhanId);
            console.log('✅ Loaded patient from booking:', patient);
            if(mounted && patient) setPatientInfo(patient);
          }
        }
      }catch(e){ 
        console.error('❌ Lỗi tải thông tin bệnh nhân:', e);
      }
    })();
    return () => { mounted = false; };
  }, [benhNhanId, hoSoBenhNhanId, token]);

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
      }catch(e){ 
        console.error('Lỗi tải danh sách bác sĩ:', e);
        if(mounted) setDoctors([]);
      }
    })();
    return () => { mounted = false; };
  }, [specialtyId, token]);
  
  // Update doctor info when doctor is selected - fetch full info với phòng khám
  useEffect(() => {
    let mounted = true;
    (async () => {
      if(!doctorId) return;
      try{
        // Tìm trong list đã load
        const selectedDoctor = doctors.find(d => (d._id || d.id) === doctorId);
        if(!selectedDoctor) return;
        
        console.log('Selected doctor:', selectedDoctor);
        
        // Nếu có phongKhamId, fetch tên phòng khám
        if(selectedDoctor.phongKhamId){
          console.log('Fetching clinic info for:', selectedDoctor.phongKhamId);
          const res = await fetch(`${API_URL}/api/clinics?simple=1`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if(res.ok){
            const clinics = await res.json();
            console.log('Clinics list:', clinics);
            const clinic = clinics.find(c => (c._id || c.id) === selectedDoctor.phongKhamId);
            console.log('Found clinic:', clinic);
            if(clinic && mounted){
              setDoctorInfo({
                ...selectedDoctor,
                phongKham: { _id: clinic._id || clinic.id, tenPhong: clinic.tenPhong || clinic.ten || clinic.name }
              });
              console.log('✅ Doctor info with clinic set');
              return;
            }
          }
        }
        
        // Fallback: không có phòng khám
        if(mounted) {
          setDoctorInfo(selectedDoctor);
          console.log('✅ Doctor info set (no clinic)');
        }
      }catch(e){
        console.error('❌ Lỗi fetch doctor info:', e);
      }
    })();
    return () => { mounted = false; };
  }, [doctorId, doctors, token]);

  // Load doctors who have work schedule today
  const [onlyTodayWorking, setOnlyTodayWorking] = useState(true);
  const [todayDoctorIds, setTodayDoctorIds] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  
  useEffect(() => {
    let mounted = true;
    (async () => {
      if(!onlyTodayWorking){ 
        setTodayDoctorIds([]); 
        return; 
      }
      setLoadingSchedule(true);
      try{
        const today = new Date().toISOString().slice(0,10);
        const month = today.slice(0,7); // YYYY-MM
        
        // Lấy lịch làm việc của tháng hiện tại
        const res = await fetch(`${API_URL}/api/work-schedules?month=${month}&role=doctor`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const json = await res.json();
        if(!res.ok) throw json;
        
        // Lọc các bác sĩ có ca làm việc hôm nay
        const schedules = Array.isArray(json) ? json : (json.items || json.data || []);
        const doctorUserIdsToday = schedules
          .filter(s => s.day === today && s.role === 'doctor')
          .map(s => s.userId);
        
        if(mounted) {
          const uniqueIds = Array.from(new Set(doctorUserIdsToday));
          setTodayDoctorIds(uniqueIds);
          console.log('Bác sĩ có lịch làm hôm nay (userIds):', uniqueIds);
        }
      }catch(e){ 
        console.error('Lỗi tải lịch làm việc:', e);
        if(mounted) setTodayDoctorIds([]); 
      } finally {
        if(mounted) setLoadingSchedule(false);
      }
    })();
    return () => { mounted = false; };
  }, [token, onlyTodayWorking]);

  /**
   * Thanh toán và cấp số thứ tự
   * @param {string} method - 'momo' hoặc 'cash'
   */
  async function issueQueueAndPay(method){
    if(!appointment?._id){ 
      setError('Chưa có lịch khám. Vui lòng tạo lịch trước khi thanh toán.'); 
      return; 
    }
    setError('');
    setPaymentProcessing(true);
    try{
      // Xây dựng returnUrl với đầy đủ params để giữ context sau khi thanh toán
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.delete('status');
      returnUrl.searchParams.delete('stt');
      returnUrl.searchParams.delete('id');
      returnUrl.searchParams.delete('msg');
      returnUrl.searchParams.delete('code');
      
      const body = {
        method,
        amount: 150000, // Phí khám mặc định
        targetType: 'hosokham',
        returnUrl: returnUrl.toString(), // Gửi URL để backend redirect về đúng trang với params
      };
      
      console.log('Payment request:', { appointmentId: appointment._id, method, body });
      
      const url = method === 'momo'
        ? `${API_URL}/api/booking/appointments/${encodeURIComponent(appointment._id)}/momo`
        : `${API_URL}/api/booking/appointments/${encodeURIComponent(appointment._id)}/pay`;
        
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(body)
      });
      
      const json = await res.json();
      console.log('Payment response:', { status: res.status, ok: res.ok, body: json });
      
      if(!res.ok) throw json;
      
      // If MoMo, backend may return a payUrl
      if(method === 'momo' && json?.payUrl){
        window.location.href = json.payUrl;
        return;
      }
      
      // For cash, expect soThuTu in response
      if(json?.soThuTu){
        setTicket(json.soThuTu);
        // Fetch lại chi tiết appointment sau khi thanh toán
        await fetchAppointmentDetail(appointment._id);
        alert(`Đã cấp STT: ${json.soThuTu.soThuTu || json.soThuTu.stt}`);
      } else if(json?.ticket){
        setTicket(json.ticket);
        await fetchAppointmentDetail(appointment._id);
        alert(`Đã cấp STT: ${json.ticket.soThuTu || json.ticket.stt}`);
      } else {
        setTicket(json);
        await fetchAppointmentDetail(appointment._id);
      }
    }catch(e){ 
      console.error('Payment error:', e);
      setError(e?.message || 'Lỗi thanh toán hoặc cấp STT'); 
    } finally {
      setPaymentProcessing(false);
    }
  }

  /**
   * Chỉ cấp số thứ tự không thu phí
   */
  async function issueQueueOnly(){
    if(!appointment?._id){ 
      setError('Chưa có lịch khám. Vui lòng tạo lịch trước.'); 
      return; 
    }
    setError('');
    setPaymentProcessing(true);
    try{
      const res = await fetch(`${API_URL}/api/booking/appointments/${encodeURIComponent(appointment._id)}/pay`,{
        method:'POST',
        headers:{
          'Content-Type':'application/json', 
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          method: 'cash', 
          amount: 0, 
          targetType: 'hosokham' 
        })
      });
      const json = await res.json();
      console.log('Queue only response:', json);
      
      if(!res.ok) throw json;
      
      if(json?.soThuTu){
        setTicket(json.soThuTu);
        await fetchAppointmentDetail(appointment._id);
        alert(`Đã cấp STT: ${json.soThuTu.soThuTu || json.soThuTu.stt}`);
      } else {
        setTicket(json?.ticket || json);
        await fetchAppointmentDetail(appointment._id);
      }
    }catch(e){ 
      console.error('Queue only error:', e);
      setError(e?.message || 'Lỗi cấp STT'); 
    } finally {
      setPaymentProcessing(false);
    }
  }

  /**
   * In phiếu khám bệnh với số thứ tự
   */
  function printTicket(){
    if(!ticket || !appointment){ 
      alert('Chưa có thông tin để in phiếu');
      return; 
    }
    
    // Ưu tiên lấy từ fullAppointmentData (từ API queues - đã populate đầy đủ)
    const queueData = fullAppointmentData;
    
    // Get patient name
    const patientName = queueData?.benhNhan?.hoTen ||
                       patientNameFromUrl || 
                       patientInfo?.hoTen || 
                       appointment.benhNhan?.hoTen || 
                       appointment.hoSoBenhNhan?.hoTen || 
                       'Bệnh nhân';
    
    // Get doctor info  
    const doctorName = queueData?.bacSi?.hoTen ||
                      doctorInfo?.hoTen || 
                      appointment.bacSi?.hoTen || 
                      'Bác sĩ';
    
    const clinicName = queueData?.bacSi?.phongKham?.tenPhong ||
                      doctorInfo?.phongKham?.tenPhong || 
                      appointment.bacSi?.phongKham?.tenPhong || 
                      'Phòng khám';
    
    console.log('=== PRINT DATA ===');
    console.log('Queue data:', queueData);
    console.log('Patient:', patientName);
    console.log('Doctor:', doctorName);
    console.log('Clinic:', clinicName);
    console.log('==================');
    
    const printWindow = window.open('', '_blank');
    const htmlContent = '<!DOCTYPE html><html><head><title>Phiếu khám bệnh</title><style>body { font-family: Arial, sans-serif; padding: 20px; } .ticket { max-width: 400px; margin: 0 auto; border: 2px solid #333; padding: 20px; } .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; } .stt { font-size: 48px; font-weight: bold; text-align: center; color: #2c3e50; margin: 20px 0; } .info { margin: 10px 0; } .label { font-weight: bold; display: inline-block; width: 120px; } @media print { body { padding: 0; } }</style></head><body><div class="ticket"><div class="header"><h2>PHIẾU KHÁM BỆNH</h2><p>' + new Date(appointment.ngayKham).toLocaleDateString('vi-VN') + '</p></div><div class="stt">STT: ' + (ticket.soThuTu || ticket.stt || '-') + '</div><div class="info"><span class="label">Họ tên:</span> ' + patientName + '</div><div class="info"><span class="label">Bác sĩ:</span> ' + doctorName + '</div><div class="info"><span class="label">Phòng khám:</span> ' + clinicName + '</div><div class="info"><span class="label">Giờ khám:</span> ' + (appointment.khungGio || queueData?.khungGio || '-') + '</div><div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">Vui lòng đến đúng giờ và mang theo giấy tờ tùy thân</div></div><script>window.onload = function(){ window.print(); }</script></body></html>';
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
              <label className="form-label">
                Bác sĩ (tùy chọn)
                {loadingSchedule && <span className="spinner-border spinner-border-sm ms-2" role="status"></span>}
              </label>
              <select className="form-select" value={doctorId} onChange={e=>setDoctorId(e.target.value)} disabled={!specialtyId}>
                <option value="">-- Chọn bác sĩ --</option>
                {doctors.length === 0 && specialtyId && <option value="" disabled>(Không có dữ liệu bác sĩ)</option>}
                {(onlyTodayWorking 
                  ? doctors.filter(d=> todayDoctorIds.includes(String(d.userId || d._id || d.id))) 
                  : doctors
                ).map(bs => (
                  <option key={bs._id || bs.id} value={bs._id || bs.id}>
                    {bs.hoTen || bs.name || bs.ten}
                    {onlyTodayWorking && todayDoctorIds.includes(String(bs.userId || bs._id || bs.id)) && ' ✓'}
                  </option>
                ))}
              </select>
              <div className="form-check mt-2">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="onlyTodayWorkingChk" 
                  checked={onlyTodayWorking} 
                  onChange={e=> setOnlyTodayWorking(e.target.checked)} 
                />
                <label className="form-check-label" htmlFor="onlyTodayWorkingChk">
                  Chỉ hiển thị bác sĩ có lịch làm việc hôm nay
                  {onlyTodayWorking && todayDoctorIds.length > 0 && (
                    <span className="badge bg-success ms-2">{todayDoctorIds.length} BS</span>
                  )}
                </label>
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
              <button 
                className="btn btn-primary me-2" 
                disabled={creating || !specialtyId || !doctorId} 
                onClick={createAppointment}
              >
                {creating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle"></i> Tạo lịch ngay (giờ hiện tại)
                  </>
                )}
              </button>
              <button 
                className="btn btn-outline-secondary me-2" 
                disabled={!appointment || paymentProcessing} 
                onClick={issueQueueOnly}
              >
                <i className="bi bi-ticket"></i> Cấp STT (không thu phí)
              </button>
              <button 
                className="btn btn-success me-2" 
                disabled={!appointment || paymentProcessing} 
                onClick={()=>issueQueueAndPay('cash')}
              >
                {paymentProcessing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className="bi bi-cash"></i> Thu tiền mặt + cấp STT
                  </>
                )}
              </button>
              <button 
                className="btn btn-warning" 
                disabled={!appointment || paymentProcessing} 
                onClick={()=>issueQueueAndPay('momo')}
              >
                {paymentProcessing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className="bi bi-phone"></i> Thanh toán MoMo + cấp STT
                  </>
                )}
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
        <div className="card border-success">
          <div className="card-body">
            <h6 className="card-title text-success">
              <i className="bi bi-check-circle-fill"></i> STT đã cấp thành công
            </h6>
            <div className="row">
              <div className="col-md-6">
                <strong>Số thứ tự:</strong> 
                <span className="fs-3 text-primary ms-2">{ticket.soThuTu || ticket.stt || '-'}</span>
              </div>
              <div className="col-md-6">
                <div><strong>Ngày:</strong> {ticket.ngay || appointment?.ngayKham || '-'}</div>
                <div><strong>Giờ dự kiến:</strong> {appointment?.khungGio || '-'}</div>
                <div><strong>Trạng thái:</strong> {ticket.trangThai || 'Đang chờ'}</div>
              </div>
            </div>
            <button 
              className="btn btn-sm btn-outline-primary mt-2"
              onClick={printTicket}
            >
              <i className="bi bi-printer"></i> In phiếu
            </button>
          </div>
        </div>
      )}

      {/* <div className="card mt-3">
        <div className="card-body">
          <h6 className="card-title">Debug</h6>
          <div className="small text-muted">Xem chi tiết payload/response để tìm thiếu dữ liệu</div>
          <pre className="small bg-light p-2 border" style={{maxHeight:200, overflow:'auto'}}>{JSON.stringify({
            payload: lastPayload,
            response: lastResponse,
            selections: { benhNhanId, hoSoBenhNhanId, specialtyId, doctorId },
          }, null, 2)}</pre>
        </div>
      </div> */}
    </div>
  );
}
