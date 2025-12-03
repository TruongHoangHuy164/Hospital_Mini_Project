import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProvinces, fetchDistricts, fetchWards } from '../../api/location';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Intake(){
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  // Phone/Email-based workflow
  const [contact, setContact] = useState('');
  const [lookup, setLookup] = useState(null); // { exists, user, selfPatient, relatives }
  const [lookupError, setLookupError] = useState('');
  const [provisionName, setProvisionName] = useState('');
  const [provisionEmail, setProvisionEmail] = useState('');
  const [creatingForUserId, setCreatingForUserId] = useState('');
  const [newProfile, setNewProfile] = useState({ 
    hoTen: '', 
    ngaySinh: '', 
    gioiTinh: 'Nam', 
    soDienThoai: '', 
    email: '',
    cccd: '',
    tinhThanh: '',
    quanHuyen: '',
    phuongXa: '',
    diaChi: '',
    quanHe: '',
    tinhThanhCode: '',
    quanHuyenCode: '',
    phuongXaCode: ''
  });
  // Location lists & loading/error
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const token = localStorage.getItem('accessToken') || '';

  async function search(){
    setError('');
    try{
      if(!query.trim()){ setResults([]); return; }
      const res = await fetch(`${API_URL}/api/patients/search?q=${encodeURIComponent(query)}&limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if(!res.ok) throw json;
      setResults(json);
    }catch(e){ setError(e?.message||'Lỗi tải'); }
  }

  async function checkByContact(){
    setLookupError('');
    setLookup(null);
    setCreatingForUserId('');
    try{
      const c = String(contact||'').trim();
      if(!c){ setLookup(null); return; }
      const res = await fetch(`${API_URL}/api/patients/user-by-contact?contact=${encodeURIComponent(c)}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if(!res.ok) throw json;
      setLookup(json);
      if(json?.user?.id || json?.user?._id){
        setCreatingForUserId(json.user.id || json.user._id);
      }
    }catch(e){ setLookupError(e?.message||'Lỗi tra cứu'); }
  }

  async function provisionUser(){
    setLookupError('');
    try{
      const c = contact.trim();
      const body = { name: provisionName };
      
      // Determine if contact is email or phone
      if(c.includes('@')){
        body.email = c;
      } else {
        body.phone = c;
      }
      
      // Add optional email if provided separately
      if(provisionEmail && provisionEmail.trim()){
        body.email = provisionEmail.trim();
      }
      
      const res = await fetch(`${API_URL}/api/patients/provision-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if(!res.ok) throw json;
      // Refresh lookup
      setProvisionName('');
      setProvisionEmail('');
      await checkByContact();
    }catch(e){ setLookupError(e?.message||'Lỗi cấp tài khoản'); }
  }

  async function createRelativeProfile(){
    setLookupError('');
    try{
      const userId = creatingForUserId;
      if(!userId) throw { message: 'Thiếu userId' };
      const payload = { ...newProfile };
      const res = await fetch(`${API_URL}/api/patients/${encodeURIComponent(userId)}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if(!res.ok) throw json;
      // Refresh lookup to include new relative
      setNewProfile({ 
        hoTen: '', 
        ngaySinh: '', 
        gioiTinh: 'Nam', 
        soDienThoai: '', 
        email: '',
        cccd: '',
        tinhThanh: '',
        quanHuyen: '',
        phuongXa: '',
        diaChi: '',
        quanHe: '',
        tinhThanhCode: '',
        quanHuyenCode: '',
        phuongXaCode: ''
      });
      await checkByContact();
    }catch(e){ setLookupError(e?.message||'Lỗi tạo hồ sơ người thân'); }
  }

  // Load provinces once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLocLoading(true); setLocError('');
        const data = await fetchProvinces();
        if(mounted) setProvinces(data);
      } catch (e){ if(mounted) setLocError(e.message); }
      finally { if(mounted) setLocLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  // When province changes fetch districts
  useEffect(() => {
    let mounted = true;
    (async () => {
      const code = newProfile.tinhThanhCode;
      if(!code){ setDistricts([]); setWards([]); return; }
      try {
        setLocLoading(true); setLocError('');
        const data = await fetchDistricts(code);
        if(mounted){
          setDistricts(data);
          const provinceObj = provinces.find(p => String(p.code) === String(code));
          setNewProfile(p => ({ ...p, tinhThanh: provinceObj ? provinceObj.name : p.tinhThanh, quanHuyenCode: '', phuongXaCode: '', quanHuyen: '', phuongXa: '' }));
          setWards([]);
        }
      } catch(e){ if(mounted) setLocError(e.message); }
      finally { if(mounted) setLocLoading(false); }
    })();
    return () => { mounted = false; };
  }, [newProfile.tinhThanhCode, provinces]);

  // When district changes fetch wards
  useEffect(() => {
    let mounted = true;
    (async () => {
      const code = newProfile.quanHuyenCode;
      if(!code){ setWards([]); return; }
      try {
        setLocLoading(true); setLocError('');
        const data = await fetchWards(code);
        if(mounted){
          setWards(data);
          const distObj = districts.find(d => String(d.code) === String(code));
          setNewProfile(p => ({ ...p, quanHuyen: distObj ? distObj.name : p.quanHuyen, phuongXaCode: '', phuongXa: '' }));
        }
      } catch(e){ if(mounted) setLocError(e.message); }
      finally { if(mounted) setLocLoading(false); }
    })();
    return () => { mounted = false; };
  }, [newProfile.quanHuyenCode, districts]);

  // When ward code changes, set ward name
  useEffect(() => {
    const code = newProfile.phuongXaCode;
    const wardObj = wards.find(w => String(w.code) === String(code));
    if(wardObj){ setNewProfile(p => ({ ...p, phuongXa: wardObj.name })); }
    else if(!code){ setNewProfile(p => ({ ...p, phuongXa: '' })); }
  }, [newProfile.phuongXaCode, wards]);

  return (
    <div>
      <h3>Tiếp nhận bệnh nhân</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {/* <div className="row g-2 mb-3">
        <div className="col-sm-4">
          <input className="form-control" placeholder="Họ tên / SĐT / Mã BHYT" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') search(); }} />
        </div>
        <div className="col-sm-2">
          <button className="btn btn-primary w-100" onClick={search}><i className="bi bi-search"></i> Tìm</button>
        </div>
      </div> */}

      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title">Tra cứu theo SĐT / Email & cấp tài khoản</h5>
          {lookupError && <div className="alert alert-danger">{lookupError}</div>}
          <div className="row g-2 align-items-end">
            <div className="col-sm-4">
              <label className="form-label">Số điện thoại hoặc Email</label>
              <input 
                className="form-control" 
                placeholder="VD: 0987... hoặc email@example.com" 
                value={contact} 
                onChange={e=>setContact(e.target.value)} 
                onKeyDown={e=>{ if(e.key==='Enter') checkByContact(); }} 
              />
            </div>
            <div className="col-sm-2">
              <button className="btn btn-outline-primary w-100" onClick={checkByContact}>
                <i className="bi bi-search"></i> Kiểm tra
              </button>
            </div>
          </div>

          {lookup && !lookup.exists && (
            <div className="mt-3">
              <div className="alert alert-warning">Chưa có tài khoản cho thông tin này.</div>
              <div className="row g-2 align-items-end">
                <div className="col-sm-3">
                  <label className="form-label">Tên hiển thị (tùy chọn)</label>
                  <input 
                    className="form-control" 
                    value={provisionName} 
                    onChange={e=>setProvisionName(e.target.value)} 
                    placeholder="Ví dụ: Nguyễn Văn A" 
                  />
                </div>
                <div className="col-sm-3">
                  <label className="form-label">Email (nếu chưa nhập)</label>
                  <input 
                    type="email"
                    className="form-control" 
                    value={provisionEmail} 
                    onChange={e=>setProvisionEmail(e.target.value)} 
                    placeholder="email@example.com"
                    disabled={contact.includes('@')}
                  />
                </div>
                <div className="col-sm-3">
                  <button className="btn btn-success" onClick={provisionUser}>
                    <i className="bi bi-person-plus"></i> Cấp tài khoản (mật khẩu 123456)
                  </button>
                </div>
              </div>
            </div>
          )}

          {lookup && lookup.exists && (
            <div className="mt-3">
              <div className="mb-2"><strong>Tài khoản:</strong> {lookup.user?.name} — {lookup.user?.phone || '-'} {lookup.user?.email ? `— ${lookup.user.email}` : ''}</div>
              {lookup.selfPatient ? (
                <div className="mb-2">Hồ sơ chính: <Link className="btn btn-sm btn-outline-primary" to={`/reception/direct-booking?benhNhanId=${lookup.selfPatient._id}`}>Đặt lịch cho người này</Link></div>
              ) : (
                <div className="mb-2 text-muted">Chưa có hồ sơ chính</div>
              )}

              <div className="mb-2"><strong>Hồ sơ người thân:</strong></div>
              <ul className="list-group mb-3">
                {(lookup.relatives||[]).length === 0 && <li className="list-group-item">Chưa có hồ sơ người thân</li>}
                {(lookup.relatives||[]).map(r => (
                  <li className="list-group-item d-flex justify-content-between align-items-center" key={r._id}>
                    <span>{r.hoTen} — {r.soDienThoai||'-'} — {r.quanHe||''}</span>
                    <Link className="btn btn-sm btn-outline-primary" to={`/reception/direct-booking?hoSoBenhNhanId=${r._id}`}>Đặt lịch</Link>
                  </li>
                ))}
              </ul>

              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">Tạo hồ sơ người thân</h6>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Họ và tên <span className="text-danger">*</span></label>
                      <input 
                        className="form-control" 
                        value={newProfile.hoTen} 
                        onChange={e=>setNewProfile(p=>({ ...p, hoTen: e.target.value }))}
                        placeholder="Nhập họ và tên đầy đủ"
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Ngày sinh <span className="text-danger">*</span></label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={newProfile.ngaySinh} 
                        onChange={e=>setNewProfile(p=>({ ...p, ngaySinh: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Giới tính <span className="text-danger">*</span></label>
                      <select 
                        className="form-select" 
                        value={newProfile.gioiTinh} 
                        onChange={e=>setNewProfile(p=>({ ...p, gioiTinh: e.target.value }))}
                        required
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Mối quan hệ <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={['Bản Thân','Cha','Mẹ','Con','Vợ','Ông','Bà','Khác'].includes(newProfile.quanHe) ? newProfile.quanHe : (newProfile.quanHe ? newProfile.quanHe : '')}
                        onChange={e=>{
                          const v = e.target.value; 
                          setNewProfile(p=>({ ...p, quanHe: v }));
                        }}
                        required
                      >
                        <option value="">-- Chọn --</option>
                        {['Cha','Mẹ','Con','Vợ','Ông','Bà','Khác'].map(o => <option key={o} value={o}>{o}</option>)}
                        {newProfile.quanHe && !['Cha','Mẹ','Con','Vợ','Ông','Bà','Khác'].includes(newProfile.quanHe) && <option value={newProfile.quanHe}>{newProfile.quanHe}</option>}
                      </select>
                      {newProfile.quanHe === 'Khác' && (
                        <input
                          className="form-control mt-2"
                          placeholder="Nhập quan hệ khác (Ví dụ: Cháu, Anh, Chị...)"
                          value={['Cha','Mẹ','Con','Vợ','Ông','Bà','Khác'].includes(newProfile.quanHe) ? '' : newProfile.quanHe}
                          onChange={e=>setNewProfile(p=>({ ...p, quanHe: e.target.value || 'Khác' }))}
                        />
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Số điện thoại <span className="text-danger">*</span></label>
                      <input 
                        className="form-control" 
                        value={newProfile.soDienThoai} 
                        onChange={e=>setNewProfile(p=>({ ...p, soDienThoai: e.target.value }))}
                        placeholder="Nhập số điện thoại"
                        required
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input 
                        type="email"
                        className="form-control" 
                        value={newProfile.email} 
                        onChange={e=>setNewProfile(p=>({ ...p, email: e.target.value }))}
                        placeholder="Nhập email (nếu có)"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Số CCCD</label>
                      <input 
                        className="form-control" 
                        value={newProfile.cccd} 
                        onChange={e=>setNewProfile(p=>({ ...p, cccd: e.target.value }))}
                        placeholder="Nhập số CCCD (nếu có)"
                      />
                    </div>
                    
                    <div className="col-md-4">
                      <label className="form-label">Tỉnh / Thành phố <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={newProfile.tinhThanhCode}
                        onChange={e=>setNewProfile(p=>({ ...p, tinhThanhCode: e.target.value }))}
                        required
                      >
                        <option value="">-- Chọn --</option>
                        {provinces.map(p => (
                          <option key={p.code} value={p.code}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Quận / Huyện <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={newProfile.quanHuyenCode}
                        onChange={e=>setNewProfile(p=>({ ...p, quanHuyenCode: e.target.value }))}
                        disabled={!newProfile.tinhThanhCode || locLoading}
                        required
                      >
                        <option value="">-- Chọn --</option>
                        {districts.map(d => (
                          <option key={d.code} value={d.code}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Phường / Xã <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={newProfile.phuongXaCode}
                        onChange={e=>setNewProfile(p=>({ ...p, phuongXaCode: e.target.value }))}
                        disabled={!newProfile.quanHuyenCode || locLoading}
                        required
                      >
                        <option value="">-- Chọn --</option>
                        {wards.map(w => (
                          <option key={w.code} value={w.code}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                    {locError && (
                      <div className="col-12">
                        <div className="alert alert-warning py-2 mb-0">{locError}</div>
                      </div>
                    )}
                    
                    <div className="col-12">
                      <label className="form-label">Địa chỉ chi tiết</label>
                      <textarea 
                        className="form-control" 
                        value={newProfile.diaChi} 
                        onChange={e=>setNewProfile(p=>({ ...p, diaChi: e.target.value }))}
                        placeholder="Nhập địa chỉ chi tiết (số nhà, đường...)"
                        rows="2"
                      />
                    </div>
                    
                    <div className="col-12">
                      <button className="btn btn-primary" onClick={createRelativeProfile}>
                        <i className="bi bi-plus-circle"></i> Tạo hồ sơ người thân
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* <div className="table-responsive">
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
        </table> */}
      </div>
   // </div>
  );
}
