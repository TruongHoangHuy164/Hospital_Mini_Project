import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ReceptionLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await signOut(); navigate('/login'); };
  return (
    <div className="container-fluid">
      <div className="row">
        <aside className="col-12 col-md-3 col-xl-2 px-sm-2 px-0 bg-light">
          <div className="d-flex flex-column align-items-start px-3 pt-2 min-vh-100">
            <NavLink to="/" className="navbar-brand my-3"><i className="bi bi-hospital"></i> Lễ tân</NavLink>
            <ul className="nav nav-pills flex-column mb-auto w-100">
              <li className="nav-item"><NavLink to="/reception/dashboard" className={({isActive})=>`nav-link ${isActive?'active':''}`}><i className="bi bi-speedometer2 me-2"></i> Bảng điều khiển</NavLink></li>
              <li className="nav-item"><NavLink to="/reception/intake" className={({isActive})=>`nav-link ${isActive?'active':''}`}><i className="bi bi-person-plus me-2"></i> Tiếp nhận bệnh nhân</NavLink></li>
              <li className="nav-item"><NavLink to="/reception/patients/new" className={({isActive})=>`nav-link ${isActive?'active':''}`}><i className="bi bi-file-earmark-plus me-2"></i> Tạo hồ sơ bệnh nhân</NavLink></li>
              <li className="nav-item"><NavLink to="/reception/queue" className={({isActive})=>`nav-link ${isActive?'active':''}`}><i className="bi bi-123 me-2"></i> Cấp số thứ tự</NavLink></li>
              <li className="nav-item"><NavLink to="/reception/appointments" className={({isActive})=>`nav-link ${isActive?'active':''}`}><i className="bi bi-calendar-check me-2"></i> Quản lý lịch hẹn</NavLink></li>
              <li className="nav-item"><NavLink to="/reception/doctors" className={({isActive})=>`nav-link ${isActive?'active':''}`}><i className="bi bi-people me-2"></i> Danh sách bác sĩ</NavLink></li>
              <li className="nav-item"><NavLink to="/reception/lookup" className={({isActive})=>`nav-link ${isActive?'active':''}`}><i className="bi bi-search me-2"></i> Tra cứu bệnh nhân</NavLink></li>
              <li className="nav-item"><NavLink to="/reception/print" className={({isActive})=>`nav-link ${isActive?'active':''}`}><i className="bi bi-printer me-2"></i> In số/hoá đơn</NavLink></li>
              <li className="nav-item"><NavLink to="/reception/my-schedule" className={({isActive})=>`nav-link ${isActive?'active':''}`}><i className="bi bi-calendar-week me-2"></i> Lịch của tôi</NavLink></li>
              <li className="nav-item mt-2"><button className="btn btn-outline-secondary w-100" onClick={onLogout}><i className="bi bi-box-arrow-right"></i> Đăng xuất</button></li>
            </ul>
          </div>
        </aside>
        <main className="col py-3">
          <div className="d-flex justify-content-end align-items-center mb-3">
            <span className="me-3 text-muted">{user?.name || user?.email}</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={onLogout}><i className="bi bi-box-arrow-right"></i> Đăng xuất</button>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
