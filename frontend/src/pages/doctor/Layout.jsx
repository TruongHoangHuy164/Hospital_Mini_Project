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
      <div className="row vh-100">
        <aside className="col-12 col-md-3 col-xl-2 px-sm-2 px-0 bg-light border-end">
          <div className="d-flex flex-column align-items-start px-3 pt-3 h-100">
            <Link to="/" className="navbar-brand mb-3 text-decoration-none">
              <i className="bi bi-hospital text-primary fs-3"></i>
              <span className="ms-2 fw-bold text-dark">Hospital</span>
            </Link>

            <div className="alert alert-info alert-sm mb-3 small w-100">
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

