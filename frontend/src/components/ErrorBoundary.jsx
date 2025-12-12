/**
 * FILE: ErrorBoundary.jsx
 * MÔ TẢ: Component bắt lỗi React (React Error Boundary)
 * Bắt tất cả lỗi JavaScript trong cây component con và hiển thị UI dự phòng
 * Ngăn chặn toàn bộ ứng dụng bị crash khi có lỗi
 */

import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Phương thức static được gọi khi có lỗi xảy ra
   * Cập nhật state để hiển thị UI lỗi
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * Phương thức được gọi sau khi lỗi đã được bắt
   * Dùng để log thông tin lỗi ra console
   */
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    // Nếu có lỗi, hiển thị UI lỗi
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          border: '2px solid #ff6b6b', 
          borderRadius: '8px',
          backgroundColor: '#ffe0e0'
        }}>
          <h2 style={{ color: '#d63384' }}>Có lỗi xảy ra!</h2>
          <details style={{ marginTop: '10px' }}>
            <summary>Chi tiết lỗi (click để xem)</summary>
            <pre style={{ 
              background: '#f8f9fa', 
              padding: '10px', 
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              marginTop: '10px'
            }}>
              {this.state.error?.toString()}
            </pre>
          </details>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Thử lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;