import { useEffect, useMemo, useState } from 'react';
import { getRevenueSummary, getRevenueByMonth, getRevenueDayDetail, getTopMedicines } from '../../api/revenue';
import { getPharmacyStats } from '../../api/pharmacy';

// Trang thống kê doanh thu thuốc theo tháng/năm
// - Chọn năm, tháng để xem tổng doanh thu và biểu đồ ngày
// - Xem chi tiết đơn thuốc trong một ngày của tháng
export default function PharmacyRevenueStats() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [summary, setSummary] = useState(null);
  const [monthData, setMonthData] = useState({ total: 0, days: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Chi tiết trong ngày
  const [selectedDay, setSelectedDay] = useState(null); // number (1..31)
  const [dayDetail, setDayDetail] = useState({ total: 0, orders: [] });
  const [dayLoading, setDayLoading] = useState(false);

  // Top thuốc trong tháng
  const [topMedicines, setTopMedicines] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        // Ưu tiên API dành cho Nhà thuốc nếu có quyền; fallback sang /revenue
        let sum, monthRes, topMed;
        try {
          const ph = await getPharmacyStats({ year, month });
          sum = { total: ph?.yearTotal ?? ph?.totalYear ?? ph?.total ?? 0 };
          monthRes = { total: ph?.monthTotal ?? ph?.totalMonth ?? 0, days: ph?.days ?? [] };
          topMed = ph?.topMedicines ?? [];
        } catch (e) {
          const results = await Promise.all([
            getRevenueSummary(year),
            getRevenueByMonth(year, month),
            getTopMedicines(year, month, 10),
          ]);
          [sum, monthRes, topMed] = results;
        }
        if (!cancelled) {
          setSummary(sum);
          setMonthData(monthRes);
          setTopMedicines(topMed);
        }
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || e.message || 'Lỗi tải dữ liệu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [year, month]);

  useEffect(() => {
    if (!selectedDay) return;
    let cancelled = false;
    async function fetchDay() {
      setDayLoading(true);
      try {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        // Try pharmacy day detail first, fallback to revenue day detail
        let detail;
        try {
          const ph = await getPharmacyStats({ year, month, day: selectedDay });
          detail = { total: ph?.dayTotal ?? 0, orders: ph?.orders ?? [] };
        } catch (e) {
          detail = await getRevenueDayDetail(dateStr);
        }
        if (!cancelled) setDayDetail(detail);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || e.message || 'Lỗi tải chi tiết ngày');
      } finally {
        if (!cancelled) setDayLoading(false);
      }
    }
    fetchDay();
    return () => { cancelled = true; };
  }, [selectedDay, year, month]);

  const monthName = useMemo(() => {
    const names = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
    return names[(month - 1) % 12];
  }, [month]);

  return (
    <div className="container" style={{ padding: '16px' }}>
      <h2>Thống kê doanh thu thuốc</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label>
          Năm
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ marginLeft: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => {
              const y = today.getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </label>
        <label>
          Tháng
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ marginLeft: 8 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i+1} value={i+1}>{i+1}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <section>
            <h3>Tổng quan năm {year}</h3>
            <div className="card" style={{ padding: 12 }}>
              <p>Doanh thu cả năm: <b>{formatCurrency(summary?.total || 0)}</b></p>
              <p>Tháng {month}: <b>{formatCurrency(monthData?.total || 0)}</b></p>
            </div>

            <h4>Doanh thu theo ngày (tháng {month})</h4>
            <DaysGrid days={monthData?.days || []} onSelectDay={setSelectedDay} selectedDay={selectedDay} />
          </section>

          <section>
            <h3>Top thuốc bán chạy - {monthName} {year}</h3>
            <div className="card" style={{ padding: 12 }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Tên thuốc</th>
                    <th style={{ textAlign: 'right' }}>Số lượng</th>
                    <th style={{ textAlign: 'right' }}>Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {(topMedicines || []).map((m) => (
                    <tr key={m.id || m._id}>
                      <td>{m.tenThuoc || m.name}</td>
                      <td style={{ textAlign: 'right' }}>{m.soLuong || m.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(m.doanhThu || m.revenue || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ marginTop: 16 }}>Chi tiết đơn thuốc trong ngày</h3>
            {!selectedDay && <p>Hãy chọn một ngày trong biểu đồ để xem chi tiết.</p>}
            {selectedDay && (
              <div className="card" style={{ padding: 12 }}>
                {dayLoading ? (
                  <p>Đang tải chi tiết...</p>
                ) : (
                  <>
                    <p>
                      Ngày {selectedDay}/{month}/{year}: Tổng doanh thu <b>{formatCurrency(dayDetail?.total || 0)}</b>
                    </p>
                    <OrdersTable orders={dayDetail?.orders || []} />
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function DaysGrid({ days, onSelectDay, selectedDay }) {
  // days: [{ day: 1..31, total: number }]
  const max = Math.max(0, ...days.map(d => d.total || 0));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
      {(days || []).map(d => {
        const pct = max ? (d.total / max) : 0;
        const isSelected = selectedDay === d.day;
        return (
          <button
            key={d.day}
            onClick={() => onSelectDay(d.day)}
            style={{
              padding: 8,
              borderRadius: 6,
              border: isSelected ? '2px solid #1976d2' : '1px solid #ddd',
              background: `linear-gradient(180deg, rgba(25,118,210,${0.15 + pct * 0.6}), rgba(25,118,210,0))`,
              textAlign: 'left',
              cursor: 'pointer',
            }}
            title={`Ngày ${d.day}: ${formatCurrency(d.total || 0)}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Ngày {d.day}</span>
              <b>{formatCurrency(d.total || 0)}</b>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function OrdersTable({ orders }) {
  if (!orders || !orders.length) return <p>Không có đơn thuốc nào.</p>;
  return (
    <table className="table" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left' }}>Mã đơn</th>
          <th style={{ textAlign: 'left' }}>Bệnh nhân</th>
          <th style={{ textAlign: 'left' }}>Hình thức</th>
          <th style={{ textAlign: 'right' }}>Tổng tiền</th>
          <th style={{ textAlign: 'left' }}>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(o => (
          <tr key={o.id || o._id}>
            <td>{o.maDon || o.code}</td>
            <td>{o.benhNhan?.hoTen || o.patientName || '-'}</td>
            <td>{renderPaymentMethod(o.hinhThuc || o.method)}</td>
            <td style={{ textAlign: 'right' }}>{formatCurrency(o.tongTien || o.total || 0)}</td>
            <td>{renderPaymentStatus(o.status)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderPaymentMethod(m) {
  if (!m) return '-';
  const map = { tien_mat: 'Tiền mặt', momo: 'MoMo' };
  return map[m] || m;
}

function renderPaymentStatus(s) {
  if (!s) return '-';
  const map = { cho_xu_ly: 'Chờ xử lý', da_thanh_toan: 'Đã thanh toán', that_bai: 'Thất bại' };
  return map[s] || s;
}

function formatCurrency(n) {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Math.round(n || 0));
  } catch {
    return `${Math.round(n || 0).toLocaleString('vi-VN')}₫`;
  }
}
