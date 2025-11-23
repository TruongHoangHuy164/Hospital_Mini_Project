import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { fetchProvinces, fetchDistricts, fetchWards } from '../../api/location';
import { toast } from 'react-toastify';
import {
  getPatientProfiles,
  addPatientProfile,
  updatePatientProfile,
  deletePatientProfile,
} from '../../api/patientProfiles';

const defaultFormValues = {
  hoTen: '',
  ngaySinh: '',
  gioiTinh: 'Nam',
  quanHe: '',
  soDienThoai: '',
  email: '',
  cccd: '',
  diaChi: '',
  tinhThanh: '',
  quanHuyen: '',
  phuongXa: '',
};

const ProfileForm = ({ profile, onSave, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: defaultFormValues,
  });

  // Location state
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);

  const selectedProvinceCode = watch('tinhThanhCode');
  const selectedDistrictCode = watch('quanHuyenCode');

  useEffect(() => {
    if (profile) {
      const normalizedProfile = {
        ...defaultFormValues,
        ...profile,
        ngaySinh: profile.ngaySinh
          ? new Date(profile.ngaySinh).toISOString().split('T')[0]
          : '',
        tinhThanhCode: '',
        quanHuyenCode: '',
        phuongXaCode: '',
      };
      reset(normalizedProfile);
    } else {
      reset({ ...defaultFormValues, tinhThanhCode: '', quanHuyenCode: '', phuongXaCode: '' });
    }
  }, [profile, reset]);

  // Load provinces once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLocLoading(true); setLocError(null);
        const data = await fetchProvinces();
        if (mounted) setProvinces(data);
      } catch (e) {
        if (mounted) setLocError(e.message);
      } finally { if (mounted) setLocLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  // When province changes, fetch districts
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedProvinceCode) { setDistricts([]); setWards([]); setValue('tinhThanh',''); return; }
      try {
        setLocLoading(true); setLocError(null); setDistricts([]); setWards([]);
        const data = await fetchDistricts(selectedProvinceCode);
        if (mounted) {
          setDistricts(data);
          const provinceObj = provinces.find(p => String(p.code) === String(selectedProvinceCode));
          if (provinceObj) setValue('tinhThanh', provinceObj.name);
        }
      } catch (e) { if (mounted) setLocError(e.message); }
      finally { if (mounted) setLocLoading(false); }
    })();
    return () => { mounted = false; };
  }, [selectedProvinceCode, provinces, setValue]);

  // When district changes, fetch wards
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedDistrictCode) { setWards([]); setValue('quanHuyen',''); return; }
      try {
        setLocLoading(true); setLocError(null); setWards([]);
        const data = await fetchWards(selectedDistrictCode);
        if (mounted) {
          setWards(data);
          const distObj = districts.find(d => String(d.code) === String(selectedDistrictCode));
          if (distObj) setValue('quanHuyen', distObj.name);
        }
      } catch (e) { if (mounted) setLocError(e.message); }
      finally { if (mounted) setLocLoading(false); }
    })();
    return () => { mounted = false; };
  }, [selectedDistrictCode, districts, setValue]);

  // When ward code changes, set ward name
  const selectedWardCode = watch('phuongXaCode');
  useEffect(() => {
    const wardObj = wards.find(w => String(w.code) === String(selectedWardCode));
    if (wardObj) setValue('phuongXa', wardObj.name);
    else if (!selectedWardCode) setValue('phuongXa','');
  }, [selectedWardCode, wards, setValue]);

  const onSubmit = (data) => {
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="profile-form-card">
      <h2 className="profile-form__title">
        {profile ? 'Chỉnh sửa hồ sơ' : 'Thêm hồ sơ mới'}
      </h2>

      <div className="profile-form__grid">
        <div className="profile-form__field">
          <label className="profile-form__label">Họ và tên *</label>
          <input
            className="profile-form__input"
            {...register('hoTen', { required: 'Họ và tên là bắt buộc' })}
          />
          {errors.hoTen && (
            <p className="profile-form__error">{errors.hoTen.message}</p>
          )}
        </div>

        <div className="profile-form__field">
          <label className="profile-form__label">Ngày sinh *</label>
          <input
            type="date"
            className="profile-form__input"
            {...register('ngaySinh', { required: 'Ngày sinh là bắt buộc' })}
          />
          {errors.ngaySinh && (
            <p className="profile-form__error">{errors.ngaySinh.message}</p>
          )}
        </div>

        <div className="profile-form__field">
          <label className="profile-form__label">Giới tính *</label>
          <select
            className="profile-form__select"
            {...register('gioiTinh', { required: 'Giới tính là bắt buộc' })}
          >
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
            <option value="Khác">Khác</option>
          </select>
          {errors.gioiTinh && (
            <p className="profile-form__error">{errors.gioiTinh.message}</p>
          )}
        </div>

        <div className="profile-form__field">
          <label className="profile-form__label">Mối quan hệ *</label>
          <input
            className="profile-form__input"
            placeholder="Vd: Bố, Mẹ, Con trai..."
            {...register('quanHe', { required: 'Mối quan hệ là bắt buộc' })}
          />
          {errors.quanHe && (
            <p className="profile-form__error">{errors.quanHe.message}</p>
          )}
        </div>

        <div className="profile-form__field">
          <label className="profile-form__label">Số điện thoại *</label>
          <input
            className="profile-form__input"
            {...register('soDienThoai', { required: 'Số điện thoại là bắt buộc' })}
          />
          {errors.soDienThoai && (
            <p className="profile-form__error">{errors.soDienThoai.message}</p>
          )}
        </div>

        <div className="profile-form__field">
          <label className="profile-form__label">Email</label>
          <input
            type="email"
            className="profile-form__input"
            {...register('email')}
          />
        </div>

        <div className="profile-form__field">
          <label className="profile-form__label">Số CCCD</label>
          <input className="profile-form__input" {...register('cccd')} />
        </div>

        <div className="profile-form__field">
          <label className="profile-form__label">Tỉnh / Thành phố *</label>
          <select
            className="profile-form__select"
            {...register('tinhThanhCode', { required: 'Chọn tỉnh / thành phố' })}
          >
            <option value="">-- Chọn --</option>
            {provinces.map(p => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
          {errors.tinhThanhCode && <p className="profile-form__error">{errors.tinhThanhCode.message}</p>}
        </div>

        <div className="profile-form__field">
          <label className="profile-form__label">Quận / Huyện *</label>
          <select
            className="profile-form__select"
            disabled={!selectedProvinceCode || locLoading}
            {...register('quanHuyenCode', { required: 'Chọn quận / huyện' })}
          >
            <option value="">-- Chọn --</option>
            {districts.map(d => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>
          {errors.quanHuyenCode && <p className="profile-form__error">{errors.quanHuyenCode.message}</p>}
        </div>

        <div className="profile-form__field">
          <label className="profile-form__label">Phường / Xã *</label>
          <select
            className="profile-form__select"
            disabled={!selectedDistrictCode || locLoading}
            {...register('phuongXaCode', { required: 'Chọn phường / xã' })}
          >
            <option value="">-- Chọn --</option>
            {wards.map(w => (
              <option key={w.code} value={w.code}>{w.name}</option>
            ))}
          </select>
          {errors.phuongXaCode && <p className="profile-form__error">{errors.phuongXaCode.message}</p>}
        </div>

        {locError && <div className="profile-form__field profile-form__error">{locError}</div>}

        <div className="profile-form__field profile-form__field--wide">
          <label className="profile-form__label">Địa chỉ chi tiết</label>
          <input
            className="profile-form__input"
            placeholder="Số nhà, tên đường..."
            {...register('diaChi')}
          />
        </div>
      </div>

      <div className="profile-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="btn btn--primary">
          Lưu
        </button>
      </div>
    </form>
  );
};

const PatientProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('vi-VN');
  };

  const fetchProfiles = useCallback(async () => {
    try {
      console.log('Frontend: Starting to fetch profiles...');
      setLoading(true);
      setError(null);
      const response = await getPatientProfiles();
      console.log('Frontend: API response:', response);
      console.log('Frontend: Profiles data:', response.data);
      setProfiles(response.data || []);
    } catch (err) {
      console.error('Frontend: Error fetching profiles:', err);
      const message = err.response?.data?.message || 'Không thể tải danh sách hồ sơ. Vui lòng thử lại.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSave = async (data) => {
    try {
      console.log('Frontend: Saving profile data:', data);
      if (editingProfile) {
        console.log('Frontend: Updating existing profile:', editingProfile._id);
        await updatePatientProfile(editingProfile._id, data);
        toast.success('Cập nhật hồ sơ thành công!');
        setFeedback({ type: 'success', message: 'Cập nhật hồ sơ thành công!' });
      } else {
        console.log('Frontend: Creating new profile');
        await addPatientProfile(data);
        toast.success('Thêm hồ sơ mới thành công!');
        setFeedback({ type: 'success', message: 'Thêm hồ sơ mới thành công!' });
      }

      console.log('Frontend: Refreshing profiles list...');
      await fetchProfiles();
      setIsFormVisible(false);
      setEditingProfile(null);
    } catch (err) {
      console.error('Frontend: Error saving profile:', err);
      const message = err.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
      toast.error(message);
      setFeedback({ type: 'error', message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hồ sơ này?')) {
      return;
    }

    try {
  await deletePatientProfile(id);
  toast.success('Xóa hồ sơ thành công!');
  setFeedback({ type: 'success', message: 'Xóa hồ sơ thành công!' });
  await fetchProfiles();
    } catch (err) {
      const message = err.response?.data?.message || 'Không thể xóa hồ sơ.';
      toast.error(message);
      setFeedback({ type: 'error', message });
    }
  };

  const handleAddNew = () => {
    setEditingProfile(null);
    setIsFormVisible(true);
    setFeedback(null);
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setIsFormVisible(true);
  };

  const handleCancel = () => {
    setIsFormVisible(false);
    setEditingProfile(null);
  };

  return (
    <div className="profile-page">
      <div className="profile-page__head">
        <h1 className="profile-page__title">Hồ sơ người thân</h1>
        <div className="profile-page__actions">
          {!isFormVisible && (
            <button type="button" className="btn btn--primary" onClick={handleAddNew}>
              Thêm hồ sơ
            </button>
          )}
          <Link to="/booking" className="btn btn--outline">
            Đặt lịch khám
          </Link>
        </div>
      </div>

      {feedback && (
        <div className={`profile-alert profile-alert--${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {isFormVisible && (
        <ProfileForm profile={editingProfile} onSave={handleSave} onCancel={handleCancel} />
      )}

  {loading && <p className="profile-loading">Đang tải hồ sơ...</p>}
  {error && <div className="profile-alert profile-alert--error">{error}</div>}

      {!loading && !error && (
        <div className="profile-list">
          {profiles.length === 0 ? (
            <div className="profile-empty">
              Bạn chưa có hồ sơ người thân nào. Nhấn “Thêm hồ sơ” để tạo mới.
            </div>
          ) : (
            profiles.map((profile) => (
              <article key={profile._id} className="profile-card">
                <div className="profile-card__meta">
                  <h3 className="profile-card__name">
                    {profile.hoTen}
                    {profile.quanHe ? ` (${profile.quanHe})` : ''}
                  </h3>
                  <p className="profile-card__code">Mã hồ sơ: {profile.maHoSo}</p>
                  <p className="profile-card__field">Ngày sinh: {formatDate(profile.ngaySinh)}</p>
                  <p className="profile-card__field">Giới tính: {profile.gioiTinh || 'N/A'}</p>
                  <p className="profile-card__field">Số điện thoại: {profile.soDienThoai || 'N/A'}</p>
                  <p className="profile-card__field">
                    Địa chỉ:{' '}
                    {[
                      profile.diaChi,
                      profile.phuongXa,
                      profile.quanHuyen,
                      profile.tinhThanh,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'N/A'}
                  </p>
                </div>

                <div className="profile-card__actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => handleEdit(profile)}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => handleDelete(profile._id)}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PatientProfiles;