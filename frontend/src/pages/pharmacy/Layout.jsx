import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Layout nhà thuốc thiết kế tương tự layout bác sĩ: thương hiệu, alert chế độ, sidebar có icon, nav-link bo góc.
export default function PharmacyLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await signOut(); navigate('/login'); };
  return (
    <div className="container-fluid">
      <div className="row">
        <aside className="col-12 col-md-3 col-xl-2 px-sm-2 px-0 bg-light border-end">
          <div className="d-flex flex-column align-items-start px-3 pt-3 min-vh-100 w-100">
            <Link to="/pharmacy" className="navbar-brand mb-4 text-decoration-none">
              <i className="bi bi-capsule text-success fs-3"></i>
              <span className="ms-2 fw-bold text-dark">Pharmacy</span>
            </Link>
            <div className="alert alert-success alert-sm mb-4 small w-100">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Chế độ:</strong> Nhà thuốc (Thu ngân & phát thuốc)
            </div>
            <ul className="nav nav-pills flex-column mb-auto w-100">
              <li className="nav-item mb-2">
                <Link to="/pharmacy/dashboard" className="nav-link rounded-3 fw-semibold">
                  <i className="bi bi-speedometer2 me-2"></i>Bảng điều khiển
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/pharmacy/orders" className="nav-link rounded-3 fw-semibold">
                  <i className="bi bi-cash-stack me-2"></i>Thu tiền
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/pharmacy/prepare" className="nav-link rounded-3 fw-semibold">
                  <i className="bi bi-truck me-2"></i>Chuẩn bị & Giao
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/pharmacy/inventory" className="nav-link rounded-3 fw-semibold">
                  <i className="bi bi-box-seam me-2"></i>Quản lý kho
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/pharmacy/stats" className="nav-link rounded-3 fw-semibold">
                  <i className="bi bi-graph-up-arrow me-2"></i>Thống kê doanh thu
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/pharmacy/my-schedule" className="nav-link rounded-3 fw-semibold">
                  <i className="bi bi-calendar-event me-2"></i>Lịch của tôi
                </Link>
              </li>
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
