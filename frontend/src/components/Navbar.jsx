import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import UserMenu from './UserMenuSimple'

export default function Navbar() {
  const { user, isAuthenticated, signOut } = useAuth();
  return (
    <nav className="navbar">
      <div className="container navbar__inner">
          <Link to="/about" className="nav__item"><i className="bi bi-info-circle"></i> Giới thiệu</Link>
          <Link to="/specialties" className="nav__item"><i className="bi bi-hospital"></i> Chuyên khoa</Link>
          <Link to="/services" className="nav__item"><i className="bi bi-clipboard2-pulse"></i> Dịch vụ</Link>
          <Link to="/medicines" className="nav__item"><i className="bi bi-capsule"></i> Thuốc</Link>
          <Link to="/news" className="nav__item"><i className="bi bi-newspaper"></i> Tin tức</Link>
          <Link to="/reviews" className="nav__item"><i className="bi bi-star"></i> Đánh giá</Link>
          <Link to="/guide" className="nav__item"><i className="bi bi-clipboard-check"></i> Hướng dẫn khám</Link>
          <Link to="/contact" className="nav__item"><i className="bi bi-envelope"></i> Liên hệ</Link>
        <span className="flex-spacer" style={{ flex: 1 }} />
        {isAuthenticated && user?.role === 'admin' && (
          <Link to="/admin/overview" className="nav__item"><i className="bi bi-speedometer2"></i> Admin</Link>
        )}
        {isAuthenticated && user?.role === 'pharmacy' && (
          <Link to="/pharmacy" className="nav__item"><i className="bi bi-capsule"></i> Nhà thuốc</Link>
        )}
        {!isAuthenticated ? (
          <>
            <Link to="/login" className="nav__item"><i className="bi bi-box-arrow-in-right"></i> Đăng nhập</Link>
            <Link to="/register" className="nav__item"><i className="bi bi-person-plus"></i> Đăng ký</Link>
          </>
        ) : (
          <UserMenu />
        )}
      </div>
    </nav>
  )
}
