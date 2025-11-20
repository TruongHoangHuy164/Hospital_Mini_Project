import React, { useState } from 'react'
import PageHeader from '../../components/reception/PageHeader'
import Card from '../../components/reception/Card'
import SearchBar from '../../components/reception/SearchBar'

export default function ReceptionDoctors(){
  const [q, setQ] = useState('')
  const [doctors, setDoctors] = useState([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [date, setDate] = useState(()=> new Date().toISOString().slice(0,10))
  const [appointments, setAppointments] = useState([])
  const [apptLoading, setApptLoading] = useState(false)
  const [editTarget, setEditTarget] = useState(null) // appointment id
  const [newTime, setNewTime] = useState('')
  const [newDate, setNewDate] = useState(()=> new Date().toISOString().slice(0,10))
  const [reassignMode, setReassignMode] = useState(false)
  const [searchOtherQ, setSearchOtherQ] = useState('')
  const [otherDoctors, setOtherDoctors] = useState([])
  const [otherLoading, setOtherLoading] = useState(false)
  const [newDoctorId, setNewDoctorId] = useState('')

  async function searchDoctors(e){
    e && e.preventDefault();
    setMsg(''); setLoading(true);
    try {
      const resp = await fetch(`/api/public/doctors?q=${encodeURIComponent(q)}&limit=50`);
      const ct = resp.headers.get('content-type') || '';
      if(!resp.ok){
        if(ct.includes('application/json')){
          const j = await resp.json().catch(()=>({}));
          setMsg(j.message || 'Không lấy được danh sách bác sĩ');
        } else {
          setMsg(`Lỗi bác sĩ (${resp.status})`);
        }
        setLoading(false); return;
      }
      if(!ct.includes('application/json')){ setMsg('Phản hồi không phải JSON'); setLoading(false); return; }
      const items = await resp.json();
      setDoctors(items);
    } catch(err){ setMsg('Lỗi mạng khi tìm bác sĩ'); }
    setLoading(false);
  }

  async function loadAppointments(d, dateStr){
    if(!d) return;
    setApptLoading(true); setAppointments([]); setMsg('');
    try {
      const accessToken = localStorage.getItem('accessToken') || '';
      const resp = await fetch(`/api/booking/doctor-appointments?bacSiId=${encodeURIComponent(d._id)}&date=${encodeURIComponent(dateStr)}`, {
        headers: { Authorization: accessToken?`Bearer ${accessToken}`:'' }
      });
      const ct = resp.headers.get('content-type')||'';
      if(!resp.ok){
        if(ct.includes('application/json')){
          const j = await resp.json().catch(()=>({}));
          if(resp.status === 401) setMsg('Chưa đăng nhập hoặc token hết hạn');
          else if(resp.status === 403) setMsg('Tài khoản không có quyền xem lịch bác sĩ');
          else setMsg(j.message || 'Không lấy được lịch khám');
        } else setMsg(`Lỗi lịch khám (${resp.status})`);
        setApptLoading(false); return;
      }
      if(!ct.includes('application/json')){ setMsg('Phản hồi lịch khám không phải JSON'); setApptLoading(false); return; }
      const items = await resp.json();
      setAppointments(items);
    } catch(err){ setMsg('Lỗi mạng khi tải lịch khám'); }
    setApptLoading(false);
  }

  function openEdit(appt, mode){
    setEditTarget(appt);
    setNewTime(appt.khungGio || '');
    setNewDate(date);
    setReassignMode(mode === 'reassign');
    setNewDoctorId('');
    setOtherDoctors([]);
  }

  async function submitChangeTime(){
    if(!editTarget) return;
    setMsg('');
    try {
      const body = { khungGio: newTime, date: newDate };
      const accessToken = localStorage.getItem('accessToken') || '';
      const resp = await fetch(`/api/booking/appointments/${editTarget._id}/time`, {
        method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: accessToken?`Bearer ${accessToken}`:'' }, body: JSON.stringify(body)
      });
      const j = await resp.json().catch(()=>({}));
      if(!resp.ok) return setMsg(j.message || 'Đổi giờ thất bại');
      setMsg('Đổi giờ thành công');
      setEditTarget(null);
      loadAppointments(selectedDoctor, date);
    } catch(err){ setMsg('Lỗi mạng đổi giờ'); }
  }

  async function searchOtherDoctors(){
    setOtherLoading(true); setOtherDoctors([]);
    try {
      const resp = await fetch(`/api/public/doctors?q=${encodeURIComponent(searchOtherQ)}&limit=20`);
      const ct = resp.headers.get('content-type')||'';
      if(resp.ok && ct.includes('application/json')){
        const items = await resp.json(); setOtherDoctors(items);
      }
    } catch(err){ /* ignore */ }
    setOtherLoading(false);
  }

  async function submitReassign(){
    if(!editTarget || !newDoctorId) return setMsg('Chọn bác sĩ mới');
    setMsg('');
    try {
      const body = { bacSiId: newDoctorId, khungGio: newTime, date: newDate };
      const accessToken = localStorage.getItem('accessToken') || '';
      const resp = await fetch(`/api/booking/appointments/${editTarget._id}/reassign`, {
        method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: accessToken?`Bearer ${accessToken}`:'' }, body: JSON.stringify(body)
      });
      const j = await resp.json().catch(()=>({}));
      if(!resp.ok) return setMsg(j.message || 'Chuyển bác sĩ thất bại');
      setMsg('Chuyển bác sĩ thành công');
      setEditTarget(null); setReassignMode(false);
      loadAppointments(selectedDoctor, date);
    } catch(err){ setMsg('Lỗi mạng chuyển bác sĩ'); }
  }

  return (
    <div className="container rc-page">
      <PageHeader title="Danh sách bác sĩ" subtitle="& quản lý lịch hẹn" />
      {msg && <div className="alert alert-warning">{msg}</div>}

      <Card title="Tìm bác sĩ">
        <SearchBar value={q} onChange={setQ} onSubmit={searchDoctors} placeholder="Nhập tên bác sĩ" loading={loading} />
        <ul className="rc-list mt-3">
          {doctors.map(d=> (
            <li key={d._id} className={`rc-list-item ${selectedDoctor?._id===d._id?'active':''}`} onClick={()=>{ setSelectedDoctor(d); loadAppointments(d, date); }}>
              <strong>{d.hoTen}</strong> {d.chuyenKhoa?`- ${d.chuyenKhoa}`:''}
            </li>
          ))}
          {doctors.length===0 && <li className="rc-list-item">Chưa có dữ liệu. Hãy tìm theo tên.</li>}
        </ul>
      </Card>

      {selectedDoctor && (
        <Card title={`Lịch hẹn của ${selectedDoctor.hoTen}`}
          right={<div className="d-flex align-items-center gap-2"><i className="bi bi-calendar3"></i><input type="date" className="form-control form-control-sm" value={date} onChange={e=>{setDate(e.target.value); loadAppointments(selectedDoctor, e.target.value);} } /></div>}
        >
          {apptLoading && <div>Đang tải...</div>}
          <div className="table-responsive">
            <table className="table table-sm rc-table">
              <thead>
                <tr>
                  <th>Giờ</th>
                  <th>Bệnh nhân</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {appointments.length===0 && !apptLoading && <tr><td colSpan="4" className="text-muted">Không có lịch hẹn</td></tr>}
                {appointments.map(a=> (
                  <tr key={a._id}>
                    <td>{a.khungGio}</td>
                    <td>{a.benhNhanHoTen}</td>
                    <td><span className="badge text-bg-light">{a.trangThai}</span></td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={()=>openEdit(a,'time')}><i className="bi bi-clock"></i> Đổi giờ</button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={()=>openEdit(a,'reassign')}><i className="bi bi-arrow-left-right"></i> Chuyển bác sĩ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editTarget && (
        <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div className="rc-card" style={{minWidth:360}}>
            <div className="rc-card-header">
              <div className="rc-card-title">{reassignMode? 'Chuyển bác sĩ' : 'Đổi giờ khám'}</div>
            </div>
            <div className="rc-card-body">
              <div className="mb-2">Bệnh nhân: <strong>{editTarget.benhNhanHoTen}</strong></div>
              <div className="mb-2">Bác sĩ hiện tại: {selectedDoctor?.hoTen}</div>
              <label className="form-label">Ngày khám mới</label>
              <input type="date" className="form-control mb-2" value={newDate} onChange={e=>setNewDate(e.target.value)} />
              <label className="form-label">Khung giờ mới</label>
              <input className="form-control mb-3" placeholder="08:30" value={newTime} onChange={e=>setNewTime(e.target.value)} />
            {reassignMode && (
              <div className="mb-3">
                <label className="form-label">Tìm bác sĩ khác</label>
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  <input className="form-control" value={searchOtherQ} onChange={e=>setSearchOtherQ(e.target.value)} placeholder="Tên bác sĩ" />
                  <button className="btn btn-outline-primary" type="button" onClick={searchOtherDoctors} disabled={otherLoading}>{otherLoading?'...':'Tìm'}</button>
                </div>
                <div style={{maxHeight:150,overflowY:'auto',border:'1px solid #ddd'}}>
                  {otherDoctors.map(o=> (
                    <div key={o._id} style={{padding:6,cursor:'pointer',background:newDoctorId===o._id?'#def':'transparent'}} onClick={()=>setNewDoctorId(o._id)}>
                      {o.hoTen} {o.chuyenKhoa?`- ${o.chuyenKhoa}`:''}
                    </div>
                  ))}
                  {otherDoctors.length===0 && <div style={{padding:6}}>Chưa có kết quả</div>}
                </div>
              </div>
            )}
              <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-secondary" onClick={()=>{setEditTarget(null); setReassignMode(false);}}>Đóng</button>
                {!reassignMode && <button className="btn btn-primary" onClick={submitChangeTime}>Lưu</button>}
                {reassignMode && <button className="btn btn-primary" onClick={submitReassign} disabled={!newDoctorId}>Chuyển</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
