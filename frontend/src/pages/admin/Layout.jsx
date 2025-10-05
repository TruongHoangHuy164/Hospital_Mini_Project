import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => {
    await signOut();
    navigate('/login');
  };
  return (
    <div className="container-fluid">
      <div className="row">
        <aside className="col-12 col-md-3 col-xl-2 px-sm-2 px-0 bg-light">
          <div className="d-flex flex-column align-items-start px-3 pt-2 min-vh-100">
            <Link to="/" className="navbar-brand my-3"><i className="bi bi-hospital"></i> Hospital</Link>
            <ul className="nav nav-pills flex-column mb-auto w-100">
              <li className="nav-item"><Link to="/admin/overview" className="nav-link">Tổng quan</Link></li>
              <li className="nav-item"><Link to="/admin/users" className="nav-link">Quản lý người dùng</Link></li>
              <li className="nav-item"><Link to="/admin/doctors" className="nav-link">Quản lý bác sĩ</Link></li>
              <li className="nav-item"><Link to="/admin/clinics" className="nav-link">Quản lý chuyên khoa & phòng khám</Link></li>
              <li className="nav-item"><Link to="/admin/services" className="nav-link">Dịch vụ & Bảng giá</Link></li>
              <li className="nav-item"><Link to="/admin/staff" className="nav-link">Quản lý nhân viên (Lễ tân/CLS/Thu ngân/Điều dưỡng)</Link></li>
              <li className="nav-item"><Link to="/admin/work-schedules" className="nav-link">Lịch làm việc</Link></li>
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
