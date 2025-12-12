/**
 * FILE: Appointments.jsx
 * MÔ TẢ: Trang đặt lịch khám cho lễ tân (khách vãng lai)
 * Chức năng:
 * - Chọn chuyên khoa, bác sĩ, ngày khám, khung giờ
 * - Tạo lịch hẹn mới
 * - Thanh toán tiền mặt hoặc MoMo
 * - Cấp số thứ tự tự động sau thanh toán
 */

import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/reception/PageHeader';
import Card from '../../components/reception/Card';
import { createCashPayment, createMomoPayment } from '../../api/payments';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ReceptionAppointments(){
  // Lấy tham số từ URL (nếu có)
  const urlParams = new URLSearchParams(location.search);
  const initialBenhNhanId = urlParams.get('benhNhanId') || '';
  const initialHoSoId = urlParams.get('hoSoBenhNhanId') || '';
  const initialHoSoKhamId = urlParams.get('hoSoKhamId') || '';
  
  // State quản lý thông tin bệnh nhân
  const [benhNhanId, setBenhNhanId] = useState(initialBenhNhanId);
  const [hoSoBenhNhanId, setHoSoBenhNhanId] = useState(initialHoSoId);
  const [hoSoKhamId, setHoSoKhamId] = useState(initialHoSoKhamId);
  
  // State quản lý đặt lịch
  const [specialties, setSpecialties] = useState([]); // Danh sách chuyên khoa
  const [chuyenKhoaId, setChuyenKhoaId] = useState(''); // Chuyên khoa được chọn
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10)); // Ngày khám
  const [availability, setAvailability] = useState(null); // Lịch trống của bác sĩ
  const [selected, setSelected] = useState({ bacSiId: '', khungGio: ''}); // Bác sĩ và giờ được chọn
  const [appt, setAppt] = useState(null); // Lịch hẹn vửa tạo
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
        khungGio: selected.khungGio,
      };
      if(benhNhanId) body.benhNhanId = benhNhanId;
      if(hoSoBenhNhanId) body.hoSoBenhNhanId = hoSoBenhNhanId;
      if(hoSoKhamId) body.hoSoKhamId = hoSoKhamId;

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
      return json;
    }catch(e){ alert(e?.message||'Lỗi đặt lịch'); }
  }

  async function payAndQueue(apptId){
    try{
      const id = apptId || appt?._id;
      if(!id) throw new Error('Chưa có lịch hẹn để cấp STT');
      const res = await fetch(`${API_URL}/api/booking/appointments/${id}/pay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}` }
      });
      const json = await res.json();
      if(!res.ok) throw json;
      alert(`Số thứ tự: ${json.soThuTu?.soThuTu}`);
    }catch(e){ alert(e?.message||'Lỗi thanh toán'); }
  }

  async function createAndQueue(){
    // Convenience for walk-in: create appointment and immediately issue STT
    const created = appt || await createAppointment();
    if(created?._id){ await payAndQueue(created._id); }
  }

  async function payCash150k(){
    try{
      if(!hoSoKhamId) throw new Error('Vui lòng nhập Hồ sơ khám ID để thanh toán');
      const resp = await createCashPayment({
        hoSoKhamId,
        amount: 150000,
        // Payment target is the visit record; do not pass orderRefs for hosokham
        targetType: 'hosokham'
      });
      await payAndQueue();
    }catch(e){ alert(e?.response?.data?.message || e.message || 'Lỗi thanh toán tiền mặt'); }
  }

  async function payMomo150k(){
    try{
      if(!hoSoKhamId) throw new Error('Vui lòng nhập Hồ sơ khám ID để thanh toán');
      const returnUrl = window.location.origin + '/reception/appointments';
      const notifyUrl = window.location.origin + '/api/payments/momo/notify';
      const resp = await createMomoPayment({
        hoSoKhamId,
        amount: 150000,
        orderInfo: appt ? `Thanh toán hồ sơ #${hoSoKhamId}` : 'Thanh toán hồ sơ',
        // For hosokham, omit orderRefs to avoid ObjectId cast error
        targetType: 'hosokham',
        returnUrl,
        notifyUrl,
      });
      if(resp?.momo?.payUrl){ window.open(resp.momo.payUrl, '_blank'); }
    }catch(e){ alert(e?.response?.data?.message || e.message || 'Lỗi tạo thanh toán MoMo'); }
  }

  return (
    <div className="container rc-page">
      <PageHeader title="Đặt lịch" subtitle="Tạo lịch hẹn và thu phí đặt lịch" />
      {error && <div className="alert alert-danger">{error}</div>}
      {(benhNhanId || hoSoBenhNhanId) && (
        <div className="alert alert-info">
          <i className="bi bi-info-circle"></i> Đang đặt lịch cho: <strong>{benhNhanId ? `Bệnh nhân ID: ${benhNhanId}` : `Hồ sơ người thân ID: ${hoSoBenhNhanId}`}</strong>
        </div>
      )}

      <Card>
        <div className="row g-2 mb-3">
          <div className="col-md-3">
            <label className="form-label">Bệnh nhân ID</label>
            <input className="form-control" value={benhNhanId} onChange={e=>setBenhNhanId(e.target.value)} placeholder="Hoặc nhập thủ công" disabled={!!hoSoBenhNhanId} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Hồ sơ người thân ID</label>
            <input className="form-control" value={hoSoBenhNhanId} onChange={e=>setHoSoBenhNhanId(e.target.value)} placeholder="Hoặc nhập thủ công" disabled={!!benhNhanId} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Hồ sơ khám ID</label>
            <input className="form-control" value={hoSoKhamId} onChange={e=>setHoSoKhamId(e.target.value)} placeholder="Nhập ID hồ sơ khám để thu 150k" />
          </div>
          <div className="col-md-3">
            <label className="form-label">Chuyên khoa</label>
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

        <div className="mt-3 d-flex justify-content-end">
          <button className="btn btn-success" disabled={(!benhNhanId && !hoSoBenhNhanId) || !chuyenKhoaId || !selected.bacSiId || !selected.khungGio} onClick={createAppointment}><i className="bi bi-calendar-check"></i> Đặt lịch</button>
        </div>
      </Card>

      {appt && (
        <Card>
          <div>
            Đã tạo lịch hẹn #{appt._id}. Trạng thái: {appt.trangThai}.
            <div className="mt-2 d-flex gap-2">
              <button className="btn btn-sm btn-success" onClick={payCash150k}><i className="bi bi-cash-coin me-1"></i>Thanh toán tiền mặt 150k</button>
              <button className="btn btn-sm btn-warning" onClick={payMomo150k}><i className="bi bi-phone me-1"></i>Thanh toán MoMo 150k</button>
              <button className="btn btn-sm btn-primary" onClick={() => payAndQueue()}><i className="bi bi-ticket-perforated me-1"></i>Cấp số thứ tự</button>
            </div>
          </div>
        </Card>
      )}

      {!appt && (
        <Card>
          <div className="d-flex justify-content-end">
            <button className="btn btn-primary" disabled={(!benhNhanId && !hoSoBenhNhanId) || !chuyenKhoaId || !selected.bacSiId || !selected.khungGio} onClick={createAndQueue}>
              <i className="bi bi-check2-circle me-1"></i>Đặt và cấp STT
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
