import React, { useState } from 'react';
import PageHeader from '../../components/reception/PageHeader';
import Card from '../../components/reception/Card';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export default function Lookup(){
  const [q,setQ]=useState('');
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(false);
  async function search(){
    if(!q.trim()){ setItems([]); return; }
    setLoading(true);
    try{
      const res = await fetch(`${API_URL}/api/patients/search?q=${encodeURIComponent(q)}&limit=50`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` }});
      const json = await res.json();
      if(res.ok) setItems(json || []);
      else setItems([]);
    }catch(e){
      console.error(e);
      setItems([]);
    }finally{ setLoading(false); }
  }
  return (
    <div className="container rc-page">
      <PageHeader title="Tra cứu bệnh nhân" subtitle="Tìm theo họ tên, SĐT hoặc mã BHYT" />
      <Card>
        <div className="row g-2 mb-3">
          <div className="col-md-6"><input className="form-control" placeholder="Họ tên / SĐT / Mã BHYT" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') search(); }} /></div>
          <div className="col-md-2"><button className="btn btn-primary w-100" onClick={search}><i className="bi bi-search"></i> Tìm</button></div>
        </div>
        <ul className="list-group">
          {loading && <li className="list-group-item text-center">Đang tìm...</li>}
          {items.map(p=> (
            <li className="list-group-item" key={p._id}>
              <div className="fw-bold">{p.hoTen} {p.ngaySinh ? `• ${new Date(p.ngaySinh).toLocaleDateString()}` : ''}</div>
              <div className="text-muted">SDT: {p.soDienThoai || '-'} • BHYT: {p.maBHYT || '-'}</div>
              <div>{p.diaChi || ''}</div>
              {p.relatives && p.relatives.length > 0 && (
                <div className="mt-2">
                  <div className="small text-secondary">Hồ sơ người thân:</div>
                  <ul className="list-unstyled ms-2">
                    {p.relatives.map(r => (
                      <li key={r._id} className="small">
                        {r.hoTen} ({r.quanHe}) • {r.soDienThoai || '-'} • Mã: {r.maHoSo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-2">
                <button className="btn btn-sm btn-outline-primary me-2" onClick={async ()=>{
                  try{
                    const res = await fetch(`${API_URL}/api/patients/${p._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` }});
                    if(!res.ok) return alert('Không thể lấy chi tiết');
                    const d = await res.json();
                    alert(JSON.stringify(d, null, 2));
                  }catch(e){ console.error(e); alert('Lỗi'); }
                }}>Mở</button>
              </div>
            </li>
          ))}
          {(!loading && items.length===0) && <li className="list-group-item text-center">Không có dữ liệu</li>}
        </ul>
      </Card>
    </div>
  );
}
