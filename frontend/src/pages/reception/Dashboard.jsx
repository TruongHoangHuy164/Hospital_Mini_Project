import React from 'react';
import PageHeader from '../../components/reception/PageHeader'
import Card from '../../components/reception/Card'
import { NavLink } from 'react-router-dom'

export default function ReceptionDashboard(){
  const tiles = [
    { to:'/reception/intake', icon:'bi-person-plus', text:'Tiếp nhận bệnh nhân' },
    { to:'/reception/patients/new', icon:'bi-file-earmark-plus', text:'Tạo hồ sơ bệnh nhân' },
    { to:'/reception/queue', icon:'bi-123', text:'Cấp số thứ tự & in STT' },
    { to:'/reception/appointments', icon:'bi-calendar-check', text:'Đặt lịch' },
    { to:'/reception/doctors', icon:'bi-people', text:'Danh sách bác sĩ & đổi lịch' },
    { to:'/reception/lookup', icon:'bi-search', text:'Tra cứu bệnh nhân' },
    { to:'/reception/print', icon:'bi-printer', text:'In số/hoá đơn' },
  ];
  return (
    <div className="container rc-page">
      <PageHeader title="Bảng điều khiển lễ tân" />
      <Card>
        <div className="row g-3">
          {tiles.map(t => (
            <div key={t.to} className="col-12 col-sm-6 col-lg-4">
              <NavLink to={t.to} className="text-decoration-none">
                <div className="rc-card h-100">
                  <div className="rc-card-body d-flex align-items-center gap-3">
                    <i className={`bi ${t.icon} fs-3 text-primary`}></i>
                    <div className="fw-semibold text-dark">{t.text}</div>
                  </div>
                </div>
              </NavLink>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
