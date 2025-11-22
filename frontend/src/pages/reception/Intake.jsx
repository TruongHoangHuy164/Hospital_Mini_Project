import React, { useEffect, useState } from 'react';

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
    quanHe: '' 
  });
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
        quanHe: '' 
      });
      await checkByContact();
    }catch(e){ setLookupError(e?.message||'Lỗi tạo hồ sơ người thân'); }
  }

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
                <div className="mb-2">Hồ sơ chính: <a className="btn btn-sm btn-outline-primary" href={`/reception/appointments?benhNhanId=${lookup.selfPatient._id}`}>Đặt lịch cho người này</a></div>
              ) : (
                <div className="mb-2 text-muted">Chưa có hồ sơ chính</div>
              )}

              <div className="mb-2"><strong>Hồ sơ người thân:</strong></div>
              <ul className="list-group mb-3">
                {(lookup.relatives||[]).length === 0 && <li className="list-group-item">Chưa có hồ sơ người thân</li>}
                {(lookup.relatives||[]).map(r => (
                  <li className="list-group-item d-flex justify-content-between align-items-center" key={r._id}>
                    <span>{r.hoTen} — {r.soDienThoai||'-'} — {r.quanHe||''}</span>
                    <a className="btn btn-sm btn-outline-primary" href={`/reception/appointments?hoSoBenhNhanId=${r._id}`}>Đặt lịch</a>
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
                      <input 
                        className="form-control" 
                        value={newProfile.quanHe} 
                        onChange={e=>setNewProfile(p=>({ ...p, quanHe: e.target.value }))} 
                        placeholder="Vd: Bố, Mẹ, Con trai..."
                        required
                      />
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
                      <label className="form-label">Tỉnh / Thành phố</label>
                      <input 
                        className="form-control" 
                        value={newProfile.tinhThanh} 
                        onChange={e=>setNewProfile(p=>({ ...p, tinhThanh: e.target.value }))}
                        placeholder="Vd: TP. Hồ Chí Minh"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Quận / Huyện</label>
                      <input 
                        className="form-control" 
                        value={newProfile.quanHuyen} 
                        onChange={e=>setNewProfile(p=>({ ...p, quanHuyen: e.target.value }))}
                        placeholder="Vd: Quận 1"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Phường / Xã</label>
                      <input 
                        className="form-control" 
                        value={newProfile.phuongXa} 
                        onChange={e=>setNewProfile(p=>({ ...p, phuongXa: e.target.value }))}
                        placeholder="Vd: Phường Bến Nghé"
                      />
                    </div>
                    
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
