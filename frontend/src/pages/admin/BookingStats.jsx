import React, { useEffect, useState, useMemo } from 'react';
import { getAdminBookingStats } from '../../api/admin';

// Trang thống kê đặt lịch cho Admin
export default function AdminBookingStats() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(null); // null = xem cả năm
  const [top, setTop] = useState(10);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const params = { year, top };
        if (month) params.month = month;
        const res = await getAdminBookingStats(params);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || e.message || 'Lỗi tải dữ liệu');
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [year, month, top]);

  const monthsArray = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const monthLabel = month ? `Tháng ${month}` : 'Cả năm';

  return (
    <div className="container-fluid">
      <h2>Thống kê đặt lịch - {monthLabel} {year}</h2>
      <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
        <div>
          <label className="form-label">Năm</label>
          <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }).map((_, idx) => {
              const y = now.getFullYear() - idx;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
        <div>
          <label className="form-label">Tháng</label>
          <select className="form-select" value={month || ''} onChange={e => setMonth(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Cả năm</option>
            {monthsArray.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Top người dùng</label>
          <select className="form-select" value={top} onChange={e => setTop(Number(e.target.value))}>
            {[5,10,15,20,30,50].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {loading && <p>Đang tải...</p>}
      {error && <p className="text-danger">{error}</p>}

      {data && !loading && (
        <div className="row g-3">
          <div className="col-12 col-lg-3">
            <StatsCard title="Tổng số lịch" value={data.totalBookings} />
          </div>
          <div className="col-12 col-lg-3">
            <StatsCard title="Số người dùng đặt" value={data.uniqueUsers} />
          </div>
          <div className="col-12 col-lg-3">
            <StatsCard title="Sử dụng hồ sơ phụ" value={data.profileUsage?.withPatientProfile} subtitle="(hồ sơ người thân)" />
          </div>
          <div className="col-12 col-lg-3">
            <StatsCard title="Sử dụng BenhNhan" value={data.profileUsage?.withBenhNhan} subtitle="(trực tiếp)" />
          </div>

          <div className="col-12 col-xl-6">
            <Section title={month ? 'Theo ngày trong tháng' : 'Theo tháng trong năm'}>
              <TimelineChart items={month ? (data.days || []) : (data.monthly || [])} monthMode={!!month} />
            </Section>
          </div>
          <div className="col-12 col-xl-6">
            <Section title="Phân bố trạng thái lịch">
              <StatusBreakdown status={data.statusBreakdown || {}} />
            </Section>
          </div>

          <div className="col-12">
            <Section title={`Top ${top} người dùng đặt lịch nhiều nhất`}>
              <TopUsersTable list={data.topUsers || []} />
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, subtitle }) {
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h6 className="text-muted mb-1">{title}</h6>
        <h3 className="fw-bold mb-0">{value || 0}</h3>
        {subtitle && <small className="text-secondary">{subtitle}</small>}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-header bg-white"><h6 className="mb-0">{title}</h6></div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function TimelineChart({ items, monthMode }) {
  if (!items.length) return <p>Không có dữ liệu.</p>;
  const max = Math.max(...items.map(i => i.count));
  return (
    <div className="d-flex flex-column gap-2">
      {items.map(i => {
        const label = monthMode ? `Ngày ${i.day}` : `Tháng ${i.month}`;
        const pct = max ? (i.count / max) : 0;
        return (
          <div key={label} className="d-flex align-items-center gap-2">
            <div style={{ width: 80 }}>{label}</div>
            <div className="flex-grow-1" style={{ background: '#f1f3f5', borderRadius: 4 }}>
              <div style={{ width: `${pct*100}%`, background: 'linear-gradient(90deg,#0d6efd,#5ab2ff)', height: 20, borderRadius: 4 }} />
            </div>
            <div style={{ width: 60, textAlign: 'right' }}>{i.count}</div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBreakdown({ status }) {
  const keys = ['cho_thanh_toan','da_thanh_toan','da_kham'];
  const labels = { cho_thanh_toan: 'Chờ thanh toán', da_thanh_toan: 'Đã thanh toán', da_kham: 'Đã khám' };
  const total = keys.reduce((s,k)=> s + (status[k]||0), 0);
  if (!total) return <p>Không có dữ liệu.</p>;
  return (
    <div className="d-flex flex-column gap-2">
      {keys.map(k => {
        const count = status[k]||0; const pct = total ? count/total : 0;
        return (
          <div key={k} className="d-flex align-items-center gap-2">
            <div style={{ width: 140 }}>{labels[k]}</div>
            <div className="flex-grow-1" style={{ background: '#f8f9fa', borderRadius: 4 }}>
              <div style={{ width: `${pct*100}%`, background: '#198754', height: 18, borderRadius: 4 }} />
            </div>
            <div style={{ width: 50, textAlign: 'right' }}>{count}</div>
            <div style={{ width: 50, textAlign: 'right' }}>{Math.round(pct*100)}%</div>
          </div>
        );
      })}
    </div>
  );
}

function TopUsersTable({ list }) {
  if (!list.length) return <p>Không có dữ liệu.</p>;
  return (
    <div className="table-responsive">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Người dùng</th>
            <th>Email</th>
            <th className="text-end">Số lịch</th>
          </tr>
        </thead>
        <tbody>
          {list.map(u => (
            <tr key={u.userId}>
              <td>{u.name || u.userId}</td>
              <td>{u.email || '-'}</td>
              <td className="text-end fw-semibold">{u.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
