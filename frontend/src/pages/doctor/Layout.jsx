import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function DoctorLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => {
    await signOut();
    navigate('/login');
  };
  return (
    <div className="container-fluid">
      <div className="row">
        <aside className="col-12 col-md-3 col-xl-2 px-sm-2 px-0 bg-light border-end">
          <div className="d-flex flex-column align-items-start px-3 pt-3 min-vh-100">
            <Link to="/" className="navbar-brand mb-4 text-decoration-none">
              <i className="bi bi-hospital text-primary fs-3"></i>
              <span className="ms-2 fw-bold text-dark">Hospital</span>
            </Link>
            
            <div className="alert alert-info alert-sm mb-4 small">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Chế độ:</strong> Bác sĩ (Khám bệnh)
            </div>
            
            <ul className="nav nav-pills flex-column mb-auto w-100">
              <li className="nav-item mb-2">
                <Link to="/doctor/dashboard" className="nav-link rounded-3 fw-semibold">
                  <i className="bi bi-clipboard-pulse me-2"></i>Khám bệnh
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/doctor/my-schedule" className="nav-link rounded-3 fw-semibold">
                  <i className="bi bi-calendar-event me-2"></i>Lịch của tôi
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/doctor/profile" className="nav-link rounded-3 fw-semibold">
                  <i className="bi bi-person-circle me-2"></i>Hồ sơ cá nhân
                </Link>
              </li>
              <li className="nav-item mt-4 w-100">
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

