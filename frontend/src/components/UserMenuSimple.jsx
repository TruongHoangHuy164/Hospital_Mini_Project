import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UserMenuSimple = () => {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        onClick={toggleMenu}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          borderRadius: '6px'
        }}
      >
        <i className="bi bi-person-circle"></i>
        <span>{user?.name || user?.email}</span>
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          minWidth: '250px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '16px', background: '#f8f9fa' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                {user?.name || 'Người dùng'}
              </strong>
              <span style={{ color: '#6c757d', fontSize: '12px' }}>
                {user?.email}
              </span>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid #e9ecef' }}></div>
          
          <div style={{ padding: '8px 0' }}>
            <Link 
              to="/user/profile" 
              onClick={closeMenu}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                color: '#495057',
                textDecoration: 'none',
                fontSize: '14px'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <i className="bi bi-person" style={{ width: '16px' }}></i>
              Thông tin cá nhân
            </Link>
            
            <Link 
              to="/user/profiles" 
              onClick={closeMenu}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                color: '#495057',
                textDecoration: 'none',
                fontSize: '14px'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <i className="bi bi-people" style={{ width: '16px' }}></i>
              Hồ sơ người thân
            </Link>
            
            <Link 
              to="/booking/history" 
              onClick={closeMenu}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                color: '#495057',
                textDecoration: 'none',
                fontSize: '14px'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <i className="bi bi-calendar-check" style={{ width: '16px' }}></i>
              Lịch khám của tôi
            </Link>
            
            <Link 
              to="/results" 
              onClick={closeMenu}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                color: '#495057',
                textDecoration: 'none',
                fontSize: '14px'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <i className="bi bi-file-medical" style={{ width: '16px' }}></i>
              Kết quả xét nghiệm
            </Link>
          </div>
          
          <div style={{ borderTop: '1px solid #e9ecef' }}></div>
          
          <button 
            onClick={() => {
              signOut();
              closeMenu();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              color: '#dc3545',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f8d7da'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <i className="bi bi-box-arrow-right" style={{ width: '16px' }}></i>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenuSimple;