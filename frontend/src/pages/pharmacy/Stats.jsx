"use client";
import { useEffect, useMemo, useState } from 'react';
import { getPharmacyOrders } from '../../api/pharmacy';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement);

// Thiết kế mới: hiển thị doanh thu tháng, top ngày và chi tiết ngày chọn.
// Sử dụng dữ liệu thực thay vì mock.

// UI primitives (Card, Button) đơn giản để không phụ thuộc thư viện ngoài.
function Card({ className='', children }) { return <div className={"rounded-xl border border-slate-200 bg-white shadow-sm "+className}>{children}</div>; }
function CardHeader({ className='', children }) { return <div className={"p-4 pb-2 "+className}>{children}</div>; }
function CardContent({ className='', children }) { return <div className={"p-4 pt-0 "+className}>{children}</div>; }
function CardTitle({ className='', children }) { return <h2 className={"text-sm font-semibold text-slate-700 "+className}>{children}</h2>; }
function CardDescription({ className='', children }) { return <p className={"text-xs text-slate-500 mt-1 "+className}>{children}</p>; }
function Button({ children, onClick, className='', variant='outline', size='sm' }) {
  const sizes = { sm:'h-8 px-3', md:'h-10 px-4', lg:'h-11 px-6' };
  const variants = { outline:'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700', primary:'bg-emerald-600 text-white hover:bg-emerald-700 shadow' };
  return <button onClick={onClick} className={["inline-flex items-center justify-center rounded-lg text-sm font-medium transition", sizes[size], variants[variant], className].join(' ')}>{children}</button>;
}

export default function PharmacyRevenueStats(){
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()+1);
  const [summary, setSummary] = useState(null);
  const [monthData, setMonthData] = useState({ total:0, days:[], statusTotals:{ paid:0, preparing:0, completed:0 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetail, setDayDetail] = useState({ total:0, orders:[] });
  const [dayLoading, setDayLoading] = useState(false);

  // Tải dữ liệu tháng
  useEffect(()=> {
    let cancelled = false;
    async function run(){
      setLoading(true); setError('');
      try {
        const daysInMonth = new Date(year, month, 0).getDate();
        const uiStatuses = ['PAID','PREPARING','COMPLETED'];
        // Tạo danh sách promise cho toàn bộ ngày (mỗi ngày gồm 3 request song song)
        const dayPromises = Array.from({length: daysInMonth}, (_,i) => {
          const d = i+1;
          const dayStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          return Promise.all(uiStatuses.map(st => getPharmacyOrders({ status: st, day: dayStr }).catch(()=>({data:[]}))))
            .then(results => ({ day: d, results }))
            .catch(() => ({ day: d, results: [] }));
        });
        const raw = await Promise.all(dayPromises);
        if(cancelled) return;
        const statusTotals = { paid:0, preparing:0, completed:0 };
        const allDayEntries = raw.map(({ day, results }) => {
          const orders = results.flatMap(r => r?.data || []);
          const total = orders.reduce((s,o)=> s + computeOrderTotal(o),0);
          uiStatuses.forEach((st, idx) => {
            const arr = results[idx]?.data || [];
            if(st === 'PAID') statusTotals.paid += arr.length;
            if(st === 'PREPARING') statusTotals.preparing += arr.length;
            if(st === 'COMPLETED') statusTotals.completed += arr.length;
          });
          return { day, total, orders: orders.length };
        });
        const monthTotal = allDayEntries.reduce((s,d)=> s + d.total,0);
        setSummary({ total: monthTotal });
        setMonthData({ total: monthTotal, days: allDayEntries, statusTotals });
      } catch(e){ if(!cancelled) setError(e?.response?.data?.message || e.message || 'Lỗi tải dữ liệu'); }
      finally { if(!cancelled) setLoading(false); }
    }
    run();
    return ()=> { cancelled = true; };
  }, [year, month]);

  // Tải chi tiết ngày
  useEffect(()=> {
    if(!selectedDay) return;
    let cancelled = false;
    async function run(){
      setDayLoading(true);
      try {
        const dayStr = `${year}-${String(month).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`;
        const backendStatuses = ['pending_pharmacy','dispensing','dispensed'];
        const promises = backendStatuses.map(st => getPharmacyOrders({ status: st, day: dayStr }).catch(()=>({data:[]})));
        const results = await Promise.all(promises);
        const orders = results.flatMap(r=> r.data || []);
        const total = orders.reduce((s,o)=> s + computeOrderTotal(o),0);
        if(!cancelled) setDayDetail({ total, orders });
      } catch(e){ if(!cancelled) setError(e?.response?.data?.message || e.message || 'Lỗi tải chi tiết ngày'); }
      finally { if(!cancelled) setDayLoading(false); }
    }
    run();
    return ()=> { cancelled = true; };
  }, [selectedDay, year, month]);

  const monthName = useMemo(()=> {
    const names = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
    return names[(month-1)%12];
  }, [month]);

  const chartData = useMemo(()=> (monthData.days||[]).map(d=> ({ day:d.day, revenue:d.total, count:d.orders })), [monthData]);
  const topDays = useMemo(()=> [...(monthData.days||[])].sort((a,b)=> b.total - a.total).slice(0,5), [monthData]);

  // Chart.js dataset cho biểu đồ chính
  const barChartData = useMemo(()=> ({
    labels: chartData.map(d=> `Ngày ${d.day}`),
    datasets: [
      {
        label: 'Doanh thu (VND)',
        data: chartData.map(d=> d.revenue),
        backgroundColor: chartData.map(d => selectedDay === d.day ? 'rgba(16,185,129,0.9)' : 'rgba(16,185,129,0.6)'),
        borderRadius: 6,
        maxBarThickness: 32
      },
      {
        label: 'Số đơn',
        data: chartData.map(d=> d.count),
        backgroundColor: 'rgba(59,130,246,0.5)',
        borderRadius: 6,
        maxBarThickness: 28,
        yAxisID: 'y1'
      }
    ]
  }), [chartData, selectedDay]);

  const barOptions = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    stacked: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { callbacks: { label: (ctx) => ctx.dataset.label === 'Doanh thu (VND)' ? formatCurrency(ctx.parsed.y) : `Đơn: ${ctx.parsed.y}` } }
    },
    scales: {
      y: { ticks: { callback: v => formatShortNumber(v) }, title: { display: true, text: 'Doanh thu' } },
      y1: { position:'right', grid:{ drawOnChartArea:false }, title:{ display:true, text:'Số đơn' } }
    }
  };

  const statusTotals = monthData.statusTotals || { paid:0, preparing:0, completed:0 };
  const totalOrdersMonth = statusTotals.paid + statusTotals.preparing + statusTotals.completed;
  const statusPercent = (n) => totalOrdersMonth? ((n/totalOrdersMonth)*100).toFixed(1) : 0;

  return (
    // Dùng Bootstrap thay vì class Tailwind (chưa cài) để tránh layout bị đẩy xuống
    <div className="py-3 px-3 bg-white">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <span className="bi bi-currency-dollar text-emerald-600"></span>
            Doanh thu Nhà thuốc
          </h1>
          <p className="text-slate-600 text-sm mt-1">Theo dõi doanh thu theo tháng và chi tiết theo ngày</p>
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm" value={year} onChange={e=> setYear(Number(e.target.value))}>
            {Array.from({length:6}).map((_,i)=> { const y = today.getFullYear()-i; return <option key={y} value={y}>{y}</option>; })}
          </select>
          <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm" value={month} onChange={e=> setMonth(Number(e.target.value))}>
            {Array.from({length:12}).map((_,i)=> <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
          </select>
        </div>
      </div>

      {error && !loading && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status" style={{width:'2rem',height:'2rem'}}></div>
          <p className="text-muted mt-2 small">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4"><Card><CardHeader><CardTitle>Doanh thu Năm {year}</CardTitle></CardHeader><CardContent><div className="h4 m-0 fw-bold">{formatCurrency(summary?.total||0)}</div><div className="text-muted small mt-1">Tính đến tháng {month}</div></CardContent></Card></div>
          <div className="col-12 col-md-4"><Card><CardHeader><CardTitle>{monthName}</CardTitle></CardHeader><CardContent><div className="h4 m-0 fw-bold text-success">{formatCurrency(monthData?.total||0)}</div><div className="text-muted small mt-1">{monthData?.days?.length||0} ngày</div></CardContent></Card></div>
          <div className="col-12 col-md-4"><Card><CardHeader><CardTitle>Trung bình mỗi ngày</CardTitle></CardHeader><CardContent><div className="h4 m-0 fw-bold text-primary">{formatCurrency((monthData?.total||0)/(monthData?.days?.length||1))}</div><div className="text-muted small mt-1">Doanh thu/ngày</div></CardContent></Card></div>
        </div>
      )}

      {!loading && !error && (
        <div className="row g-4">
          <div className="col-12 col-lg-8">
            <Card>
              <CardHeader><CardTitle><i className="bi bi-graph-up text-success me-1"></i>Doanh thu & số đơn theo ngày</CardTitle><CardDescription>Tháng {month} năm {year}</CardDescription></CardHeader>
              <CardContent>
                {chartData.length === 0 ? <div className="small text-muted">Không có dữ liệu</div> : <Bar data={barChartData} options={barOptions} />}
                <div className="mt-2 small text-muted">Di chuột lên cột để xem tooltip. Chọn ngày ở bảng Top bên phải.</div>
              </CardContent>
            </Card>
            <div className="mt-4">
              <Card>
                <CardHeader><CardTitle>Phân bố trạng thái tháng</CardTitle><CardDescription>Tổng {totalOrdersMonth} đơn</CardDescription></CardHeader>
                <CardContent>
                  <div className="row g-3">
                    <div className="col-4">
                      <div className="p-2 rounded border border-success bg-success bg-opacity-10">
                        <div className="fw-semibold text-success">Đã thanh toán</div>
                        <div className="small">{statusTotals.paid} đơn</div>
                        <div className="text-success fw-semibold small">{statusPercent(statusTotals.paid)}%</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2 rounded border border-primary bg-primary bg-opacity-10">
                        <div className="fw-semibold text-primary">Chuẩn bị</div>
                        <div className="small">{statusTotals.preparing} đơn</div>
                        <div className="text-primary fw-semibold small">{statusPercent(statusTotals.preparing)}%</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2 rounded border border-info bg-info bg-opacity-10">
                        <div className="fw-semibold text-info">Hoàn tất</div>
                        <div className="small">{statusTotals.completed} đơn</div>
                        <div className="text-info fw-semibold small">{statusPercent(statusTotals.completed)}%</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <Card>
              <CardHeader><CardTitle>Top 5 Ngày</CardTitle><CardDescription>Doanh thu cao nhất</CardDescription></CardHeader>
              <CardContent>
                <div className="d-flex flex-column gap-2">
                  {topDays.map(d => (
                    <button key={d.day} onClick={()=> setSelectedDay(d.day)} className={`text-start p-3 rounded border small ${selectedDay===d.day? 'border-success bg-success bg-opacity-10':'border-secondary bg-light'}`}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-medium">Ngày {d.day}</div>
                          <div className="text-muted small">{d.orders} đơn</div>
                        </div>
                        <div className="fw-semibold text-success">{formatCurrency(d.total)}</div>
                      </div>
                    </button>
                  ))}
                  {topDays.length === 0 && <div className="small text-muted">Không có dữ liệu</div>}
                </div>
              </CardContent>
            </Card>
            <div className="mt-4">
              <Card>
                <CardHeader><CardTitle>Danh sách ngày trong tháng</CardTitle><CardDescription>Bấm để xem chi tiết đơn thuốc</CardDescription></CardHeader>
                <CardContent>
                  <div className="table-responsive" style={{maxHeight:'420px', overflowY:'auto'}}>
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{width:'70px'}}>Ngày</th>
                          <th className="text-end">Số đơn</th>
                          <th className="text-end">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthData.days && monthData.days.map(d => (
                          <tr key={d.day} role="button" onClick={()=> setSelectedDay(d.day)} className={selectedDay===d.day? 'table-success':''}>
                            <td className="fw-medium">{d.day}</td>
                            <td className="text-end"><span className="badge bg-secondary">{d.orders}</span></td>
                            <td className="text-end fw-semibold text-success">{formatCurrency(d.total)}</td>
                          </tr>
                        ))}
                        {(!monthData.days || monthData.days.length===0) && (
                          <tr><td colSpan={3} className="text-muted text-center small">Không có dữ liệu</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && selectedDay && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Chi tiết đơn thuốc</CardTitle>
                  <CardDescription>Ngày {selectedDay}/{month}/{year} - {formatCurrency(dayDetail?.total||0)}</CardDescription>
                </div>
                <Button onClick={()=> setSelectedDay(null)}>Bỏ chọn</Button>
              </div>
            </CardHeader>
            <CardContent>{dayLoading? <div className="text-center py-8 text-slate-500">Đang tải chi tiết...</div> : <OrdersTable orders={dayDetail?.orders||[]} />}</CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// (Đã thay thế lưới cột thủ công bằng Chart.js Bar nên bỏ DailyBarChart)
function formatShortNumber(v){
  if(v>=1_000_000_000) return (v/1_000_000_000).toFixed(1)+'B';
  if(v>=1_000_000) return (v/1_000_000).toFixed(1)+'M';
  if(v>=1_000) return (v/1_000).toFixed(1)+'K';
  return v;
}

function OrdersTable({ orders }) {
  if(!orders || !orders.length) return <div className="text-sm text-slate-500">Không có đơn thuốc nào.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-3 font-medium text-slate-700">Mã đơn</th>
            <th className="text-left py-2 px-3 font-medium text-slate-700">Bệnh nhân</th>
            <th className="text-right py-2 px-3 font-medium text-slate-700">Tổng tiền</th>
            <th className="text-left py-2 px-3 font-medium text-slate-700">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o._id || o.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2 px-3">{o.maDon || o.code || String(o._id).slice(-6)}</td>
              <td className="py-2 px-3">{o.hoSoKhamId?.benhNhanId?.hoTen || '-'}</td>
              <td className="py-2 px-3 text-right font-medium text-emerald-600">{formatCurrency(o.tongTien || computeOrderTotal(o))}</td>
              <td className="py-2 px-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">{mapDonThuocStatus(o.status)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function mapDonThuocStatus(s){
  const map = { draft:'Nháp', issued:'Chờ thanh toán', pending_pharmacy:'Đã thanh toán', dispensing:'Chuẩn bị', dispensed:'Hoàn tất', closed:'Đóng', cancelled:'Hủy' };
  return map[s] || s || '-';
}

function formatCurrency(n){
  try { return new Intl.NumberFormat('vi-VN',{ style:'currency', currency:'VND', maximumFractionDigits:0 }).format(Math.round(n||0)); }
  catch { return `${Math.round(n||0).toLocaleString('vi-VN')}₫`; }
}

function computeOrderTotal(o){
  if(!o) return 0;
  if(typeof o.tongTien === 'number' && o.tongTien>0) return o.tongTien;
  if(Array.isArray(o.items)) return o.items.reduce((s,it)=> s + ((it.thuocId && typeof it.thuocId.gia==='number'? it.thuocId.gia:0) * (it.soLuong||0)),0);
  return 0;
}
