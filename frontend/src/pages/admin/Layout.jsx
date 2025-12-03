import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => {
    await signOut();
    navigate('/login');
  };
  const linkClass = (isActive) => `nav-link rounded-3 fw-semibold ${isActive ? 'active' : ''}`;
  return (
    <div className="container-fluid">
      <div className="row vh-100">
        <aside className="col-12 col-md-3 col-xl-2 px-sm-2 px-0 bg-light border-end">
          <div className="d-flex flex-column align-items-start px-3 pt-3 h-100">
            <div className="d-flex align-items-center w-100 mb-3">
              <NavLink to="/admin/overview" className="navbar-brand text-decoration-none">
                <i className="bi bi-shield-lock text-primary fs-3"></i>
                <span className="ms-2 fw-bold text-dark">Admin</span>
              </NavLink>
            </div>
            <ul className="nav nav-pills flex-column mb-auto w-100">
              <li className="nav-item mb-2"><NavLink to="/admin/overview" className={({isActive})=> linkClass(isActive)}><i className="bi bi-speedometer2 me-2"></i>Tổng quan</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/admin/users" className={({isActive})=> linkClass(isActive)}><i className="bi bi-people me-2"></i>Người dùng</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/admin/doctors" className={({isActive})=> linkClass(isActive)}><i className="bi bi-person-badge me-2"></i>Bác sĩ</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/admin/clinics" className={({isActive})=> linkClass(isActive)}><i className="bi bi-building me-2"></i>Phòng khám</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/admin/services" className={({isActive})=> linkClass(isActive)}><i className="bi bi-grid me-2"></i>Dịch vụ</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/admin/staff" className={({isActive})=> linkClass(isActive)}><i className="bi bi-person-gear me-2"></i>Nhân sự</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/admin/work-schedules" className={({isActive})=> linkClass(isActive)}><i className="bi bi-calendar-week me-2"></i>Lịch làm việc</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/admin/revenue" className={({isActive})=> linkClass(isActive)}><i className="bi bi-graph-up-arrow me-2"></i>Báo cáo doanh thu</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/admin/booking-stats" className={({isActive})=> linkClass(isActive)}><i className="bi bi-bar-chart me-2"></i>Thống kê đặt lịch</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/admin/news" className={({isActive})=> linkClass(isActive)}><i className="bi bi-newspaper me-2"></i>Tin tức</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/admin/reviews" className={({isActive})=> linkClass(isActive)}><i className="bi bi-star me-2"></i>Đánh giá</NavLink></li>
            </ul>
            <div className="mt-auto w-100">
              <div className="small text-muted mb-2">{user?.name || user?.email}</div>
              <button className="btn btn-outline-danger w-100 rounded-3" onClick={onLogout}>
                <i className="bi bi-box-arrow-right me-2"></i>Đăng xuất
              </button>
            </div>
          </div>
        </aside>
        <main className="col d-flex flex-column p-3 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
