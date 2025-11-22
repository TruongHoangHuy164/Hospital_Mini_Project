import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: yêu cầu OTP, 2: nhập OTP & mật khẩu mới
  const [identifier, setIdentifier] = useState(''); // email hoặc phone
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestOtp(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      setMsg(data.message || 'Nếu tài khoản tồn tại, OTP đã được gửi');
      setStep(2);
    } catch (err) {
      setError(err?.message || 'Lỗi gửi yêu cầu');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp, password }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      setMsg(data.message || 'Đặt lại mật khẩu thành công');
      setStep(1);
      setOtp('');
      setPassword('');
    } catch (err) {
      setError(err?.message || 'Lỗi đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container my-5" style={{ maxWidth: 480 }}>
      <h3 className="mb-3">Quên mật khẩu</h3>
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {step === 1 && (
        <form onSubmit={requestOtp}>
          <div className="mb-3">
            <label className="form-label">Email hoặc Số điện thoại</label>
            <input
              type="text"
              className="form-control"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="VD: user@example.com hoặc 0988123456"
              required
            />
          </div>
          <button disabled={loading} className="btn btn-primary w-100" type="submit">
            {loading ? 'Đang gửi...' : 'Gửi OTP'}
          </button>
        </form>
      )}
      {step === 2 && (
        <form onSubmit={resetPassword}>
          <div className="mb-3">
            <label className="form-label">Mã OTP</label>
            <input
              type="text"
              className="form-control"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Mật khẩu mới</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <button disabled={loading} className="btn btn-success w-100" type="submit">
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
          <button
            type="button"
            className="btn btn-link mt-2"
            onClick={() => {
              setStep(1); setMsg(''); setError('');
            }}
          >Quay lại yêu cầu OTP</button>
        </form>
      )}
    </div>
  );
}
