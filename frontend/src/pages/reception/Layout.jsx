import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Layout Lễ tân đồng bộ thiết kế: brand, alert chế độ, nav bo góc, active rõ ràng.
export default function ReceptionLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await signOut(); navigate('/login'); };
  const linkClass = (isActive) => `nav-link rounded-3 fw-semibold ${isActive? 'active':''}`;
  return (
    <div className="container-fluid">
      <div className="row">
        <aside className="col-12 col-md-3 col-xl-2 px-sm-2 px-0 bg-light border-end">
          <div className="d-flex flex-column align-items-start px-3 pt-3 min-vh-100 w-100">
            <NavLink to="/reception/dashboard" className="navbar-brand mb-4 text-decoration-none">
              <i className="bi bi-hospital text-primary fs-3"></i>
              <span className="ms-2 fw-bold text-dark">Reception</span>
            </NavLink>
            <div className="alert alert-info alert-sm mb-4 small w-100">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Chế độ:</strong> Lễ tân (Tiếp nhận & Thu ngân)
            </div>
            <ul className="nav nav-pills flex-column mb-auto w-100">
              <li className="nav-item mb-2"><NavLink to="/reception/dashboard" className={({isActive})=> linkClass(isActive)}><i className="bi bi-speedometer2 me-2"></i>Bảng điều khiển</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/reception/intake" className={({isActive})=> linkClass(isActive)}><i className="bi bi-person-plus me-2"></i>Tiếp nhận bệnh nhân</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/reception/queue" className={({isActive})=> linkClass(isActive)}><i className="bi bi-123 me-2"></i>Cấp số thứ tự & in STT</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/reception/appointments" className={({isActive})=> linkClass(isActive)}><i className="bi bi-calendar-check me-2"></i>Đặt Lịch</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/reception/doctors" className={({isActive})=> linkClass(isActive)}><i className="bi bi-people me-2"></i>Quản Lý Lịch Hẹn</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/reception/payments" className={({isActive})=> linkClass(isActive)}><i className="bi bi-cash-stack me-2"></i>Thu tiền dịch vụ</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/reception/stats" className={({isActive})=> linkClass(isActive)}><i className="bi bi-graph-up-arrow me-2"></i>Thống kê doanh thu</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/reception/lookup" className={({isActive})=> linkClass(isActive)}><i className="bi bi-search me-2"></i>Tra cứu bệnh nhân</NavLink></li>
              <li className="nav-item mb-2"><NavLink to="/reception/my-schedule" className={({isActive})=> linkClass(isActive)}><i className="bi bi-calendar-week me-2"></i>Lịch của tôi</NavLink></li>
              <li className="nav-item mt-3 w-100">
                <button className="btn btn-outline-danger w-100 rounded-3" onClick={onLogout}>
                  <i className="bi bi-box-arrow-right me-2"></i>Đăng xuất
                </button>
              </li>
            </ul>
          </div>
        </aside>
        <main className="col py-4">
          <div className="d-flex justify-content-end align-items-center mb-4">
            <div className="d-flex align-items-center gap-2 text-muted">
              <i className="bi bi-person me-1"></i>
              <span className="fw-semibold">{user?.name || user?.email}</span>
              <div className="vr mx-2"></div>
              <button className="btn btn-sm btn-outline-secondary rounded-3" onClick={onLogout}>
                <i className="bi bi-box-arrow-right me-1"></i>Đăng xuất
              </button>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
