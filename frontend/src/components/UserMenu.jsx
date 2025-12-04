import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UserMenu = () => {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button 
        className="user-menu__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <i className="bi bi-person-circle"></i>
        <span>{user?.name || user?.email}</span>
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </button>

      {isOpen && (
        <div className="user-menu__dropdown">
          <div className="user-menu__header">
            <div className="user-info">
              <strong>{user?.name || 'Người dùng'}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          
          <div className="user-menu__divider"></div>
          
          <div className="user-menu__items">
            <Link 
              to="/user/profile" 
              className="user-menu__item"
              onClick={handleMenuClick}
            >
              <i className="bi bi-person"></i>
              Thông tin cá nhân
            </Link>
            
            <Link 
              to="/user/profiles" 
              className="user-menu__item"
              onClick={handleMenuClick}
            >
              <i className="bi bi-people"></i>
              Hồ sơ người thân
            </Link>
            
            <Link 
              to="/booking/history" 
              className="user-menu__item"
              onClick={handleMenuClick}
            >
              <i className="bi bi-calendar-check"></i>
              Lịch khám của tôi
            </Link>
            
            <Link 
              to="/results" 
              className="user-menu__item"
              onClick={handleMenuClick}
            >
              <i className="bi bi-file-medical"></i>
              Kết quả xét nghiệm
            </Link>
          </div>
          
          <div className="user-menu__divider"></div>
          
          <button 
            className="user-menu__item user-menu__signout"
            onClick={() => {
              signOut();
              handleMenuClick();
            }}
          >
            <i className="bi bi-box-arrow-right"></i>
            Đăng xuất
          </button>
        </div>
      )}

      <style>{`
        .user-menu {
          position: relative;
          display: inline-block;
        }

        .user-menu__trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: transparent;
          border: none;
          color: inherit;
          cursor: pointer;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .user-menu__trigger:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .user-menu__dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          min-width: 250px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          overflow: hidden;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .user-menu__header {
          padding: 16px;
          background: #f8f9fa;
        }

        .user-info strong {
          display: block;
          color: #2c3e50;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .user-info span {
          color: #7f8c8d;
          font-size: 12px;
        }

        .user-menu__divider {
          height: 1px;
          background: #e9ecef;
        }

        .user-menu__items {
          padding: 8px 0;
        }

        .user-menu__item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          color: #495057;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .user-menu__item:hover {
          background: #f8f9fa;
          color: #2c3e50;
        }

        .user-menu__item i {
          width: 16px;
          font-size: 16px;
        }

        .user-menu__signout {
          color: #dc3545;
        }

        .user-menu__signout:hover {
          background: #f8d7da;
          color: #721c24;
        }
      `}</style>
    </div>
  );
};

export default UserMenu;