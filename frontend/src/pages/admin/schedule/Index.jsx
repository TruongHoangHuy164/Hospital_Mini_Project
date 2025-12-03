import React, { useEffect, useMemo, useState } from 'react';
import './schedule.css';
import { fetchWorkSchedules, createWorkSchedule, updateWorkSchedule, deleteWorkSchedule, bulkUpsertWorkSchedules, fetchWorkScheduleStats } from '../../../api/workSchedules';
import { fetchUsers } from '../../../api/users';
import { toast } from 'react-toastify';
import { fetchNextScheduleConfig, updateNextScheduleConfig } from '../../../api/scheduleConfig';
import { useAuth } from '../../../context/AuthContext';
import { autoGenerateSchedules } from '../../../api/autoSchedule';

// Material Design Icons as SVG components
const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);

const PersonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
  </svg>
);

const FlashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const DateIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
  </svg>
);

const PaletteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </svg>
);

const LightbulbIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
  </svg>
);

const RobotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-.5-4c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
  </svg>
);

const VisibilityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
  </svg>
);

const TableIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 10.02h5V21h-5zM17 21h3c1.1 0 2-.9 2-2v-9h-5v11zm3-18H5c-1.1 0-2 .9-2 2v3h19V5c0-1.1-.9-2-2-2zM3 19c0 1.1.9 2 2 2h3V10.02H3V19z"/>
  </svg>
);

const EditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>
);

const WorkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
  </svg>
);

const NightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.1 12.08c-2.33-4.51-.5-8.48.53-10.07C6.27 2.2 1.98 6.59 1.98 12c0 .14.02.28.02.42.62-.27 1.29-.42 2-.42 1.66 0 3.18.83 4.1 2.15 1.67.05 3.23.69 4.47 1.71.47-.32.97-.58 1.53-.78z"/>
  </svg>
);

const BeachIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.127 14.56l1.43-1.43 6.44 6.443L19.57 21zm4.293-5.73l2.86-2.86c-3.95-3.95-10.35-3.96-14.3-.02 3.93-1.3 8.31-.25 11.44 2.88zM5.95 5.98c-3.94 3.95-3.93 10.35.02 14.3l2.86-2.86C5.7 14.29 4.65 9.91 5.95 5.98zm.02-.02l-.01.01c-.38 3.01 1.17 6.88 4.3 10.02l5.73-5.73c-3.13-3.13-7.01-4.68-10.02-4.3z"/>
  </svg>
);

const DeleteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
  </svg>
);

const TimeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
  </svg>
);

const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
  </svg>
);

const LoopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
  </svg>
);

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
    <div className="schedule-page-container">
      {/* Header Section */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <h2 className="page-title">
              <CalendarIcon />
              Quản Lý Lịch Làm Việc
            </h2>
            <div className="role-badge-group">
              <span className="current-role-badge">{selectedRole}</span>
              <span className="month-badge">{monthStr}</span>
            </div>
          </div>
          <div className="header-right">
            {configLoading && (
              <div className="config-loading">
                <span className="spinner-border spinner-border-sm me-2"></span>
                Đang tải cấu hình...
              </div>
            )}
            {!configLoading && config && (
              <div className="status-info">
                <div className="info-item">
                  <span className="info-label">Ngày mở đăng ký</span>
                  <span className="info-value">{config.openFrom}</span>
                </div>
                <div className="status-badge-wrapper">
                  <span className={`status-badge ${windowOpen ? 'status-open' : 'status-closed'}`}>
                    <span className="status-dot"></span>
                    {windowOpen ? 'Đang Mở' : 'Đã Khóa'}
                  </span>
                </div>
                {user?.role === 'admin' && (
                  <div className="admin-notice">
                    <LockIcon />
                    Admin có toàn quyền chỉnh sửa
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {user?.role === 'admin' && config && (
        <div className="admin-config-card">
          <div className="config-card-header">
            <SettingsIcon />
            <h5 className="config-title">Cấu Hình Đăng Ký</h5>
          </div>
          <div className="config-card-body">
            <div className="config-form">
              <div className="form-group-modern">
                <label className="modern-label">
                  <DateIcon />
                  Ngày mở đăng ký
                </label>
                <input 
                  type="date" 
                  className="modern-input" 
                  value={newOpenFrom} 
                  onChange={e=> setNewOpenFrom(e.target.value)} 
                />
              </div>
              <button 
                className="btn-modern btn-primary-modern" 
                disabled={!newOpenFrom || newOpenFrom===config.openFrom} 
                onClick={async()=>{
                  try { 
                    const updated = await updateNextScheduleConfig({ openFrom: newOpenFrom }); 
                    setConfig(updated); 
                    toast.success('✓ Cập nhật thành công'); 
                    loadConfig(); 
                  } catch(err){ 
                    toast.error(err?.response?.data?.message || '✗ Lỗi cập nhật'); 
                  }
                }}
              >
                <SaveIcon />
                Lưu Cấu Hình
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="legend-card">
        <div className="legend-header">
          <PaletteIcon />
          <span className="legend-title">Chú Thích</span>
        </div>
        <div className="legend-content">
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-color color-lam"></span>
              <span className="legend-text">Làm việc</span>
            </div>
            <div className="legend-item">
              <span className="legend-color color-truc"></span>
              <span className="legend-text">Trực</span>
            </div>
            <div className="legend-item">
              <span className="legend-color color-nghi"></span>
              <span className="legend-text">Nghỉ</span>
            </div>
          </div>
          <div className="legend-tips">
            <LightbulbIcon />
            <span className="tip-text">Click ô để chỉnh sửa • Ctrl+Click để chuyển nhanh</span>
          </div>
        </div>
      </div>

      <div className="filters-card">
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">
              <PersonIcon />
              Vai Trò
            </label>
            <select className="filter-select" value={selectedRole} onChange={e=> setSelectedRole(e.target.value)}>
              {roles.map(r=> <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          
          <div className="filter-group filter-month">
            <label className="filter-label">
              <CalendarIcon />
              Tháng
            </label>
            <div className="month-controls">
              <button className="month-nav-btn prev" onClick={()=> setMonthDate(d=> new Date(d.getFullYear(), d.getMonth()-1, 1))}>
                ‹
              </button>
              <input 
                type="month" 
                className="month-input" 
                value={monthStr} 
                onChange={e=> {
                  const [yy, mm] = e.target.value.split('-');
                  setMonthDate(new Date(Number(yy), Number(mm)-1, 1));
                }} 
              />
              <button className="month-nav-btn next" onClick={()=> setMonthDate(d=> new Date(d.getFullYear(), d.getMonth()+1, 1))}>
                ›
              </button>
            </div>
            <div className="quick-month-btns">
              <button className="quick-btn" onClick={()=> setMonthDate(CURRENT_MONTH_BASE)}>
                Hiện tại
              </button>
              <button className="quick-btn" onClick={()=> setMonthDate(NEXT_MONTH_BASE)}>
                Tháng sau
              </button>
            </div>
          </div>
          
          <div className="filter-actions">
            <button className="action-btn btn-reload" onClick={load} disabled={loading}>
              <RefreshIcon />
              {loading ? 'Đang tải...' : 'Tải lại'}
            </button>
            <button className="action-btn btn-bulk" onClick={()=>setBulkMode(b=>!b)}>
              {bulkMode ? <CloseIcon /> : <FlashIcon />}
              {bulkMode ? 'Đóng Bulk' : 'Bulk Edit'}
            </button>
          </div>
        </div>
      </div>

      {bulkMode && (
        <div className="bulk-edit-card">
          <div className="bulk-header">
            <div className="bulk-title-group">
              <FlashIcon />
              <h5 className="bulk-title">Chỉnh Sửa Hàng Loạt</h5>
            </div>
            <button className="close-bulk-btn" onClick={()=>setBulkMode(false)}>
              <CloseIcon />
            </button>
          </div>
          <div className="bulk-body">
            <div className="bulk-grid">
              <div className="bulk-section">
                <label className="bulk-label">
                  <PersonIcon />
                  Chọn Người Dùng
                </label>
                <select className="bulk-select" value={bulkSelectedUser} onChange={e=> setBulkSelectedUser(e.target.value)}>
                  <option value="">-- Chọn người dùng --</option>
                  {users.map(u=> <option key={u._id} value={u._id}>{u.name || u._id.slice(-6)}</option>)}
                </select>
              </div>

              <div className="bulk-section">
                <label className="bulk-label">
                  <TimeIcon />
                  Chọn Ca Làm
                </label>
                <div className="shift-checkboxes">
                  {shifts.map(s=> (
                    <label key={s} className="shift-checkbox">
                      <input 
                        type="checkbox" 
                        checked={bulkShifts.includes(s)} 
                        onChange={()=> setBulkShifts(prev=> prev.includes(s)? prev.filter(x=> x!==s): [...prev,s])} 
                      />
                      <span className="shift-label">{s}</span>
                    </label>
                  ))}
                </div>
                <div className="shift-quick-btns">
                  <button className="quick-shift-btn" onClick={()=> setBulkShifts(shifts)}>Tất cả</button>
                  <button className="quick-shift-btn" onClick={()=> setBulkShifts(['sang','chieu'])}>Sáng + Chiều</button>
                  <button className="quick-shift-btn" onClick={()=> setBulkShifts(['toi'])}>Chỉ Tối</button>
                  <button className="quick-shift-btn" onClick={()=> setBulkShifts([])}>Bỏ chọn</button>
                </div>
              </div>

              <div className="bulk-section">
                <label className="bulk-label">
                  <ListIcon />
                  Loại Ca
                </label>
                <select className="bulk-select" value={bulkShiftType} onChange={e=> setBulkShiftType(e.target.value)}>
                  {shiftTypeOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="bulk-section bulk-days-section">
                <label className="bulk-label">
                  <CalendarIcon />
                  Chọn Ngày
                  <span className="selected-count">{Object.values(bulkDays).filter(Boolean).length} ngày</span>
                </label>
                <div className="day-filter-btns">
                  <button className="day-filter-btn" onClick={()=> {
                    const map={}; days.forEach(d=> map[localDateStr(d)] = true); setBulkDays(map);
                  }}>Tất cả</button>
                  <button className="day-filter-btn" onClick={()=> {
                    const map={}; days.forEach(d=> { if(![0,6].includes(d.getDay())) map[localDateStr(d)] = true;}); setBulkDays(map);
                  }}>Ngày làm</button>
                  <button className="day-filter-btn" onClick={()=> {
                    const map={}; days.forEach(d=> { if([0,6].includes(d.getDay())) map[localDateStr(d)] = true;}); setBulkDays(map);
                  }}>Cuối tuần</button>
                  <button className="day-filter-btn clear" onClick={()=> setBulkDays({})}>Xóa</button>
                </div>
                <div className="days-grid">
                  {days.map(d=>{ 
                    const ds = localDateStr(d); 
                    const active = !!bulkDays[ds]; 
                    const weekend = [0,6].includes(d.getDay()); 
                    return (
                      <button 
                        key={ds} 
                        className={`day-btn ${active ? 'active' : ''} ${weekend ? 'weekend' : ''}`} 
                        title={ds} 
                        onClick={()=> setBulkDays(prev=> ({ ...prev, [ds]: !prev[ds] }))}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bulk-actions">
              <button className="bulk-action-btn apply" onClick={applyBulk}>
                <CheckIcon />
                Áp Dụng
              </button>
              <button className="bulk-action-btn reset" onClick={()=> setBulkDays({})}>
                <LoopIcon />
                Reset Ngày
              </button>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'admin' && (
        <div className="auto-generate-card">
          <div className="auto-header">
            <RobotIcon />
            <h5 className="auto-title">Tự Động Sinh Lịch Tháng Kế Tiếp</h5>
          </div>
          <div className="auto-body">
            <div className="auto-roles-section">
              <label className="auto-label">Chọn vai trò để tạo lịch tự động:</label>
              <div className="roles-checkboxes">
                {roles.map(r=> (
                  <label key={r} className="role-checkbox">
                    <input 
                      type="checkbox" 
                      checked={autoRoles.includes(r)} 
                      onChange={()=> toggleAutoRole(r)} 
                    />
                    <span className="role-label">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="auto-option">
              <label className="switch-container">
                <input 
                  type="checkbox" 
                  className="switch-input" 
                  checked={autoReplaceExisting} 
                  onChange={()=> setAutoReplaceExisting(v=> !v)} 
                />
                <span className="switch-slider"></span>
                <span className="switch-label">Xóa lịch cũ tháng kế tiếp trước khi áp dụng</span>
              </label>
            </div>

            <div className="auto-actions">
              <button 
                disabled={autoLoading || !autoRoles.length} 
                className="auto-btn dry-run" 
                onClick={()=> runAutoGenerate(true)}
              >
                <VisibilityIcon />
                {autoLoading ? 'Đang chạy...' : 'Xem Trước (Dry Run)'}
              </button>
              <button 
                disabled={autoLoading || !autoRoles.length || !autoDryRunResult} 
                className="auto-btn apply" 
                onClick={()=> runAutoGenerate(false)}
              >
                <CheckIcon />
                {autoLoading ? 'Đang áp dụng...' : 'Áp Dụng Vào Hệ Thống'}
              </button>
            </div>
            
            {!autoDryRunResult && (
              <div className="auto-hint">
                <LightbulbIcon />
                Hãy chạy "Xem Trước" để xem kết quả trước khi áp dụng
              </div>
            )}

            {autoDryRunResult && (
              <div className="auto-result">
                <div className="result-header">
                  <h6 className="result-title">
                    <ChartIcon />
                    Kết Quả: Tháng {autoDryRunResult.month}
                  </h6>
                  <div className="result-stats">
                    <div className="stat-item">
                      <span className="stat-value">{autoDryRunResult.generated}</span>
                      <span className="stat-label">Bản ghi</span>
                    </div>
                    <div className="stat-status">
                      {autoDryRunResult.dryRun ? (
                        <span className="status-preview">
                          <VisibilityIcon />
                          Xem trước
                        </span>
                      ) : (
                        <span className="status-applied">
                          <CheckIcon />
                          Đã áp dụng
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="result-table-wrapper">
                  <table className="result-table">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Vai trò</th>
                        <th>Tổng ca</th>
                        <th>Ca tối/Trực</th>
                        <th>Ngày làm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {autoDryRunResult.summaries?.map(s=> (
                        <tr key={s.userId + s.role}>
                          <td className="user-cell">{s.userId?.slice?.(-6) || s.userId}</td>
                          <td className="role-cell">{s.role}</td>
                          <td className="number-cell">{s.totalShifts}</td>
                          <td className="number-cell">{s.nightShifts}</td>
                          <td className="number-cell">{s.daysWorked}</td>
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

      <div className="schedule-table-card">
        <div className="table-header">
          <TableIcon />
          <h5 className="table-title">Bảng Lịch Làm Việc</h5>
        </div>
        <div className="table-container">
          <div className="table-scroll">
            <table className="schedule-table-modern">
              <thead>
                <tr>
                  <th className="user-header-sticky">
                    <div className="header-content">
                      <span>Nhân Viên</span>
                      <span className="user-count">{users.length}</span>
                    </div>
                  </th>
                  {days.map(d=> {
                    const isWeekend = [0,6].includes(d.getDay());
                    return (
                      <th key={localDateStr(d)} className={`day-header ${isWeekend ? 'weekend' : ''}`}>
                        <div className="day-content">
                          <span className="day-number">{d.getDate()}</span>
                          <span className="day-name">
                            {['CN','T2','T3','T4','T5','T6','T7'][d.getDay()]}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {users.map(u=> shifts.map((shift,idx)=> (
                  <tr key={u._id + shift} className={`shift-row ${idx===0 ? 'first-shift':''}`}>
                    {idx===0 && (
                      <td rowSpan={shifts.length} className="user-cell-sticky">
                        <div className="user-info">
                          <div className="user-avatar">{(u.name || u._id)?.[0]?.toUpperCase()}</div>
                          <div className="user-details">
                            <div className="user-name">{u.name || u._id.slice(-6)}</div>
                            <div className="user-role">{u.role}</div>
                          </div>
                        </div>
                      </td>
                    )}
                    {days.map(d=>{
                      const cell = getCell(u._id, d, shift);
                      const isWeekend = [0,6].includes(d.getDay());
                      let cellClass = 'schedule-cell';
                      if(cell) cellClass += ` has-data cell-${cell.shiftType}`;
                      if(isWeekend) cellClass += ' weekend-cell';
                      
                      return (
                        <td 
                          key={u._id + localDateStr(d) + shift} 
                          className={cellClass} 
                          onClick={(e)=> handleCellClick(u._id, d, shift, e)}
                          title={cell ? `${shiftTypeLabelMap[cell.shiftType]} - ${shift}` : `Thêm ca ${shift}`}
                        >
                          {cell && (
                            <span className={`cell-badge badge-${cell.shiftType}`}>
                              {shiftTypeLabelMap[cell.shiftType]}
                            </span>
                          )}
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

      <div className="stats-card">
        <div className="stats-header">
          <ChartIcon />
          <h6 className="stats-title">Thống Kê Tháng {monthStr}</h6>
        </div>
        <div className="stats-body">
          {stats.length > 0 ? (
            <div className="stats-grid">
              {stats.map(s=> (
                <div key={s._id.role + s._id.shiftType} className="stat-card">
                  <div className="stat-label">{s._id.role} - {shiftTypeLabelMap[s._id.shiftType] || s._id.shiftType}</div>
                  <div className="stat-value">{s.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-stats">Chưa có dữ liệu thống kê</div>
          )}
        </div>
      </div>

      {editingCell && (
        <div className="modal-overlay" onClick={()=> setEditingCell(null)}>
          <div className="modal-dialog-modern" onClick={e=> e.stopPropagation()}>
            <div className="modal-header-modern">
              <h5 className="modal-title-modern">
                <EditIcon />
                Chỉnh Sửa Ca {editingCell.shift.toUpperCase()}
              </h5>
              <div className="modal-subtitle">
                Ngày {editingCell.day.getDate()}/{editingCell.day.getMonth()+1}/{editingCell.day.getFullYear()}
              </div>
              <button className="modal-close-btn" onClick={()=> setEditingCell(null)}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body-modern">
              <div className="shift-type-grid">
                {shiftTypeOptions.map(opt=> (
                  <button 
                    key={opt.value} 
                    className={`shift-type-btn type-${opt.value}`}
                    onClick={()=> saveCell(opt.value)}
                  >
                    <span className="type-icon">
                      {opt.value === 'lam_viec' ? <WorkIcon /> : opt.value === 'truc' ? <NightIcon /> : <BeachIcon />}
                    </span>
                    <span className="type-label">{opt.label}</span>
                  </button>
                ))}
                <button className="shift-type-btn type-delete" onClick={clearCell}>
                  <span className="type-icon">
                    <DeleteIcon />
                  </span>
                  <span className="type-label">Xóa Ca</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
