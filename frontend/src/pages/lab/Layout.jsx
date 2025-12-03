import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Layout Cận lâm sàng đồng bộ với Doctor/Pharmacy: brand lớn, alert chế độ, nav bo góc, trạng thái active.
export default function LabLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await signOut(); navigate('/login'); };
  return (
    <div className="container-fluid">
      <div className="row vh-100">
        <aside className="col-12 col-md-3 col-xl-2 px-sm-2 px-0 bg-light border-end">
          <div className="d-flex flex-column align-items-start px-3 pt-3 h-100 w-100">
            <NavLink to="/lab/dashboard" className="navbar-brand mb-3 text-decoration-none">
              <i className="bi bi-beaker text-warning fs-3"></i>
              <span className="ms-2 fw-bold text-dark">Lab</span>
            </NavLink>
            <div className="alert alert-warning alert-sm mb-3 small w-100">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Chế độ:</strong> Cận lâm sàng (Xét nghiệm & Kết quả)
            </div>
            <ul className="nav nav-pills flex-column mb-auto w-100">
              <li className="nav-item mb-2">
                <NavLink to="/lab/dashboard" className={({isActive})=>`nav-link rounded-3 fw-semibold ${isActive?'active':''}`}>
                  <i className="bi bi-speedometer2 me-2"></i>Bảng điều khiển
                </NavLink>
              </li>
              <li className="nav-item mb-2">
                <NavLink to="/lab/orders" className={({isActive})=>`nav-link rounded-3 fw-semibold ${isActive?'active':''}`}>
                  <i className="bi bi-clipboard-data me-2"></i>Tiếp nhận chỉ định
                </NavLink>
              </li>
              <li className="nav-item mb-2">
                <NavLink to="/lab/stats" className={({isActive})=>`nav-link rounded-3 fw-semibold ${isActive?'active':''}`}>
                  <i className="bi bi-graph-up me-2"></i>Thống kê doanh thu
                </NavLink>
              </li>
              <li className="nav-item mb-2">
                <NavLink to="/lab/my-schedule" className={({isActive})=>`nav-link rounded-3 fw-semibold ${isActive?'active':''}`}>
                  <i className="bi bi-calendar-event me-2"></i>Lịch của tôi
                </NavLink>
              </li>
            </ul>
            <div className="mt-auto w-100">
              <div className="small text-muted mb-2 d-flex align-items-center gap-2">
                <i className="bi bi-person me-1"></i>
                <span className="fw-semibold">{user?.name || user?.email}</span>
              </div>
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
