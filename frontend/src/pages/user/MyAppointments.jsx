import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AppointmentStatus = ({ status }) => {
  const statusMap = {
    pending_payment: { text: 'Chờ thanh toán', color: 'warning' },
    confirmed: { text: 'Đã xác nhận', color: 'primary' },
    completed: { text: 'Đã hoàn thành', color: 'success' },
    cancelled: { text: 'Đã hủy', color: 'danger' },
    checked_in: { text: 'Đã check-in', color: 'info' },
  };
  const { text, color } = statusMap[status] || { text: status, color: 'secondary' };
  return <span className={`badge text-bg-${color}`}>{text}</span>;
};

export default function MyAppointments() {
  const { isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
  }), []);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/booking/my-appointments`, { headers });
        if (!response.ok) {
          throw new Error('Failed to fetch appointments');
        }
        const data = await response.json();
        setAppointments(data.items || []);
      } catch (error) {
        toast.error(error.message || 'Không thể tải lịch khám.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [isAuthenticated, headers]);

  const patients = useMemo(() => {
    const map = new Map();
    for (const appt of appointments) {
      const id = appt.benhNhanId || appt.hoSoBenhNhanId || '';
      const name = appt.benhNhan?.hoTen || '';
      if (id && !map.has(id)) map.set(id, { id, label: name || `Hồ sơ ${String(id).slice(-4)}` });
    }
    return Array.from(map.values());
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    if (!selectedPatientId) return appointments;
    return appointments.filter(appt => String(appt.benhNhanId || appt.hoSoBenhNhanId || '') === String(selectedPatientId));
  }, [appointments, selectedPatientId]);

  return (
    <div className="container py-4">
      <h3 className="mb-4">Lịch khám của tôi</h3>
      {!loading && patients.length > 0 && (
        <div className="mb-3">
          <label className="form-label">Chọn hồ sơ</label>
          <select className="form-select" value={selectedPatientId} onChange={e=>setSelectedPatientId(e.target.value)}>
            <option value="">Tất cả hồ sơ</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      )}
      {loading ? (
        <p>Đang tải...</p>
      ) : filteredAppointments.length === 0 ? (
        <p>Bạn chưa có lịch khám nào.</p>
      ) : (
        <div className="list-group">
          {filteredAppointments.map((appt) => (
            <div key={appt._id} className="list-group-item list-group-item-action flex-column align-items-start">
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">
                  Lịch khám ngày {new Date(appt.ngayKham).toLocaleDateString('vi-VN')}
                </h5>
                <small><AppointmentStatus status={appt.trangThai} /></small>
              </div>
              <p className="mb-1">
                <strong>Bệnh nhân:</strong> {appt.hoSoBenhNhan?.hoTen || appt.benhNhan?.hoTen}
                <br />
                <strong>Bác sĩ:</strong> {appt.bacSi?.hoTen} - <strong>Chuyên khoa:</strong> {appt.chuyenKhoa?.ten}
                <br />
                <strong>Giờ khám:</strong> {appt.khungGio}
              </p>
                {appt.soThuTu && (
                  <p className="mb-0">
                    <strong>Số thứ tự:</strong> <span className="fw-bold fs-5">{typeof appt.soThuTu === 'object' ? appt.soThuTu.so : appt.soThuTu}</span>
                  </p>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
