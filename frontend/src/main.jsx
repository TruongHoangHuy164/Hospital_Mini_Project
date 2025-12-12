/**
 * FILE: main.jsx
 * MÔ TẢ: Điểm khởi đầu của ứng dụng React
 * Thiết lập:
 * - React Router cho điều hướng trang
 * - AuthContext cho quản lý xác thực
 * - ErrorBoundary bắt lỗi toàn ứng dụng
 * - Bootstrap CSS framework
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './styles.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './styles/reception.css'

// Tạo root React và render ứng dụng
const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
