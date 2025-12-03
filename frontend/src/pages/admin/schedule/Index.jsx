import React, { useEffect, useMemo, useState } from 'react';
import './schedule.css';
import { fetchWorkSchedules, createWorkSchedule, updateWorkSchedule, deleteWorkSchedule, bulkUpsertWorkSchedules, fetchWorkScheduleStats } from '../../../api/workSchedules';
import { fetchUsers } from '../../../api/users';
import { toast } from 'react-toastify';
import { fetchNextScheduleConfig, updateNextScheduleConfig } from '../../../api/scheduleConfig';
import { useAuth } from '../../../context/AuthContext';
import { autoGenerateSchedules } from '../../../api/autoSchedule';

const roles = ['doctor','reception','lab','cashier','nurse','pharmacy'];
const shifts = ['sang','chieu','toi'];
const shiftTypeOptions = [
  { value: 'lam_viec', label: 'Làm' },
  { value: 'truc', label: 'Trực' },
  { value: 'nghi', label: 'Nghỉ' },
];
const shiftTypeLabelMap = { lam_viec: 'Làm', truc: 'Trực', nghi: 'Nghỉ' };

function formatMonth(date){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  return `${y}-${m}`;
}

function daysInMonth(date){
  const y = date.getFullYear();
  const m = date.getMonth();
  const days = new Date(y, m+1, 0).getDate();
  return Array.from({ length: days }, (_,i)=> new Date(y,m,i+1));
}

// Format date object to local YYYY-MM-DD (no timezone shift like toISOString)
function localDateStr(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function getNextMonthBase(){
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth()+1, 1);
}
function getCurrentMonthBase(){
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
const NEXT_MONTH_BASE = getNextMonthBase();
const NEXT_MONTH_STR = formatMonth(NEXT_MONTH_BASE);
const CURRENT_MONTH_BASE = getCurrentMonthBase();
const CURRENT_MONTH_STR = formatMonth(CURRENT_MONTH_BASE);

export default function AdminWorkSchedulesPage(){
  const { user } = useAuth();
  const [monthDate, setMonthDate] = useState(()=> NEXT_MONTH_BASE);
  const [monthStr, setMonthStr] = useState(NEXT_MONTH_STR);
  const [monthChoice, setMonthChoice] = useState('next'); // 'current' | 'next'
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]); // raw schedule rows
  const [selectedRole, setSelectedRole] = useState('doctor');
  const [users, setUsers] = useState([]); // filtered by role
  const [editingCell, setEditingCell] = useState(null); // { userId, day, shift }
  const [stats, setStats] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedUser, setBulkSelectedUser] = useState('');
  const [bulkShiftType, setBulkShiftType] = useState('lam_viec');
  // bulk shifts multi-select
  const [bulkShifts, setBulkShifts] = useState(['sang']);
  const [bulkDays, setBulkDays] = useState({}); // map day->bool
  const [windowOpen, setWindowOpen] = useState(false);
  const [config, setConfig] = useState(null); // { month, openFrom, note }
  const [configLoading, setConfigLoading] = useState(false);
  const [newOpenFrom, setNewOpenFrom] = useState('');
  // Auto-generate state
  const [autoRoles, setAutoRoles] = useState(['doctor']);
  const [autoDryRunResult, setAutoDryRunResult] = useState(null); // { month, generated, summaries }
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoReplaceExisting, setAutoReplaceExisting] = useState(false);

  function toggleAutoRole(r){
    setAutoRoles(prev=> prev.includes(r) ? prev.filter(x=> x!==r) : [...prev, r]);
  }
  async function runAutoGenerate(dryRun){
    try{
      setAutoLoading(true);
      const res = await autoGenerateSchedules({ dryRun, replaceExisting: autoReplaceExisting, roles: autoRoles });
      if(dryRun){ setAutoDryRunResult(res); toast.success('Dry run thành công'); }
      else { setAutoDryRunResult(res); toast.success('Đã áp dụng lịch tự động'); await load(); }
    }catch(err){ toast.error(err?.response?.data?.message || 'Auto-generate lỗi'); }
    finally{ setAutoLoading(false); }
  }

  async function loadConfig(){
    try {
      setConfigLoading(true);
      const cfg = await fetchNextScheduleConfig();
      setConfig(cfg);
      setNewOpenFrom(cfg.openFrom);
      const todayStr = new Date().toISOString().slice(0,10);
      setWindowOpen(user?.role === 'admin' ? true : (todayStr >= cfg.openFrom));
    } catch { /* ignore */ } finally { setConfigLoading(false); }
  }
  useEffect(()=>{ loadConfig(); }, []);

  // realtime poll every minute to auto-open when reach openFrom
  useEffect(()=>{
    const id = setInterval(()=>{
      if(!config) return;
      if(user?.role === 'admin'){ setWindowOpen(true); return; }
      const todayStr = new Date().toISOString().slice(0,10);
      setWindowOpen(todayStr >= config.openFrom);
    }, 60000);
    return ()=> clearInterval(id);
  },[config, user]);

  // derive days array
  const days = useMemo(()=> daysInMonth(monthDate), [monthDate]);

  useEffect(()=>{
    setMonthStr(formatMonth(monthDate));
  },[monthDate]);

  useEffect(()=>{
    if(monthChoice === 'current'){
      setMonthDate(CURRENT_MONTH_BASE);
    } else {
      setMonthDate(NEXT_MONTH_BASE);
    }
  }, [monthChoice]);

  useEffect(()=>{ load(); }, [monthStr, selectedRole]);
  useEffect(()=>{ loadStats(); }, [monthStr, selectedRole]);

  async function load(){
    try{
      setLoading(true);
      const [schedules, userList] = await Promise.all([
        fetchWorkSchedules({ month: monthStr, role: selectedRole }),
        fetchUsers({ role: selectedRole }).catch(()=>[])
      ]);
      setData(schedules);
      if(userList.length){
        setUsers(userList.map(u=>({ _id: u._id, name: u.name || u.email || u._id.slice(-6), role: u.role })));
      } else {
        // fallback derive from schedules
        const uniqueUsers = {};
        for(const s of schedules){ uniqueUsers[s.userId] = s.role; }
        setUsers(Object.keys(uniqueUsers).map(id=>({ _id:id, name: id.slice(-6), role: selectedRole })));
      }
    }catch(err){ console.error(err); toast.error('Tải lịch thất bại'); }
    finally{ setLoading(false); }
  }

  async function loadStats(){
    try{ const s = await fetchWorkScheduleStats(monthStr, selectedRole); setStats(s); }catch{}
  }

  function getCell(userId, dayDate, shift){
  const dayStr = localDateStr(dayDate);
  return data.find(d=> d.userId === userId && d.shift === shift && (d.day?.startsWith?.(dayStr) || d.day === dayStr));
  }

  function cycleShiftType(current){
    const order = ['lam_viec','truc','nghi'];
    if(!current) return 'lam_viec';
    const idx = order.indexOf(current);
    if(idx === -1) return 'lam_viec';
    if(idx === order.length -1) return null; // clear
    return order[idx+1];
  }

  function isPastOrCurrentMonth(){
    const curY = CURRENT_MONTH_BASE.getFullYear();
    const curM = CURRENT_MONTH_BASE.getMonth();
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    return y < curY || (y === curY && m <= curM);
  }
  function isCurrentMonth(){
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    return y === CURRENT_MONTH_BASE.getFullYear() && m === CURRENT_MONTH_BASE.getMonth();
  }

  async function handleCellClick(userId, dayDate, shift, event){
  if(!user) return;
  // Current month: only admin can edit
  if(isCurrentMonth() && user.role !== 'admin'){ toast.warn('Chỉ admin được chỉnh tháng hiện tại'); return; }
  // Future months: require window open for non-admin
  if(user.role !== 'admin' && !isPastOrCurrentMonth() && !windowOpen){ toast.warn('Chưa mở đăng ký'); return; }
    const cell = getCell(userId, dayDate, shift);
    if(event && (event.ctrlKey || event.metaKey || event.altKey)){
      // quick cycle
      const nextType = cycleShiftType(cell?.shiftType);
      if(nextType === null){
        if(cell){
          try{ await deleteWorkSchedule(cell._id); setData(prev=> prev.filter(r=> r._id !== cell._id)); }catch{ toast.error('Xóa thất bại'); }
        }
        return;
      }
      if(cell){
        try{ await updateWorkSchedule(cell._id, { shiftType: nextType }); setData(prev=> prev.map(r=> r._id === cell._id ? { ...r, shiftType: nextType } : r)); }catch{ toast.error('Cập nhật thất bại'); }
      } else {
  try{ const created = await createWorkSchedule({ userId, role: selectedRole, day: localDateStr(dayDate), shift, shiftType: nextType }); setData(prev=> [...prev, created]); }catch{ toast.error('Tạo thất bại'); }
      }
      return;
    }
    setEditingCell({ userId, day: dayDate, shift, existing: cell });
  }

  async function saveCell(shiftType){
  if(!user) return;
  if(isCurrentMonth() && user.role !== 'admin'){ toast.warn('Chỉ admin được chỉnh tháng hiện tại'); return; }
  if(user.role !== 'admin' && !isPastOrCurrentMonth() && !windowOpen){ toast.warn('Chưa mở đăng ký'); return; }
    const { userId, day, shift, existing } = editingCell;
  const payloadBase = { userId, role: selectedRole, day: localDateStr(day), shift, shiftType };
    try {
      if(existing){
        await updateWorkSchedule(existing._id, { shiftType });
        setData(prev => prev.map(r => r._id === existing._id ? { ...r, shiftType } : r));
      } else {
        const created = await createWorkSchedule(payloadBase);
        setData(prev => [...prev, created]);
      }
    } catch(err){ toast.error('Lưu thất bại'); }
    finally { setEditingCell(null); }
  }

  async function clearCell(){
  if(!user) return;
  if(isCurrentMonth() && user.role !== 'admin'){ toast.warn('Chỉ admin được chỉnh tháng hiện tại'); return; }
  if(user.role !== 'admin' && !isPastOrCurrentMonth() && !windowOpen){ toast.warn('Chưa mở đăng ký'); return; }
    const { existing } = editingCell || {};
    if(existing){
      try{ await deleteWorkSchedule(existing._id); setData(prev=> prev.filter(r=> r._id !== existing._id)); }
      catch{ toast.error('Xóa thất bại'); }
    }
    setEditingCell(null);
  }

  function shiftBadge(cell){
    if(!cell) return <span className="placeholder">.</span>;
    return <span className="badge bg-transparent text-dark">{shiftTypeLabelMap[cell.shiftType] || cell.shiftType}</span>;
  }

  function changeMonth(choice){
    setMonthChoice(choice);
  }

  async function applyBulk(){
  if(!user) return;
  if(isCurrentMonth() && user.role !== 'admin'){ toast.warn('Chỉ admin được chỉnh tháng hiện tại'); return; }
  if(user.role !== 'admin' && !isPastOrCurrentMonth() && !windowOpen){ toast.warn('Chưa mở đăng ký'); return; }
    if(!bulkSelectedUser) return toast.error('Chọn user');
    if(!bulkShifts.length) return toast.error('Chọn ít nhất 1 ca');
  const dayList = Object.entries(bulkDays).filter(([k,v])=>v).map(([dayStr])=> dayStr);
    if(!dayList.length) return toast.error('Chọn ngày');
    const items = [];
    for(const dayStr of dayList){
      for(const shift of bulkShifts){
        items.push({ userId: bulkSelectedUser, role: selectedRole, day: dayStr, shift, shiftType: bulkShiftType });
      }
    }
    try {
      await bulkUpsertWorkSchedules(items);
      toast.success('Bulk OK');
      await load();
      setBulkDays({});
      setBulkShifts(['sang']);
    } catch { toast.error('Bulk fail'); }
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h4 className="mb-0">Lịch làm việc <span className="text-muted">({selectedRole})</span></h4>
        <div className="text-muted small">
          Tháng: <strong>{monthStr}</strong>
          {configLoading && <span className="ms-2">Đang tải cấu hình...</span>}
          {!configLoading && config && (
            <>
              <span className="ms-3">Ngày mở: <strong>{config.openFrom}</strong></span>
              <span className="ms-3">Trạng thái: <span className={`badge ${windowOpen? 'text-bg-success':'text-bg-secondary'}`}>{windowOpen? 'MỞ':'KHÓA'}</span></span>
              {user?.role === 'admin' && (
                <span className="ms-2 text-primary">(Admin luôn có quyền chỉnh)</span>
              )}
            </>
          )}
        </div>
      </div>

      {user?.role === 'admin' && config && (
        <div className="card mb-3">
          <div className="card-body small d-flex flex-wrap align-items-end gap-3">
            <div>
              <label className="form-label mb-1">Ngày mở đăng ký</label>
              <input type="date" className="form-control form-control-sm" value={newOpenFrom} onChange={e=> setNewOpenFrom(e.target.value)} />
            </div>
            <button className="btn btn-sm btn-primary" disabled={!newOpenFrom || newOpenFrom===config.openFrom} onClick={async()=>{
              try { const updated = await updateNextScheduleConfig({ openFrom: newOpenFrom }); setConfig(updated); toast.success('Đã cập nhật'); loadConfig(); } catch(err){ toast.error(err?.response?.data?.message || 'Lỗi cập nhật'); }
            }}>Lưu ngày mở</button>
          </div>
        </div>
      )}

      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="d-flex flex-wrap align-items-center gap-3 small">
            <div className="d-flex align-items-center gap-1"><span className="badge text-bg-primary">&nbsp;</span> <span>Làm</span></div>
            <div className="d-flex align-items-center gap-1"><span className="badge text-bg-warning">&nbsp;</span> <span>Trực</span></div>
            <div className="d-flex align-items-center gap-1"><span className="badge text-bg-secondary">&nbsp;</span> <span>Nghỉ</span></div>
            <div className="text-muted">Click ô để chỉnh • Ctrl+Click chuyển nhanh</div>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap gap-3 align-items-end">
          <div>
            <label className="form-label mb-0">Role</label>
            <select className="form-select" value={selectedRole} onChange={e=> setSelectedRole(e.target.value)}>
              {roles.map(r=> <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label mb-0">Tháng</label>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={()=> setMonthDate(d=> new Date(d.getFullYear(), d.getMonth()-1, 1))}>&lt;</button>
              <input type="month" className="form-control" value={monthStr} onChange={e=> {
                const [yy, mm] = e.target.value.split('-');
                setMonthDate(new Date(Number(yy), Number(mm)-1, 1));
              }} />
              <button className="btn btn-outline-secondary btn-sm" onClick={()=> setMonthDate(d=> new Date(d.getFullYear(), d.getMonth()+1, 1))}>&gt;</button>
              <div className="btn-group" role="group">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=> setMonthDate(CURRENT_MONTH_BASE)}>Hiện tại</button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=> setMonthDate(NEXT_MONTH_BASE)}>Tháng sau</button>
              </div>
            </div>
          </div>
          <div className="ms-auto d-flex gap-2">
            <button className="btn btn-primary" onClick={load} disabled={loading}>{loading ? 'Đang tải...' : 'Tải lại'}</button>
            <button className="btn btn-outline-secondary" onClick={()=>setBulkMode(b=>!b)}>{bulkMode ? 'Đóng Bulk' : 'Bulk chỉnh'}</button>
          </div>
        </div>
      </div>

      {bulkMode && (
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="mb-3">Bulk gán ca</h5>
            <div className="row g-2">
              <div className="col-md-3">
                <label className="form-label">User</label>
                <select className="form-select" value={bulkSelectedUser} onChange={e=> setBulkSelectedUser(e.target.value)}>
                  <option value="">--Chọn--</option>
                  {users.map(u=> <option key={u._id} value={u._id}>{u.name || u._id.slice(-6)}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Ca</label>
                <div className="d-flex flex-column gap-1">
                  {shifts.map(s=> (
                    <label key={s} className="form-check-inline small">
                      <input type="checkbox" className="form-check-input me-1" checked={bulkShifts.includes(s)} onChange={()=> setBulkShifts(prev=> prev.includes(s)? prev.filter(x=> x!==s): [...prev,s])} /> {s}
                    </label>
                  ))}
                  <div className="d-flex gap-1 mt-1 flex-wrap">
                    <button type="button" className="btn btn-xs btn-outline-secondary btn-sm" onClick={()=> setBulkShifts(shifts)}>All</button>
                    <button type="button" className="btn btn-xs btn-outline-secondary btn-sm" onClick={()=> setBulkShifts(['sang','chieu'])}>S+C</button>
                    <button type="button" className="btn btn-xs btn-outline-secondary btn-sm" onClick={()=> setBulkShifts(['toi'])}>Tối</button>
                    <button type="button" className="btn btn-xs btn-outline-secondary btn-sm" onClick={()=> setBulkShifts([])}>None</button>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label">Loại</label>
                <select className="form-select" value={bulkShiftType} onChange={e=> setBulkShiftType(e.target.value)}>
                  {shiftTypeOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label d-flex justify-content-between align-items-center">
                  <span>Chọn ngày</span>
                  <span className="badge text-bg-info">{Object.values(bulkDays).filter(Boolean).length}</span>
                </label>
                <div className="mb-2 d-flex flex-wrap gap-1">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=> {
                    const map={}; days.forEach(d=> map[localDateStr(d)] = true); setBulkDays(map);
                  }}>Tất cả</button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=> {
                    const map={}; days.forEach(d=> { if(![0,6].includes(d.getDay())) map[localDateStr(d)] = true;}); setBulkDays(map);
                  }}>Ngày làm</button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=> {
                    const map={}; days.forEach(d=> { if([0,6].includes(d.getDay())) map[localDateStr(d)] = true;}); setBulkDays(map);
                  }}>Cuối tuần</button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=> setBulkDays({})}>Xóa</button>
                </div>
                <div className="d-flex flex-wrap gap-1">
                  {days.map(d=>{ const ds = localDateStr(d); const active = !!bulkDays[ds]; const weekend = [0,6].includes(d.getDay()); return (
                    <button type="button" key={ds} className={`btn btn-sm ${active? (weekend? 'btn-danger':'btn-success'):'btn-outline-secondary'}`} title={ds} onClick={()=> setBulkDays(prev=> ({ ...prev, [ds]: !prev[ds] }))}>{d.getDate()}</button>
                  ); })}
                </div>
              </div>
            </div>
            <div className="mt-3 d-flex gap-2">
              <button className="btn btn-primary" onClick={applyBulk}>Áp dụng</button>
              <button className="btn btn-outline-secondary" onClick={()=> setBulkDays({})}>Reset ngày</button>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'admin' && (
        <div className="card mb-3">
          <div className="card-body small">
            <h5 className="mb-2">Tự động sinh lịch tháng kế tiếp</h5>
            <div className="mb-2">Chọn role để sinh:</div>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {roles.map(r=> (
                <label key={r} className="form-check me-3">
                  <input type="checkbox" className="form-check-input me-1" checked={autoRoles.includes(r)} onChange={()=> toggleAutoRole(r)} /> {r}
                </label>
              ))}
            </div>
            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="replaceExistingSwitch" checked={autoReplaceExisting} onChange={()=> setAutoReplaceExisting(v=> !v)} />
              <label className="form-check-label" htmlFor="replaceExistingSwitch">Xóa lịch cũ tháng kế tiếp trước khi áp dụng (replaceExisting)</label>
            </div>
            <div className="d-flex gap-2 mb-3 flex-wrap">
              <button disabled={autoLoading || !autoRoles.length} className="btn btn-outline-primary btn-sm" onClick={()=> runAutoGenerate(true)}>
                {autoLoading ? 'Đang chạy...' : 'Dry Run'}
              </button>
              <button disabled={autoLoading || !autoRoles.length || !autoDryRunResult} className="btn btn-primary btn-sm" onClick={()=> runAutoGenerate(false)}>
                {autoLoading ? 'Đang áp dụng...' : 'Áp dụng'}
              </button>
              {!autoDryRunResult && <span className="text-muted align-self-center">(Chạy Dry Run trước để xem kết quả)</span>}
            </div>
            {autoDryRunResult && (
              <div>
                <h6>Kết quả: tháng {autoDryRunResult.month}</h6>
                <p className="mb-1">Tổng bản ghi sinh ra: {autoDryRunResult.generated}</p>
                <p className="mb-2">{autoDryRunResult.dryRun ? 'Chưa áp dụng (dryRun)':'ĐÃ ghi vào DB'}</p>
                <div className="table-responsive" style={{maxHeight:300}}>
                  <table className="table table-sm table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Tổng ca</th>
                        <th>Ca tối/Trực</th>
                        <th>Ngày làm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {autoDryRunResult.summaries?.map(s=> (
                        <tr key={s.userId + s.role}>
                          <td>{s.userId?.slice?.(-6) || s.userId}</td>
                          <td>{s.role}</td>
                          <td>{s.totalShifts}</td>
                          <td>{s.nightShifts}</td>
                          <td>{s.daysWorked}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive" style={{ maxHeight: '70vh' }}>
            <table className="table table-sm table-bordered align-middle schedule-table mb-0">
              <thead className="table-light">
                <tr>
                  <th className="user-sticky user-col">User</th>
                  {days.map(d=> <th key={localDateStr(d)} className="text-center" style={{ minWidth: 42 }}>{d.getDate()}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.map(u=> shifts.map((shift,idx)=> (
                  <tr key={u._id + shift} className={idx===0? 'border-top border-dark':''}>
                    {idx===0 && (
                      <td rowSpan={shifts.length} className="user-sticky">
                        <div className="fw-semibold">{u.name || u._id.slice(-6)}</div>
                        <div className="text-muted small">{u.role}</div>
                      </td>
                    )}
                    {days.map(d=>{
                      const cell = getCell(u._id, d, shift);
                      let bgClass = 'empty';
                      if(cell){ bgClass = 'cell-' + cell.shiftType; }
                      return (
                        <td key={u._id + localDateStr(d) + shift} className={`cell ${bgClass}`} onClick={(e)=> handleCellClick(u._id, d, shift, e)}>
                          {shiftBadge(cell)}
                        </td>
                      );
                    })}
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="card">
          <div className="card-body">
            <h6 className="mb-2">Thống kê trong tháng</h6>
            <ul className="mb-0">
              {stats.map(s=> <li key={s._id.role + s._id.shiftType}>{s._id.role}: {s._id.shiftType} = {s.count}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {editingCell && (
        <div className="modal d-block" tabIndex="-1" role="dialog" onClick={()=> setEditingCell(null)}>
          <div className="modal-dialog" onClick={e=> e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chỉnh ca {editingCell.shift} ngày {editingCell.day.getDate()}</h5>
                <button type="button" className="btn-close" onClick={()=> setEditingCell(null)}></button>
              </div>
              <div className="modal-body">
                <div className="d-flex flex-wrap gap-2">
                  {shiftTypeOptions.map(opt=> (
                    <button key={opt.value} className="btn btn-outline-primary" onClick={()=> saveCell(opt.value)}>{opt.label}</button>
                  ))}
                  <button className="btn btn-outline-danger" onClick={clearCell}>Xóa ca</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
