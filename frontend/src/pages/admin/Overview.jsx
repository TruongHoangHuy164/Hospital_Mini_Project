/**
 * FILE: Overview.jsx
 * MÔ TẢ: Trang tổng quan cho Admin
 * Hiển thị thống kê: số người dùng, bệnh nhân, bác sĩ online, doanh thu
 */

import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Overview() {
  // State quản lý dữ liệu tổng quan
  const [data, setData] = useState({ usersCount: 0, patientsCount: 0, latestPatients: [], onlineByRole: { user: 0, doctor: 0, admin: 0 }, revenue: [] });
  const [error, setError] = useState('');

  // Tải dữ liệu tổng quan khi component mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/admin/overview`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        });
        const json = await res.json();
        if (!res.ok) throw json;
        if (mounted) setData(json);
      } catch (e) {
        setError(e?.message || 'Lỗi tải dữ liệu');
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="container-fluid">
      <h3 className="mb-4">Bảng điều khiển</h3>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Người dùng</h6>
                  <h3 className="mb-0">{data.usersCount}</h3>
                  <div className="small text-success mt-1">Online: {data.onlineByRole?.user || 0}</div>
                </div>
                <i className="bi bi-people fs-1 text-primary"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Bệnh nhân</h6>
                  <h3 className="mb-0">{data.patientsCount}</h3>
                </div>
                <i className="bi bi-clipboard2-pulse fs-1 text-success"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted">Bác sĩ online</h6>
                  <h3 className="mb-0">{data.onlineByRole?.doctor || 0}</h3>
                </div>
                <i className="bi bi-activity fs-1 text-info"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <strong>Doanh thu 14 ngày gần nhất</strong>
        </div>
        <div className="card-body">
          {data.revenue?.length === 0 ? (
            <div className="text-muted">Chưa có dữ liệu</div>
          ) : (
            <div style={{ height: 220, overflowX: 'auto' }}>
              <div className="d-flex align-items-end" style={{ gap: 8, minWidth: 600 }}>
                {data.revenue.map(r => {
                  const max = Math.max(...data.revenue.map(x => x.total || 0), 1);
                  const h = Math.round((r.total / max) * 180);
                  return (
                    <div key={r.date} className="text-center" style={{ width: 28 }}>
                      <div title={r.total} style={{ height: h, background: '#0d6efd', borderRadius: 4 }}></div>
                      <small className="d-block mt-1" style={{ transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{r.date.slice(5)}</small>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <strong>Bệnh nhân mới nhất</strong>
        </div>
        <div className="table-responsive">
          <table className="table table-striped mb-0">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Giới tính</th>
                <th>Ngày sinh</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {data.latestPatients.map((p) => (
                <tr key={p._id}>
                  <td>{p.fullName}</td>
                  <td>{p.gender || '-'}</td>
                  <td>{p.dob ? new Date(p.dob).toLocaleDateString() : '-'}</td>
                  <td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {data.latestPatients.length === 0 && (
                <tr><td colSpan={4} className="text-center">Chưa có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
