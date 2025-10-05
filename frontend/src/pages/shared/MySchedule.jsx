import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchMySchedule, createWorkSchedule, updateWorkSchedule, deleteWorkSchedule, resetMyNextMonthSchedule } from '../../api/workSchedules';
import { fetchNextScheduleConfig } from '../../api/scheduleConfig';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import '../admin/schedule/schedule.css';

function formatMonth(date){ const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); return `${y}-${m}`; }
function localDateStr(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function nextMonthBase(){ const now=new Date(); return new Date(now.getFullYear(), now.getMonth()+1, 1); }

const shifts=['sang','chieu','toi'];
const shiftTypes=['lam_viec','truc','nghi'];
const shiftTypeLabel={ lam_viec:'Làm', truc:'Trực', nghi:'Nghỉ' };

// Quy tắc mục tiêu theo role (có thể tinh chỉnh sau hoặc lấy từ backend config)
const ROLE_RULES = {
  doctor: { minWorkDays: 22, maxWorkDays: 26, minNight: 1, maxNight: 4 },
  nurse: { minWorkDays: 20, maxWorkDays: 24, minNight: 4, maxNight: 8 },
  reception: { minWorkDays: 24, maxWorkDays: 26, minNight: 0, maxNight: 0 },
  lab: { minWorkDays: 24, maxWorkDays: 26, minNight: 0, maxNight: 2 },
  cashier: { minWorkDays: 24, maxWorkDays: 26, minNight: 0, maxNight: 2 },
};

export default function MySchedule(){
  const { user } = useAuth();
  const base = useMemo(()=> nextMonthBase(), []);
  const monthStr = formatMonth(base);
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(false);
  const days = useMemo(()=> { const y=base.getFullYear(); const m=base.getMonth(); const total=new Date(y,m+1,0).getDate(); return Array.from({length:total},(_,i)=> new Date(y,m,i+1)); },[base]);
  const [modal,setModal]=useState(null);
  const [windowOpen,setWindowOpen]=useState(false);
  const [config,setConfig]=useState(null);
  const [stats,setStats]=useState({ workDays:0, nightShifts:0, dayShifts:0 });

  const evaluateWindow = useCallback((cfg)=>{
    const todayStr = new Date().toISOString().slice(0,10);
    const fallback = `${todayStr.slice(0,7)}-15`;
    const openFrom = cfg?.openFrom || fallback;
    setWindowOpen(todayStr >= openFrom);
  },[]);

  const loadConfig = useCallback(async ()=>{
    try {
      const c = await fetchNextScheduleConfig();
      setConfig(c);
      evaluateWindow(c);
    } catch {
      evaluateWindow(null);
    }
  },[evaluateWindow]);

  useEffect(()=>{ loadConfig(); const id=setInterval(loadConfig,60000); return ()=> clearInterval(id); },[loadConfig]);

  useEffect(()=>{ load(); },[monthStr]);
  async function load(){ try{ setLoading(true); const data=await fetchMySchedule(monthStr); setRows(data); } catch{ toast.error('Tải lịch thất bại'); } finally{ setLoading(false);} }

  function getCell(day, shift){ const ds=localDateStr(day); return rows.find(r=> r.day===ds && r.shift===shift); }
  function cycle(current){ if(!current) return shiftTypes[0]; const idx=shiftTypes.indexOf(current); if(idx===-1) return shiftTypes[0]; if(idx===shiftTypes.length-1) return null; return shiftTypes[idx+1]; }

  // Tính thống kê mỗi khi rows thay đổi
  useEffect(()=>{
    const dayMap = new Map();
    let night=0; let dayShiftCount=0;
    for(const r of rows){
      if(r.shiftType !== 'nghi'){
        if(r.shift==='toi' && r.shiftType==='truc') night++;
        if(r.shift!=='toi') dayShiftCount++;
        dayMap.set(r.day, true);
      }
    }
    setStats({ workDays: dayMap.size, nightShifts: night, dayShifts: dayShiftCount });
  },[rows]);

  const rules = ROLE_RULES[user?.role] || { minWorkDays:0, maxWorkDays:999, minNight:0, maxNight:999 };

  function violatesAdd(type, shift){
    // Preview stats if we add this shift
    const next = { ...stats };
    const dayStr = modal?.day ? localDateStr(modal.day) : null;
    // For quick add we pass directly day+shift
    if(!modal){ /* quick mode use params */ }
    if(type === 'nghi') return false; // nghỉ không bị hạn chế
    // if new working shift on a day that currently has no working shift recorded, increment workDays
    if(dayStr && !rows.some(r=> r.day===dayStr && r.shiftType!=='nghi')) next.workDays++;
    if(shift === 'toi' && type === 'truc') next.nightShifts = next.nightShifts + 1;
    if(shift !== 'toi' && type !== 'nghi') next.dayShifts = next.dayShifts + 1;
    if(next.workDays > rules.maxWorkDays) return `Vượt quá số ngày làm tối đa (${rules.maxWorkDays})`;
    if(shift === 'toi' && type === 'truc' && next.nightShifts > rules.maxNight) return `Vượt quá số ca trực tối đa (${rules.maxNight})`;
    return null;
  }

  async function quick(day, shift, e){
    if(!windowOpen){ toast.warn('Chỉ đăng ký từ ngày 15 trở đi'); return; }
    const cell=getCell(day,shift); const next=cycle(cell?.shiftType);
    if(next===null){ if(cell){ try{ await deleteWorkSchedule(cell._id); setRows(prev=> prev.filter(r=> r._id!==cell._id)); } catch{ toast.error('Xóa thất bại'); } } return; }
    // constraint check only when adding/modifying to non-null state
    if(!cell){
      const msg = violatesAdd(next, shift);
      if(msg){ toast.warn(msg); return; }
    }
    if(cell){
      try{ await updateWorkSchedule(cell._id,{ shiftType: next }); setRows(prev=> prev.map(r=> r._id===cell._id? { ...r, shiftType: next }: r)); } catch{ toast.error('Cập nhật thất bại'); }
    } else {
      try{ const created=await createWorkSchedule({ userId: user.id||user._id, role: user.role, day: localDateStr(day), shift, shiftType: next }); setRows(prev=> [...prev, created]); } catch{ toast.error('Tạo thất bại'); }
    }
  }

  function handleClick(day, shift, e){ if(e && (e.ctrlKey||e.metaKey||e.altKey)) return quick(day,shift,e); if(!windowOpen){ toast.warn('Chỉ đăng ký từ ngày 15 trở đi'); return; } const cell=getCell(day,shift); setModal({ day, shift, existing: cell }); }

  async function save(type){
    if(!modal) return; if(!windowOpen){ toast.warn('Chỉ đăng ký từ ngày 15 trở đi'); return; }
    const { day, shift, existing } = modal;
    if(!existing && type !== 'nghi'){
      const msg = violatesAdd(type, shift);
      if(msg){ toast.warn(msg); return; }
    }
    try {
      if(existing){
        await updateWorkSchedule(existing._id,{ shiftType: type });
        setRows(prev=> prev.map(r=> r._id===existing._id? { ...r, shiftType: type }: r));
      } else {
        const created=await createWorkSchedule({ userId: user.id||user._id, role: user.role, day: localDateStr(day), shift, shiftType: type });
        setRows(prev=> [...prev, created]);
      }
      setModal(null);
    } catch { toast.error('Lưu thất bại'); }
  }
  async function clearCell(){ if(!modal) return; if(!windowOpen){ toast.warn('Chỉ đăng ký từ ngày 15 trở đi'); return; } const { existing } = modal; if(existing){ try{ await deleteWorkSchedule(existing._id); setRows(prev=> prev.filter(r=> r._id!==existing._id)); } catch{ toast.error('Xóa thất bại'); } } setModal(null); }

  function badge(cell){ if(!cell) return <span className="placeholder">.</span>; return <span className="badge bg-transparent text-dark">{shiftTypeLabel[cell.shiftType]||cell.shiftType}</span>; }

  return (
    <div>
      <h2 className="mb-1">Lịch cá nhân tháng kế tiếp ({monthStr})</h2>
  <div className="text-muted small mb-3">Click để chọn; Ctrl/Alt + Click chuyển nhanh. Chỉ đăng ký được tháng kế tiếp. Mở theo cấu hình admin (openFrom = {config?.openFrom || (new Date().toISOString().slice(0,7)+'-15')}). Trạng thái: {windowOpen? 'MỞ':'ĐANG KHÓA'}.</div>
      <div className="mb-2 d-flex gap-2 flex-wrap">
        <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>Tải lại</button>
        <button className="btn btn-sm btn-outline-danger" onClick={async()=>{
          if(!windowOpen){ toast.warn('Chưa mở đăng ký'); return; }
          if(!window.confirm('Xóa toàn bộ lịch tháng kế tiếp của bạn?')) return;
          try { await resetMyNextMonthSchedule(); toast.success('Đã xóa'); load(); } catch { toast.error('Xóa thất bại'); }
        }}>Xóa toàn bộ tháng</button>
      </div>
      <div className="card mb-3 small">
        <div className="card-body py-2">
          <strong>Hướng dẫn & Ràng buộc:</strong>
          <ul className="mb-1 mt-2">
            <li>Chỉ đăng ký THÁNG KẾ TIẾP sau ngày mở: <code>{config?.openFrom || '(chưa cấu hình)'}</code>.</li>
            <li>Ngày làm tính khi có ít nhất 1 ca làm/trực (không tính ca nghỉ).</li>
            <li>Không vượt quá: <strong>{rules.maxWorkDays}</strong> ngày làm & <strong>{rules.maxNight}</strong> ca trực.</li>
            <li>Tối thiểu cần: {rules.minWorkDays} ngày làm & {rules.minNight} ca trực (mục tiêu khuyến nghị).</li>
            <li>Ca tối với loại "Trực" tính vào tổng ca trực.</li>
          </ul>
          <div className="d-flex flex-wrap gap-3 mt-2">
            <span>Ngày làm hiện tại: <strong className={stats.workDays < rules.minWorkDays? 'text-warning': stats.workDays > rules.maxWorkDays? 'text-danger':'text-success'}>{stats.workDays}</strong></span>
            <span>Ca trực: <strong className={stats.nightShifts < rules.minNight? 'text-warning': stats.nightShifts > rules.maxNight? 'text-danger':'text-success'}>{stats.nightShifts}</strong></span>
            <span>Ca ban ngày: <strong>{stats.dayShifts}</strong></span>
          </div>
        </div>
      </div>
      <div className="table-responsive" style={{ maxHeight: '70vh' }}>
        <table className="table table-sm table-bordered align-middle schedule-table">
          <thead className="table-light"><tr><th style={{minWidth:80}}>Ca/Ngày</th>{days.map(d=> <th key={localDateStr(d)} style={{minWidth:42}} className="text-center">{d.getDate()}</th>)}</tr></thead>
          <tbody>
            {shifts.map(sh=> <tr key={sh}> <td style={{position:'sticky',left:0,background:'#fff'}} className="fw-semibold">{sh}</td> {days.map(d=> { const cell=getCell(d,sh); const bg= cell? 'cell-'+cell.shiftType : 'empty'; return <td key={sh+localDateStr(d)} className={`cell ${bg}`} onClick={(e)=> handleClick(d,sh,e)}>{badge(cell)}</td>; })} </tr>)}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="modal d-block" tabIndex="-1" onClick={()=> setModal(null)}>
          <div className="modal-dialog" onClick={e=> e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Ca {modal.shift} ngày {modal.day.getDate()}</h5><button className="btn-close" onClick={()=> setModal(null)}></button></div>
              <div className="modal-body">
                {shiftTypes.map(t=> <button key={t} className="btn btn-outline-primary me-2 mb-2" onClick={()=> save(t)}>{shiftTypeLabel[t]}</button>)}
                <button className="btn btn-outline-danger ms-2 mb-2" onClick={clearCell}>Xóa</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {loading && <div className="text-muted small mt-2">Đang tải...</div>}
    </div>
  );
}
