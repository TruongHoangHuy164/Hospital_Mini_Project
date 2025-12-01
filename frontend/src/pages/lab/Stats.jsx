"use client";
import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { getPharmacyOrders } from '../../api/pharmacy';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function Card({ className='', children }) { return <div className={"rounded-3 border bg-white shadow-sm "+className}>{children}</div>; }
function CardHeader({ className='', children }) { return <div className={"p-3 pb-2 "+className}>{children}</div>; }
function CardContent({ className='', children }) { return <div className={"p-3 pt-0 "+className}>{children}</div>; }
function CardTitle({ className='', children }) { return <h2 className={"h6 m-0 "+className}>{children}</h2>; }
function CardDescription({ className='', children }) { return <p className={"small text-muted mt-1 "+className}>{children}</p>; }

export default function LabRevenueStats(){
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
        const daysInMonth = new Date(year, month, 0).getDate();
        const uiStatuses = ['PAID','PREPARING','COMPLETED'];
        const merged = await Promise.all(Array.from({length:daysInMonth}, (_,i)=>{
          const d=i+1; const dayStr=`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          return Promise.all(uiStatuses.map(st => getPharmacyOrders({ status: st, day: dayStr }).catch(()=>({data:[]}))))
            .then(results=>{
              const orders = results.flatMap(r=> r?.data||[]);
              const sum = orders.reduce((s,o)=> s + computeOrderTotal(o),0);
              return { day:d, revenue: sum, orders: orders.length };
            });
        }));
        const monthTotal = merged.reduce((s,x)=> s+x.revenue,0);
        if(!cancelled){ setDays(merged); setTotal(monthTotal); }
      }catch(e){
        if(cancelled) return;
        const status = e?.response?.status;
        if(status === 403){
          setError('Bạn không đủ quyền truy cập thống kê doanh thu lab. Vui lòng đăng nhập tài khoản có quyền hoặc liên hệ quản trị.');
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

  const chartData = useMemo(()=> ({ labels: days.map(d=>`Ngày ${d.day}`), datasets:[ { label:'Doanh thu (VND)', data: days.map(d=> d.revenue), backgroundColor:'rgba(255,193,7,0.5)', borderRadius:6, maxBarThickness:32 }, { label:'Số đơn', data: days.map(d=> d.orders), backgroundColor:'rgba(13,202,240,0.5)', borderRadius:6, maxBarThickness:28, yAxisID:'y1' } ] }),[days]);
  const barOptions = { responsive:true, interaction:{mode:'index',intersect:false}, stacked:false, plugins:{ legend:{position:'bottom'} }, scales:{ y:{ title:{display:true,text:'Doanh thu'} }, y1:{ position:'right', grid:{ drawOnChartArea:false }, title:{ display:true,text:'Số đơn' } } } };
  const monthName = useMemo(()=> ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'][month-1], [month]);

  return (
    <div className="py-3 px-3 bg-white">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <div>
          <h1 className="h4 m-0"><i className="bi bi-graph-up text-warning me-2"></i>Thống kê doanh thu Cận lâm sàng</h1>
          <div className="small text-muted">Thu tiền các chỉ định đã thực hiện</div>
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
        <div className="text-center py-4"><div className="spinner-border text-warning" role="status"></div></div>
      ) : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4"><Card><CardHeader><CardTitle>{monthName}</CardTitle><CardDescription>Doanh thu tháng</CardDescription></CardHeader><CardContent><div className="h4 m-0 fw-bold text-warning">{formatCurrency(total)}</div></CardContent></Card></div>
            <div className="col-12 col-md-8"><Card><CardHeader><CardTitle>Doanh thu & số đơn theo ngày</CardTitle><CardDescription>Tháng {month} năm {year}</CardDescription></CardHeader><CardContent>{days.length? <Bar data={chartData} options={barOptions} /> : <div className="small text-muted">Không có dữ liệu</div>}</CardContent></Card></div>
          </div>
          <Card>
            <CardHeader><CardTitle>Danh sách ngày</CardTitle><CardDescription>Đơn đã thu tiền</CardDescription></CardHeader>
            <CardContent>
              <div className="table-responsive" style={{maxHeight:'420px',overflowY:'auto'}}>
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light"><tr><th style={{width:'70px'}}>Ngày</th><th className="text-end">Số đơn</th><th className="text-end">Doanh thu</th></tr></thead>
                  <tbody>
                    {days.map(d=> (<tr key={d.day}><td className="fw-medium">{d.day}</td><td className="text-end"><span className="badge bg-secondary">{d.orders}</span></td><td className="text-end fw-semibold text-warning">{formatCurrency(d.revenue)}</td></tr>))}
                    {days.length===0 && <tr><td colSpan={3} className="text-center text-muted small">Không có dữ liệu</td></tr>}
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
