import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function StaffIndex(){
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [vaiTro, setVaiTro] = useState('');
  const [error, setError] = useState('');

  async function load(){
    setError('');
    try{
      const params = new URLSearchParams({ q, vaiTro });
      const res = await fetch(`${API_URL}/api/staff?${params.toString()}`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` } });
      const json = await res.json();
      if(!res.ok) throw json;
      setItems(json.items || []);
    }catch(e){ setError(e?.message||'Lỗi tải'); }
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, []);

  async function remove(id){
    if(!confirm('Xóa nhân viên?')) return;
    const res = await fetch(`${API_URL}/api/staff/${id}`, { method:'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` } });
    if(res.ok) load();
  }

  async function provision(id){
    const res = await fetch(`${API_URL}/api/staff/${id}/provision-account`, { method:'POST', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` } });
    const json = await res.json();
    if(res.ok) alert(json.message || 'Đã cấp tài khoản'); else alert(json.message || 'Lỗi');
    load();
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
  <h3>Quản lý nhân viên (Lễ tân / CLS / Thu ngân / Điều dưỡng)</h3>
        <Link to="/admin/staff/new" className="btn btn-primary">Thêm nhân viên</Link>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-2 mb-3">
        <div className="col-md-4"><input className="form-control" placeholder="Tìm theo tên" value={q} onChange={e=>setQ(e.target.value)} /></div>
        <div className="col-md-3">
          <select className="form-select" value={vaiTro} onChange={e=>setVaiTro(e.target.value)}>
            <option value="">Tất cả vai trò</option>
            <option value="reception">Lễ tân</option>
            <option value="lab">Cận lâm sàng</option>
            <option value="cashier">Thu ngân</option>
            <option value="pharmacy">Nhà thuốc</option>
            <option value="nurse">Điều dưỡng</option>
          </select>
        </div>
        <div className="col-md-2"><button className="btn btn-outline-primary w-100" onClick={load}>Lọc</button></div>
      </div>
      <div className="table-responsive">
        <table className="table table-striped">
          <thead><tr><th>Họ tên</th><th>Vai trò</th><th>Email</th><th>SĐT</th><th>Tài khoản</th><th></th></tr></thead>
          <tbody>
            {items.map(it=> (
              <tr key={it._id}>
                <td>{it.hoTen}</td>
                <td>{it.vaiTro}</td>
                <td>{it.email||'-'}</td>
                <td>{it.soDienThoai||'-'}</td>
                <td>{it.userId? 'Đã cấp' : 'Chưa có'}</td>
                <td className="text-nowrap">
                  <Link to={`/admin/staff/${it._id}`} className="btn btn-sm btn-outline-secondary me-2">Sửa</Link>
                  <button className="btn btn-sm btn-outline-danger me-2" onClick={()=>remove(it._id)}>Xóa</button>
                  {!it.userId && <button className="btn btn-sm btn-success" onClick={()=>provision(it._id)}>Cấp tài khoản</button>}
                </td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={6} className="text-center">Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
