import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Intake(){
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  async function search(){
    setError('');
    try{
      if(!query.trim()){ setResults([]); return; }
      const res = await fetch(`${API_URL}/api/patients/search?q=${encodeURIComponent(query)}&limit=50`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` } });
      const json = await res.json();
      if(!res.ok) throw json;
      setResults(json);
    }catch(e){ setError(e?.message||'Lỗi tải'); }
  }

  return (
    <div>
      <h3>Tiếp nhận bệnh nhân</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-2 mb-3">
        <div className="col-sm-4">
          <input className="form-control" placeholder="Họ tên / SĐT / Mã BHYT" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') search(); }} />
        </div>
        <div className="col-sm-2">
          <button className="btn btn-primary w-100" onClick={search}><i className="bi bi-search"></i> Tìm</button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-striped">
          <thead><tr><th>Họ tên</th><th>SĐT</th><th>Ngày sinh</th><th></th></tr></thead>
          <tbody>
            {results.map(p=> (
              <tr key={p._id}>
                <td>{p.hoTen}</td><td>{p.soDienThoai||'-'}</td><td>{p.ngaySinh? new Date(p.ngaySinh).toLocaleDateString(): '-'}</td>
                <td>
                  {p._type === 'profile' ? (
                    <a className="btn btn-sm btn-outline-primary" href={`/reception/appointments?hoSoBenhNhanId=${p._id}`}>Đặt lịch</a>
                  ) : (
                    <a className="btn btn-sm btn-outline-primary" href={`/reception/appointments?benhNhanId=${p._id}`}>Đặt lịch</a>
                  )}
                </td>
              </tr>
            ))}
            {results.length===0 && <tr><td colSpan={4} className="text-center">Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
