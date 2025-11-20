import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function StaffEdit(){
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const [form, setForm] = useState({ hoTen:'', vaiTro:'reception', email:'', soDienThoai:'', diaChi:'' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(()=>{ if(!isNew) load(); /* eslint-disable-next-line */ }, [id]);

  async function load(){
    setError('');
    try{
      const res = await fetch(`${API_URL}/api/staff/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` } });
      const json = await res.json();
      if(!res.ok) throw json;
  setForm({ hoTen: json.hoTen||'', vaiTro: json.vaiTro||'reception', email: json.email||'', soDienThoai: json.soDienThoai||'', diaChi: json.diaChi||'' });
    }catch(e){ setError(e?.message||'Lỗi tải'); }
  }

  const onChange = e => setForm(prev=> ({ ...prev, [e.target.name]: e.target.value }));

  async function save(e){
    e.preventDefault(); setError(''); setOk('');
    try{
      const method = isNew? 'POST' : 'PUT';
      const url = isNew? `${API_URL}/api/staff` : `${API_URL}/api/staff/${id}`;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` }, body: JSON.stringify(form) });
      const json = await res.json();
      if(!res.ok) throw json;
      setOk('Đã lưu');
      if(isNew) navigate(`/admin/staff/${json._id}`);
    }catch(e){ setError(e?.message||'Lỗi lưu'); }
  }

  return (
    <div>
      <h3>{isNew? 'Thêm' : 'Sửa'} nhân viên</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}
      <form className="row g-3" onSubmit={save}>
        <div className="col-md-6"><label className="form-label">Họ tên</label><input name="hoTen" className="form-control" value={form.hoTen} onChange={onChange} required /></div>
        <div className="col-md-3"><label className="form-label">Vai trò</label>
          <select name="vaiTro" className="form-select" value={form.vaiTro} onChange={onChange}>
            <option value="reception">Lễ tân</option>
            <option value="lab">Cận lâm sàng</option>
            <option value="pharmacy">Nhà thuốc</option>
            <option value="cashier">Thu ngân</option>
            <option value="nurse">Điều dưỡng</option>
          </select>
        </div>
        <div className="col-md-6"><label className="form-label">Email</label><input type="email" name="email" className="form-control" value={form.email} onChange={onChange} /></div>
        <div className="col-md-6"><label className="form-label">Số điện thoại</label><input name="soDienThoai" className="form-control" value={form.soDienThoai} onChange={onChange} /></div>
        <div className="col-md-12"><label className="form-label">Địa chỉ</label><input name="diaChi" className="form-control" value={form.diaChi} onChange={onChange} /></div>
        <div className="col-12"><button className="btn btn-primary" type="submit">Lưu</button></div>
      </form>
    </div>
  );
}
