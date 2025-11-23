import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Profile = () => {
  const { user, headers } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    hoTen: '',
    ngaySinh: '',
    gioiTinh: 'khac',
    diaChi: '',
    soDienThoai: '',
    maBHYT: ''
  });
  const [errors, setErrors] = useState({});

  // Load profile data
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users/profile`, { headers });
      
      if (!response.ok) {
        throw new Error('Không thể tải thông tin profile');
      }
      
      const data = await response.json();
      setProfile(data);
      
      // Set form data
      const registrationPhone = user?.phone || '';
      const registrationEmail = user?.email || '';
      setFormData({
        hoTen: data.hoTen || user?.name || '',
        ngaySinh: data.ngaySinh ? new Date(data.ngaySinh).toISOString().split('T')[0] : '',
        gioiTinh: data.gioiTinh || 'khac',
        diaChi: data.diaChi || '',
        // Prefill phone: existing profile phone OR registered phone OR empty
        soDienThoai: (data.soDienThoai || registrationPhone || ''),
        maBHYT: data.maBHYT || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Không thể tải thông tin cá nhân');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // If profile already loaded but phone still empty and user has phone, backfill once
  useEffect(() => {
    if (!loading && user && !formData.soDienThoai) {
      if (user.phone) {
        setFormData(prev => ({ ...prev, soDienThoai: user.phone }));
      }
    }
  }, [loading, user, formData.soDienThoai]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.hoTen.trim()) {
      newErrors.hoTen = 'Họ tên không được để trống';
    }
    
    if (formData.ngaySinh) {
      const birthDate = new Date(formData.ngaySinh);
      if (birthDate > new Date()) {
        newErrors.ngaySinh = 'Ngày sinh không thể là tương lai';
      }
    }
    
    if (formData.soDienThoai && !/^[0-9+\-\s()]{10,15}$/.test(formData.soDienThoai.replace(/\s/g, ''))) {
      newErrors.soDienThoai = 'Số điện thoai không hợp lệ (10-15 số)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      
      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Cập nhật thất bại');
      }
      
      setProfile(data.profile);
      toast.success(data.message || 'Cập nhật thông tin thành công');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Thông tin cá nhân</h1>
        <p>Quản lý và cập nhật thông tin cá nhân của bạn</p>
      </div>

      <div className="profile-content">
        {/* Basic User Info */}
        <div className="profile-section">
          <h2>Thông tin tài khoản</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Email:</label>
              <span>{profile?.email}</span>
            </div>
            <div className="info-item">
              <label>Vai trò:</label>
              <span className={`role-badge ${profile?.role}`}>
                {profile?.role === 'user' ? 'Người dùng' : 
                 profile?.role === 'doctor' ? 'Bác sĩ' : 
                 profile?.role === 'admin' ? 'Quản trị viên' : 
                 profile?.role}
              </span>
            </div>
            <div className="info-item">
              <label>Ngày tạo tài khoản:</label>
              <span>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Editable Profile Form */}
        <div className="profile-section">
          <h2>Thông tin cá nhân</h2>
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="hoTen">
                  Họ tên <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="hoTen"
                  name="hoTen"
                  value={formData.hoTen}
                  onChange={handleChange}
                  className={errors.hoTen ? 'error' : ''}
                  placeholder="Nhập họ tên đầy đủ"
                />
                {errors.hoTen && <span className="error-message">{errors.hoTen}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="ngaySinh">Ngày sinh</label>
                <input
                  type="date"
                  id="ngaySinh"
                  name="ngaySinh"
                  value={formData.ngaySinh}
                  onChange={handleChange}
                  className={errors.ngaySinh ? 'error' : ''}
                />
                {errors.ngaySinh && <span className="error-message">{errors.ngaySinh}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="gioiTinh">Giới tính</label>
                <select
                  id="gioiTinh"
                  name="gioiTinh"
                  value={formData.gioiTinh}
                  onChange={handleChange}
                >
                  <option value="khac">Khác</option>
                  <option value="nam">Nam</option>
                  <option value="nu">Nữ</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="soDienThoai">Số điện thoại</label>
                <input
                  type="tel"
                  id="soDienThoai"
                  name="soDienThoai"
                  value={formData.soDienThoai}
                  onChange={handleChange}
                  className={errors.soDienThoai ? 'error' : ''}
                  placeholder="Nhập số điện thoại"
                />
                {errors.soDienThoai && <span className="error-message">{errors.soDienThoai}</span>}
              </div>

              <div className="form-group full-width">
                <label htmlFor="diaChi">Địa chỉ</label>
                <textarea
                  id="diaChi"
                  name="diaChi"
                  value={formData.diaChi}
                  onChange={handleChange}
                  placeholder="Nhập địa chỉ đơn vị đầy đủ"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maBHYT">Mã BHYT</label>
                <input
                  type="text"
                  id="maBHYT"
                  name="maBHYT"
                  value={formData.maBHYT}
                  onChange={handleChange}
                  placeholder="Nhập mã bảo hiểm y tế (nếu có)"
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={loadProfile}
                className="btn-secondary"
                disabled={saving}
              >
                Hủy thay đổi
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Cập nhật thông tin'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .profile-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }

        .profile-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f0f0f0;
        }

        .profile-header h1 {
          color: #2c3e50;
          margin-bottom: 8px;
          font-size: 28px;
          font-weight: 600;
        }

        .profile-header p {
          color: #7f8c8d;
          font-size: 16px;
        }

        .profile-section {
          margin-bottom: 40px;
        }

        .profile-section h2 {
          color: #34495e;
          margin-bottom: 20px;
          font-size: 20px;
          font-weight: 500;
          padding-bottom: 10px;
          border-bottom: 1px solid #e0e0e0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .info-item label {
          font-weight: 500;
          color: #555;
          font-size: 14px;
        }

        .info-item span {
          color: #333;
          font-size: 16px;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .role-badge.user {
          background: #e3f2fd;
          color: #1976d2;
        }

        .role-badge.doctor {
          background: #e8f5e8;
          color: #2e7d32;
        }

        .role-badge.admin {
          background: #fff3e0;
          color: #f57c00;
        }

        .profile-form {
          background: #fafafa;
          padding: 30px;
          border-radius: 8px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-weight: 500;
          color: #555;
          font-size: 14px;
        }

        .required {
          color: #e74c3c;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.3s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3498db;
        }

        .form-group input.error,
        .form-group select.error,
        .form-group textarea.error {
          border-color: #e74c3c;
        }

        .error-message {
          color: #e74c3c;
          font-size: 12px;
          margin-top: 4px;
        }

        .form-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
        }

        .btn-primary,
        .btn-secondary {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-primary {
          background: #3498db;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2980b9;
        }

        .btn-secondary {
          background: #95a5a6;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #7f8c8d;
        }

        .btn-primary:disabled,
        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading {
          text-align: center;
          padding: 60px 20px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .profile-container {
            margin: 10px;
            padding: 15px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Profile;