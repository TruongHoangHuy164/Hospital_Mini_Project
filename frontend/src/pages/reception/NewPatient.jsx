import React, { useState } from 'react';
import PageHeader from '../../components/reception/PageHeader';
import Card from '../../components/reception/Card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function NewPatient(){
  const [form, setForm] = useState({ hoTen: '', soDienThoai: '', maBHYT: '', ngaySinh: '', gioiTinh: 'khac', diaChi: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e){
    e.preventDefault(); setError(''); setOk('');
    try{
      const res = await fetch(`${API_URL}/api/booking/patients`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` }, body: JSON.stringify({ ...form }) });
      const json = await res.json();
      if(!res.ok) throw json;
      setOk('Tạo thành công');
    }catch(e){ setError(e?.message||'Lỗi'); }
  }
  return (
    <div className="container rc-page">
      <PageHeader title="Tạo hồ sơ bệnh nhân" subtitle="Nhập thông tin cơ bản để khởi tạo hồ sơ" />
      {error && <div className="alert alert-danger">{error}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}
      <Card>
        <form className="row g-3" onSubmit={submit}>
          <div className="col-md-6"><label className="form-label">Họ tên</label><input required name="hoTen" className="form-control" value={form.hoTen} onChange={onChange} /></div>
          <div className="col-md-6"><label className="form-label">Số điện thoại</label><input name="soDienThoai" className="form-control" value={form.soDienThoai} onChange={onChange} /></div>
          <div className="col-md-6"><label className="form-label">Mã BHYT</label><input name="maBHYT" className="form-control" value={form.maBHYT} onChange={onChange} /></div>
          <div className="col-md-4"><label className="form-label">Ngày sinh</label><input name="ngaySinh" type="date" className="form-control" value={form.ngaySinh} onChange={onChange} /></div>
          <div className="col-md-4"><label className="form-label">Giới tính</label>
            <select name="gioiTinh" className="form-select" value={form.gioiTinh} onChange={onChange}>
              <option value="nam">Nam</option>
              <option value="nu">Nữ</option>
              <option value="khac">Khác</option>
            </select>
          </div>
          <div className="col-md-12"><label className="form-label">Địa chỉ</label><input name="diaChi" className="form-control" value={form.diaChi} onChange={onChange} /></div>
          <div className="col-12 d-flex justify-content-end"><button className="btn btn-primary" type="submit"><i className="bi bi-save"></i> Lưu</button></div>
        </form>
      </Card>
    </div>
  );
}
