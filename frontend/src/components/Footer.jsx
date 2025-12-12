/**
 * FILE: Footer.jsx
 * MÔ TẢ: Component footer của website
 * Hiển thị thông tin liên hệ, liên kết nhanh, mạng xã hội
 */

import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Component Footer chính
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <div className="footer__brand">Bệnh viện Demo</div>
          <p>Thủ Đức, TP.HCM</p>
          <p>Tel: 0932961658 • Email: truonghoanghuy164@gmail.com</p>
        </div>
        <div>
          <h4>Liên kết</h4>
          <ul className="list">
            <li><Link to="/specialties">Chuyên khoa</Link></li>
            <li><a href="#">Dịch vụ</a></li>
            <li><a href="#">Tin tức</a></li>
            <li><a href="#">Liên hệ</a></li>
          </ul>
        </div>
        <div>
          <h4>Kết nối</h4>
          <div className="socials">
            <a className="social" href="#" aria-label="Facebook">Fb</a>
            <a className="social" href="#" aria-label="YouTube">Yt</a>
          </div>
        </div>
      </div>
      <div className="footer__note">© 2025 Bệnh viện Demo. Developer By Trương Hoàng Huy </div>
    </footer>
  )
}
