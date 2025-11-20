import React, { useState } from 'react'
import PageHeader from '../../components/reception/PageHeader'
import Card from '../../components/reception/Card'
import SearchBar from '../../components/reception/SearchBar'

export default function ReceptionSchedule(){
  const [q, setQ] = useState('')
  const [doctors, setDoctors] = useState([])
  const [msg, setMsg] = useState('')
  const [selected, setSelected] = useState(null)
  const [today, setToday] = useState(()=> new Date().toISOString().slice(0,10))
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(false)

  async function searchDoctors(e){
    e && e.preventDefault();
    setMsg('');
    try {
      // Dùng endpoint public vì /api/doctors yêu cầu role admin
      const resp = await fetch(`/api/public/doctors?q=${encodeURIComponent(q)}&limit=50`);
      const ct = resp.headers.get('content-type') || '';
      if(!resp.ok){
        if(ct.includes('application/json')){
          const j = await resp.json().catch(()=>({}));
          return setMsg(j.message || 'Không lấy được danh sách bác sĩ');
        } else {
          return setMsg(`Lỗi bác sĩ (${resp.status})`);
        }
      }
      if(!ct.includes('application/json')) return setMsg('Phản hồi không phải JSON');
      const items = await resp.json();
      setDoctors(items);
    } catch(err){ setMsg('Lỗi mạng khi tìm bác sĩ'); }
  }

  async function loadPatientsForDoctor(d, dateStr){
    if(!d) return;
    setMsg(''); setLoading(true); setPatients([]);
    try{
      const url = `/api/booking/queues?date=${encodeURIComponent(dateStr)}&bacSiId=${encodeURIComponent(d._id)}`;
      const resp = await fetch(url);
      const ct = resp.headers.get('content-type') || '';
      if(!resp.ok){
        if(ct.includes('application/json')){
          const j = await resp.json().catch(()=>({}));
          setMsg(j.message || `Không lấy được danh sách bệnh nhân (${resp.status})`);
        } else {
          setMsg(`Không lấy được danh sách bệnh nhân (${resp.status})`);
        }
        setLoading(false); return;
      }
      if(!ct.includes('application/json')){ setMsg('Phản hồi không phải JSON'); setLoading(false); return; }
      const items = await resp.json();
      setPatients(Array.isArray(items) ? items : []);
    }catch(err){ setMsg('Lỗi mạng khi tải danh sách bệnh nhân'); }
    setLoading(false);
  }

  return (
    <div className="container rc-page">
      <PageHeader title="Lịch bệnh nhân theo bác sĩ" />
      {msg && <div className="alert alert-warning">{msg}</div>}

      <Card title="Tìm bác sĩ">
        <SearchBar value={q} onChange={setQ} onSubmit={searchDoctors} placeholder="Nhập tên bác sĩ" />
        <ul className="rc-list mt-3">
          {doctors.map(d=> (
            <li key={d._id} className={`rc-list-item ${selected?._id===d._id?'active':''}`} onClick={()=>{ setSelected(d); loadPatientsForDoctor(d, today); }}>
              <strong>{d.hoTen}</strong> {d.chuyenKhoa?`- ${d.chuyenKhoa}`:''}
            </li>
          ))}
          {doctors.length===0 && <li className="rc-list-item">Chưa có dữ liệu. Hãy tìm theo tên.</li>}
        </ul>
      </Card>

      {selected && (
        <Card
          title={`Bệnh nhân ngày ${today.split('-').reverse().join('/')}`}
          right={<div className="d-flex align-items-center gap-2"><i className="bi bi-calendar3"></i><input type="date" className="form-control form-control-sm" value={today} onChange={e=>setToday(e.target.value)} /><button className="btn btn-sm btn-primary" onClick={()=>loadPatientsForDoctor(selected, today)} disabled={loading}>{loading?'Đang tải...':'Xem'}</button></div>}
        >
          <div className="table-responsive">
            <table className="table table-sm rc-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Giờ</th>
                  <th>Tên bệnh nhân</th>
                  <th>SĐT</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {patients.length===0 && (
                  <tr><td colSpan="5" className="text-muted">Chưa có bệnh nhân</td></tr>
                )}
                {patients.map((p, idx)=> (
                  <tr key={p.lichKhamId || idx}>
                    <td>{p.soThuTu ?? '-'}</td>
                    <td>{p.khungGio || '-'}</td>
                    <td>{p.benhNhan?.hoTen || '-'}</td>
                    <td>{p.benhNhan?.soDienThoai || '-'}</td>
                    <td>{p.trangThai || 'dang_cho'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
