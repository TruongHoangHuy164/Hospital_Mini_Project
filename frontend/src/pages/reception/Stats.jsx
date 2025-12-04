"use client";
import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { getReceptionBookingStats, getReceptionPharmacyStats } from '../../api/reception';
import { privateApi as api } from '../../api/axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function Card({ className='', children }) { return <div className={"rounded-3 border bg-white shadow-sm "+className}>{children}</div>; }
function CardHeader({ className='', children }) { return <div className={"p-3 pb-2 "+className}>{children}</div>; }
function CardContent({ className='', children }) { return <div className={"p-3 pt-0 "+className}>{children}</div>; }
function CardTitle({ className='', children }) { return <h2 className={"h6 m-0 "+className}>{children}</h2>; }
function CardDescription({ className='', children }) { return <p className={"small text-muted mt-1 "+className}>{children}</p>; }

export default function ReceptionRevenueStats(){
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()+1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(()=>{
    let cancelled=false;
    async function run(){
      setLoading(true); setError('');
      try{
        // Lấy thống kê đặt lịch (150k/booking thành công) từ endpoint admin đã có
        const resp = await getReceptionBookingStats({ year, month });
        // Chuẩn hoá dữ liệu đặt lịch: fallback doanh thu = count * 150000 nếu backend không trả
        const bookingByDayRaw = resp?.days || resp?.data?.days || [];
        const bookingByDay = bookingByDayRaw.map(d => ({
          // Hỗ trợ cả dạng day số (3) và day chuỗi (YYYY-MM-DD)
          day: (typeof d.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.day)) ? Number(d.day.slice(8,10)) : Number(d.day || 0),
          count: typeof d.count === 'number' ? d.count : (typeof d.bookings === 'number' ? d.bookings : 0),
          revenue: typeof d.revenue === 'number' ? d.revenue : (typeof d.count === 'number' ? d.count*150000 : (typeof d.bookings === 'number' ? d.bookings*150000 : 0))
        }));
        // Lấy doanh thu dịch vụ (pharmacy) theo ngày qua endpoint dành cho lễ tân
        const pharmacyStats = await getReceptionPharmacyStats({ year, month });
        const labDayData = (pharmacyStats?.days || pharmacyStats?.data?.days || []).map(d=> ({ day:d.day, labRevenue: d.labRevenue||0 }));
        const daysInMonth = new Date(year, month, 0).getDate();
        const merged = Array.from({length:daysInMonth}, (_,i)=>{
          const d=i+1;
          const book = bookingByDay.find(x=> Number(x.day)===d) || { count:0, revenue:0 };
          const lab = labDayData.find(x=> x.day===d) || { labRevenue:0 };
          const revenue = (book.revenue||0) + (lab.labRevenue||0);
          return { day:d, bookings: book.count||0, bookingRevenue: book.revenue||0, labRevenue: lab.labRevenue||0, revenue };
        });
        // Override today's data based on actual appointments of today
        const todayStr = new Date().toISOString().slice(0,10);
        const todayDayNum = Number(todayStr.slice(8,10));
        try{
          const { data: todayAppts } = await api.get('/booking/appointments', { params: { date: todayStr } });
          const todayCount = Array.isArray(todayAppts) ? todayAppts.length : 0;
          const todayRevenue = todayCount * 150000;
          const idx = merged.findIndex(x=> x.day === todayDayNum);
          if(idx >= 0){
            merged[idx] = { ...merged[idx], bookings: todayCount, bookingRevenue: todayRevenue, revenue: todayRevenue + (merged[idx].labRevenue||0) };
          }
        }catch(e){ /* ignore fallback to booking stats */ }
        const monthTotal = merged.reduce((s,x)=> s+x.revenue,0);
        if(!cancelled){ setDays(merged); setTotal(monthTotal); }
      }catch(e){
        if(cancelled) return;
        const status = e?.response?.status;
        if(status === 403){
          setError('Bạn không đủ quyền truy cập thống kê đặt lịch. Vui lòng đăng nhập tài khoản có quyền hoặc liên hệ quản trị.');
          setDays([]); setTotal(0);
        } else {
          setError(e?.response?.data?.message || e.message || 'Lỗi tải dữ liệu');
        }
      }
      finally{ if(!cancelled) setLoading(false); }
    }
    run();
    return ()=>{ cancelled=true; };
  },[year,month]);

  const chartData = useMemo(()=> ({
    labels: days.map(d=>`Ngày ${d.day}`),
    datasets: [
      { label:'Doanh thu (VND)', data: days.map(d=> d.revenue), backgroundColor:'rgba(13,110,253,0.5)', borderRadius:6, maxBarThickness:32 },
      { label:'Số đặt lịch', data: days.map(d=> d.bookings), backgroundColor:'rgba(25,135,84,0.5)', borderRadius:6, maxBarThickness:28, yAxisID:'y1' }
    ]
  }),[days]);

  const barOptions = { responsive:true, interaction:{mode:'index',intersect:false}, stacked:false, plugins:{ legend:{position:'bottom'} }, scales:{ y:{ title:{display:true,text:'Doanh thu'} }, y1:{ position:'right', grid:{ drawOnChartArea:false }, title:{ display:true,text:'Số đặt lịch' } } } };

  const monthName = useMemo(()=> ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'][month-1], [month]);

  return (
    <div className="py-3 px-3 bg-white">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <div>
          <h1 className="h4 m-0"><i className="bi bi-graph-up-arrow text-primary me-2"></i>Thống kê doanh thu Lễ tân</h1>
          <div className="small text-muted">Đặt lịch (150k/ca thành công) + Thu tiền dịch vụ</div>
        </div>
        <div className="d-flex gap-2">
          <select className="form-select form-select-sm" value={year} onChange={e=> setYear(Number(e.target.value))}>
            {Array.from({length:6}).map((_,i)=>{ const y=today.getFullYear()-i; return <option key={y} value={y}>{y}</option>; })}
          </select>
          <select className="form-select form-select-sm" value={month} onChange={e=> setMonth(Number(e.target.value))}>
            {Array.from({length:12}).map((_,i)=> <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
          </select>
        </div>
      </div>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status"></div></div>
      ) : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4"><Card><CardHeader><CardTitle>{monthName}</CardTitle><CardDescription>Doanh thu tháng</CardDescription></CardHeader><CardContent><div className="h4 m-0 fw-bold text-primary">{formatCurrency(total)}</div></CardContent></Card></div>
            <div className="col-12 col-md-8"><Card><CardHeader><CardTitle>Doanh thu & đặt lịch theo ngày</CardTitle><CardDescription>Tháng {month} năm {year}</CardDescription></CardHeader><CardContent>{days.length? <Bar data={chartData} options={barOptions} /> : <div className="small text-muted">Không có dữ liệu</div>}</CardContent></Card></div>
          </div>
          <Card>
            <CardHeader><CardTitle>Danh sách ngày</CardTitle><CardDescription>Nhấp để xem chi tiết</CardDescription></CardHeader>
            <CardContent>
              <div className="table-responsive" style={{maxHeight:'420px',overflowY:'auto'}}>
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light"><tr><th style={{width:'70px'}}>Ngày</th><th className="text-end">Đặt lịch</th><th className="text-end">Doanh thu đặt lịch</th><th className="text-end">Doanh thu dịch vụ</th><th className="text-end">Tổng</th></tr></thead>
                  <tbody>
                    {days.map(d=> (
                      <tr key={d.day}><td className="fw-medium">{d.day}</td><td className="text-end"><span className="badge bg-secondary">{d.bookings}</span></td><td className="text-end">{formatCurrency(d.bookingRevenue)}</td><td className="text-end">{formatCurrency(d.labRevenue)}</td><td className="text-end fw-semibold text-success">{formatCurrency(d.revenue)}</td></tr>
                    ))}
                    {days.length===0 && <tr><td colSpan={5} className="text-center text-muted small">Không có dữ liệu</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function formatCurrency(n){ try { return new Intl.NumberFormat('vi-VN',{ style:'currency', currency:'VND', maximumFractionDigits:0 }).format(Math.round(n||0)); } catch { return `${Math.round(n||0).toLocaleString('vi-VN')}₫`; } }
function computeOrderTotal(o){ if(!o) return 0; if(typeof o.tongTien==='number' && o.tongTien>0) return o.tongTien; if(Array.isArray(o.items)) return o.items.reduce((s,it)=> s + ((it.thuocId && typeof it.thuocId.gia==='number'? it.thuocId.gia:0) * (it.soLuong||0)),0); return 0; }
