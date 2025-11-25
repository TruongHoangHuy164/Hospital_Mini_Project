import React, { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DoctorProfile() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialMe, setInitialMe] = useState(null);
  
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
  }), []);

  function toAbsoluteUrl(u){
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    return `${API_URL}${u.startsWith('/')?u:'/'+u}`;
  }

  async function loadMe(){
    setLoading(true);
    try{
      const res = await fetch(`${API_URL}/api/doctor/me`, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setMe(json);
      setInitialMe(json);
      setHasChanges(false);
    } catch(e){ alert(e?.message || 'Tải thông tin thất bại'); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ loadMe(); },[]);

  const handleChange = (field, value) => {
    setMe(m=>({...m, [field]: value}));
    setHasChanges(true);
  };

  async function onUploadAvatar(e){
    const file = e.target.files?.[0];
    if(!file) return;
    setUploadingAvatar(true);
    try{
      const headersNoJson = { Authorization: headers.Authorization };
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/api/uploads/image`, { method:'POST', headers: headersNoJson, body: fd });
      const json = await res.json();
      if(!res.ok) throw json;
      setMe(m=> ({...m, anhDaiDien: json.url }));
      setHasChanges(true);
    }catch(err){ alert(err?.message || 'Upload ảnh thất bại'); }
    finally{ 
      setUploadingAvatar(false);
      e.target.value = ''; 
    }
  }

  async function save(){
    setSaving(true);
    try{
      const payload = {
        hoTen: me.hoTen,
        email: me.email,
        soDienThoai: me.soDienThoai,
        diaChi: me.diaChi,
        moTa: me.moTa,
        anhDaiDien: me.anhDaiDien,
        ngaySinh: me.ngaySinh,
        gioiTinh: me.gioiTinh,
      };
      const res = await fetch(`${API_URL}/api/doctor/me`, { method:'PUT', headers, body: JSON.stringify(payload) });
      const json = await res.json();
      if(!res.ok) throw json;
      setMe(json);
      setInitialMe(json);
      setHasChanges(false);
      alert('✅ Đã lưu thông tin thành công');
    }catch(e){ alert('❌ ' + (e?.message || 'Lưu thất bại')); }
    finally{ setSaving(false); }
  }

  const handleCancel = () => {
    setMe(initialMe);
    setHasChanges(false);
  };

  if(loading || !me) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-3 text-muted">Đang tải thông tin bác sĩ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <h2 className="mb-1">
            <i className="bi bi-person-circle me-2 text-primary"></i>
            Hồ sơ bác sĩ
          </h2>
          <p className="text-muted small mb-0">Quản lý thông tin cá nhân của bạn</p>
        </div>
      </div>

      <div className="row g-3">
        {/* Sidebar - Avatar */}
        <div className="col-lg-3">
          <div className="card shadow-sm border-0 sticky-top" style={{top: '20px'}}>
            <div className="card-body text-center p-4">
              <div className="mb-3">
                {me.anhDaiDien ? (
                  <img 
                    src={toAbsoluteUrl(me.anhDaiDien)} 
                    alt="avatar" 
                    className="rounded-circle shadow-sm"
                    style={{width:150,height:150,objectFit:'cover'}} 
                  />
                ) : (
                  <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle shadow-sm" style={{width:150,height:150}}>
                    <i className="bi bi-person fs-1 text-secondary"/>
                  </div>
                )}
              </div>
              
              <h5 className="mb-2">{me.hoTen || 'Chưa cập nhật'}</h5>
              <p className="text-muted small mb-3">
                {me.phongKhamId?.tenPhong || 'Chưa cập nhật'}
              </p>
              
              <label className="btn btn-sm btn-primary w-100 mb-2">
                <i className="bi bi-cloud-upload me-1"></i>
                {uploadingAvatar ? 'Đang upload...' : 'Đổi ảnh đại diện'}
                <input type="file" accept="image/*" onChange={onUploadAvatar} hidden disabled={uploadingAvatar} />
              </label>
              
              <div className="text-muted small mt-3 pt-3 border-top">
                <div className="mb-2">
                  <strong>Email:</strong><br/>
                  <small>{me.userId?.email || 'N/A'}</small>
                </div>
                <div>
                  <strong>Chuyên khoa:</strong><br/>
                  <small>{me.phongKhamId?.chuyenKhoa || 'N/A'}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Form */}
        <div className="col-lg-9">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light border-0 p-4">
              <h5 className="mb-0">
                <i className="bi bi-pencil-square me-2"></i>
                Thông tin cá nhân
              </h5>
            </div>
            
            <div className="card-body p-4">
              <div className="row g-3">
                {/* Row 1: Họ tên & Email */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-person me-1 text-primary"></i>
                    Họ tên <span className="text-danger">*</span>
                  </label>
                  <input 
                    className="form-control" 
                    placeholder="Nhập họ tên đầy đủ"
                    value={me.hoTen||''} 
                    onChange={(e)=>handleChange('hoTen', e.target.value)} 
                  />
                </div>
                
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-envelope me-1 text-primary"></i>
                    Email
                  </label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="example@email.com"
                    value={me.email||''} 
                    onChange={(e)=>handleChange('email', e.target.value)} 
                  />
                </div>

                {/* Row 2: Số điện thoại & Ngày sinh */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-telephone me-1 text-primary"></i>
                    Số điện thoại
                  </label>
                  <input 
                    className="form-control" 
                    placeholder="0123456789"
                    value={me.soDienThoai||''} 
                    onChange={(e)=>handleChange('soDienThoai', e.target.value)} 
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-calendar me-1 text-primary"></i>
                    Ngày sinh
                  </label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={me.ngaySinh ? String(me.ngaySinh).slice(0,10) : ''} 
                    onChange={(e)=>handleChange('ngaySinh', e.target.value)} 
                  />
                </div>

                {/* Row 3: Giới tính & Địa chỉ */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-gender-ambiguous me-1 text-primary"></i>
                    Giới tính
                  </label>
                  <select 
                    className="form-select" 
                    value={me.gioiTinh||'khac'} 
                    onChange={(e)=>handleChange('gioiTinh', e.target.value)}
                  >
                    <option value="nam">👨 Nam</option>
                    <option value="nu">👩 Nữ</option>
                    <option value="khac">❓ Khác</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-geo-alt me-1 text-primary"></i>
                    Địa chỉ
                  </label>
                  <input 
                    className="form-control" 
                    placeholder="Nhập địa chỉ"
                    value={me.diaChi||''} 
                    onChange={(e)=>handleChange('diaChi', e.target.value)} 
                  />
                </div>

                {/* Row 4: Mô tả */}
                <div className="col-12">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-chat-left-text me-1 text-primary"></i>
                    Mô tả / Tiểu sử
                  </label>
                  <textarea 
                    className="form-control" 
                    rows={4} 
                    placeholder="Nhập mô tả về bạn, kinh nghiệm, chuyên môn..."
                    value={me.moTa||''} 
                    onChange={(e)=>handleChange('moTa', e.target.value)}
                  ></textarea>
                  <small className="text-muted d-block mt-1">
                    {(me.moTa || '').length}/500 ký tự
                  </small>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="card-footer bg-light border-top p-4 d-flex justify-content-end gap-2">
              <button 
                className="btn btn-outline-secondary" 
                onClick={handleCancel}
                disabled={!hasChanges || saving}
              >
                <i className="bi bi-x-circle me-1"></i>Hủy
              </button>
              <button 
                className="btn btn-primary" 
                onClick={save}
                disabled={!hasChanges || saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-1"></i>Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="alert alert-info border-0 mt-3 mb-0">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Lưu ý:</strong> Các thông tin được cập nhật sẽ được hiển thị trên hồ sơ công khai của bạn.
          </div>
        </div>
      </div>
    </div>
  );
}
