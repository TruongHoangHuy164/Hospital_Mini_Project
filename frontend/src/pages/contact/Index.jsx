import React, { useState } from 'react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  function handleSend(e) {
    e.preventDefault();
    const to = 'truonghoanghuy164@gmail.cm'; // as provided
    const subject = encodeURIComponent(`[Liên hệ] ${name || 'Khách lẻ'}`);
    const bodyLines = [
      `Họ tên: ${name || ''}`,
      `Email liên hệ: ${email || ''}`,
      '',
      'Nội dung:',
      message || ''
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-10">
          <div className="card shadow-sm">
            <div className="card-body">
              <h3 className="mb-3"><i className="bi bi-envelope-paper me-2"></i>Liên hệ</h3>
              <p className="text-muted mb-4">Nếu bạn cần hỗ trợ nhanh, vui lòng liên hệ theo thông tin dưới đây hoặc gửi tin nhắn qua biểu mẫu.</p>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="p-3 border rounded-3 h-100">
                    <div className="d-flex align-items-start">
                      <i className="bi bi-envelope text-primary fs-4 me-2"></i>
                      <div>
                        <div className="fw-semibold">Email</div>
                        <a href="mailto:truonghoanghuy164@gmail.cm" className="text-decoration-none">truonghoanghuy164@gmail.cm</a>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 border rounded-3 h-100">
                    <div className="d-flex align-items-start">
                      <i className="bi bi-telephone text-success fs-4 me-2"></i>
                      <div>
                        <div className="fw-semibold">Số điện thoại</div>
                        <a href="tel:0932961658" className="text-decoration-none">0932961658</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSend} className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Họ tên</label>
                  <input type="text" className="form-control" value={name} onChange={(e)=> setName(e.target.value)} placeholder="Nhập họ tên" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email của bạn</label>
                  <input type="email" className="form-control" value={email} onChange={(e)=> setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="col-12">
                  <label className="form-label">Nội dung</label>
                  <textarea className="form-control" rows={5} value={message} onChange={(e)=> setMessage(e.target.value)} placeholder="Mô tả nội dung cần hỗ trợ..."></textarea>
                </div>
                <div className="col-12 d-flex gap-2">
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-send me-1"></i> Gửi email
                  </button>
                  <a href="tel:0932961658" className="btn btn-outline-success">
                    <i className="bi bi-telephone-outbound me-1"></i> Gọi ngay
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
