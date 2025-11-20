import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchMySchedule, createWorkSchedule, updateWorkSchedule, deleteWorkSchedule, resetMyNextMonthSchedule } from '../../api/workSchedules';
import { fetchNextScheduleConfig } from '../../api/scheduleConfig';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import styles from './MySchedule.module.css';

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
  
  // Cải thiện logic cycle: Trống → Làm việc → Trực → Nghỉ → Xóa (null)
  function cycle(current){ 
    if(!current) return 'lam_viec'; // Trống → Làm việc
    if(current === 'lam_viec') return 'truc'; // Làm việc → Trực
    if(current === 'truc') return 'nghi'; // Trực → Nghỉ  
    if(current === 'nghi') return null; // Nghỉ → Xóa
    return 'lam_viec'; // Fallback
  }

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

  function violatesAdd(type, shift, day = null){
    // Skip validation for 'nghi' (off days)
    if(type === 'nghi') return null;
    
    // Preview stats if we add this shift
    const next = { ...stats };
    const dayStr = day ? localDateStr(day) : (modal?.day ? localDateStr(modal.day) : null);
    
    // If new working shift on a day that currently has no working shift recorded, increment workDays
    if(dayStr && !rows.some(r => r.day === dayStr && r.shiftType !== 'nghi')) {
      next.workDays++;
    }
    
    // Count night shifts (toi + truc)
    if(shift === 'toi' && type === 'truc') {
      next.nightShifts++;
    }
    
    // Count day shifts (sang, chieu with any type except nghi)
    if(shift !== 'toi' && type !== 'nghi') {
      next.dayShifts++;
    }
    
    // Check constraints
    if(next.workDays > rules.maxWorkDays) {
      return `Vượt quá số ngày làm tối đa (${rules.maxWorkDays})`;
    }
    
    if(shift === 'toi' && type === 'truc' && next.nightShifts > rules.maxNight) {
      return `Vượt quá số ca trực tối đa (${rules.maxNight})`;
    }
    
    return null;
  }

  async function quick(day, shift, e){
    console.log('🚀 Quick toggle:', { day: day.getDate(), shift, windowOpen });
    
    if(!windowOpen){ 
      toast.warn('🔒 Chưa mở đăng ký - Chỉ đăng ký từ ngày 15 trở đi'); 
      return; 
    }
    
    const cell = getCell(day, shift); 
    const currentType = cell?.shiftType;
    const nextType = cycle(currentType);
    
    console.log('🔄 Cycle state:', { 
      current: currentType || 'trống', 
      next: nextType || 'xóa',
      hasCell: !!cell 
    });
    
    // Nếu next là null → Xóa ca hiện tại
    if(nextType === null){ 
      if(cell){ 
        try{ 
          await deleteWorkSchedule(cell._id); 
          setRows(prev => prev.filter(r => r._id !== cell._id)); 
          toast.success('🗑️ Đã xóa ca làm việc'); 
        } catch(error){ 
          console.error('❌ Delete error:', error);
          toast.error('Xóa thất bại: ' + (error.response?.data?.message || error.message)); 
        } 
      } else {
        toast.info('ℹ️ Không có ca nào để xóa');
      }
      return; 
    }
    
    // Kiểm tra ràng buộc khi tạo ca mới (không áp dụng cho 'nghi')
    if(!cell && nextType !== 'nghi'){
      const msg = violatesAdd(nextType, shift, day);
      if(msg){ 
        toast.warn('⚠️ ' + msg); 
        return; 
      }
    }
    
    // Cập nhật hoặc tạo mới
    try {
      if(cell){
        // Cập nhật ca hiện có
        await updateWorkSchedule(cell._id, { shiftType: nextType }); 
        setRows(prev => prev.map(r => r._id === cell._id ? { ...r, shiftType: nextType } : r)); 
        toast.success(`✅ Đã chuyển thành: ${shiftTypeLabel[nextType]}`); 
      } else {
        // Tạo ca mới
        const created = await createWorkSchedule({ 
          userId: user.id || user._id, 
          role: user.role, 
          day: localDateStr(day), 
          shift, 
          shiftType: nextType 
        }); 
        setRows(prev => [...prev, created]); 
        toast.success(`🎉 Đã tạo ca: ${shiftTypeLabel[nextType]}`); 
      }
    } catch(error) {
      console.error('❌ Quick operation error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra';
      toast.error('Thao tác thất bại: ' + errorMsg); 
    }
  }

  function handleClick(day, shift, e){ 
    console.log('🖱️ Cell clicked:', { 
      day: day.getDate(), 
      shift, 
      ctrlKey: e?.ctrlKey, 
      altKey: e?.altKey, 
      metaKey: e?.metaKey,
      windowOpen 
    });
    
    // Kiểm tra phím tắt cho chế độ chuyển đổi nhanh
    if(e && (e.ctrlKey || e.metaKey || e.altKey)) { 
      e.preventDefault(); 
      e.stopPropagation(); 
      console.log('⚡ Quick mode activated');
      quick(day, shift, e); 
      return; 
    } 
    
    // Kiểm tra cửa sổ đăng ký có mở không
    if(!windowOpen){ 
      toast.warn('🔒 Chưa mở đăng ký - Chỉ đăng ký từ ngày 15 trở đi'); 
      return; 
    } 
    
    // Mở modal để chọn loại ca
    const cell = getCell(day, shift); 
    console.log('📋 Opening modal:', { day: day.getDate(), shift, hasExisting: !!cell });
    setModal({ day, shift, existing: cell }); 
  }

  async function save(type){
    console.log('Save function called:', { type, modal, windowOpen });
    
    if(!modal) return; 
    
    if(!windowOpen){ 
      toast.warn('Chỉ đăng ký từ ngày 15 trở đi'); 
      return; 
    }
    
    const { day, shift, existing } = modal;
    
    if(!existing && type !== 'nghi'){
      const msg = violatesAdd(type, shift, day);
      if(msg){ 
        toast.warn(msg); 
        return; 
      }
    }
    
    try {
      if(existing){
        await updateWorkSchedule(existing._id, { shiftType: type });
        setRows(prev => prev.map(r => r._id === existing._id ? { ...r, shiftType: type } : r));
        toast.success(`Đã cập nhật: ${shiftTypeLabel[type]}`);
      } else {
        const created = await createWorkSchedule({ 
          userId: user.id || user._id, 
          role: user.role, 
          day: localDateStr(day), 
          shift, 
          shiftType: type 
        });
        setRows(prev => [...prev, created]);
        toast.success(`Đã tạo: ${shiftTypeLabel[type]}`);
      }
      setModal(null);
    } catch(error) { 
      console.error('Save error:', error);
      toast.error('Lưu thất bại'); 
    }
  }
  async function clearCell(){ 
    console.log('ClearCell called:', { modal, windowOpen });
    
    if(!modal) return; 
    
    if(!windowOpen){ 
      toast.warn('Chỉ đăng ký từ ngày 15 trở đi'); 
      return; 
    } 
    
    const { existing } = modal; 
    
    if(existing){ 
      try{ 
        await deleteWorkSchedule(existing._id); 
        setRows(prev => prev.filter(r => r._id !== existing._id)); 
        toast.success('Đã xóa ca'); 
      } catch(error){ 
        console.error('Clear error:', error);
        toast.error('Xóa thất bại'); 
      } 
    } 
    
    setModal(null); 
  }

  function badge(cell){ if(!cell) return <span className="placeholder">.</span>; return <span className="badge bg-transparent text-dark">{shiftTypeLabel[cell.shiftType]||cell.shiftType}</span>; }

  const today = new Date();
  const todayStr = localDateStr(today);

  return (
    <div className={styles.scheduleContainer}>
      <div className={styles.scheduleCard}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Lịch Làm Việc Cá Nhân</h1>
          <div className={styles.monthNav}>
            <div className={styles.currentMonth}>{monthStr}</div>
            <div className={`${styles.statusIndicator} ${windowOpen ? styles.statusOpen : styles.statusClosed}`}>
              {windowOpen ? '✅ Đang mở đăng ký' : '🔒 Đang khóa'}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className={styles.statsSection}>
          <div className={styles.statsCard}>
            <div className={styles.statsTitle}>Tổng ngày làm việc</div>
            <div className={styles.statsValue}>{stats.workDays}</div>
            <div className={styles.statsSubtext}>
              Mục tiêu: {rules.minWorkDays}-{rules.maxWorkDays} ngày
            </div>
          </div>
          <div className={styles.statsCard}>
            <div className={styles.statsTitle}>Ca trực đêm</div>
            <div className={styles.statsValue}>{stats.nightShifts}</div>
            <div className={styles.statsSubtext}>
              Mục tiêu: {rules.minNight}-{rules.maxNight} ca
            </div>
          </div>
          <div className={styles.statsCard}>
            <div className={styles.statsTitle}>Ca ban ngày</div>
            <div className={styles.statsValue}>{stats.dayShifts}</div>
            <div className={styles.statsSubtext}>
              Bao gồm ca sáng và chiều
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button 
            className={styles.actionButton} 
            onClick={load} 
            disabled={loading}
          >
            {loading ? '⏳ Đang tải...' : '🔄 Tải lại'}
          </button>
          <button 
            className={`${styles.actionButton} ${styles.danger}`}
            onClick={async()=>{
              if(!windowOpen){ toast.warn('Chưa mở đăng ký'); return; }
              if(!window.confirm('Xóa toàn bộ lịch tháng kế tiếp của bạn?')) return;
              try { await resetMyNextMonthSchedule(); toast.success('Đã xóa'); load(); } catch { toast.error('Xóa thất bại'); }
            }}
          >
            Xóa toàn bộ tháng
          </button>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.legendWork}`}></div>
            <span>Làm việc</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.legendOn}`}></div>
            <span>Trực</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.legendOff}`}></div>
            <span>Nghỉ</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.legendEmpty}`}></div>
            <span>Chưa đăng ký</span>
          </div>
        </div>



        {/* Help Card */}
        <div className={styles.helpCard}>
          <div className={styles.helpTitle}>💡 Hướng dẫn sử dụng</div>
          <div className={styles.helpContent}>
            <div className={styles.helpSection}>
              <h4>🖱️ Cách thao tác:</h4>
              <ul className={styles.helpList}>
                <li><strong>Click thường:</strong> Mở popup để chọn loại ca (Làm việc/Trực/Nghỉ)</li>
                <li><strong>Ctrl/Alt + Click:</strong> Chuyển đổi nhanh theo thứ tự</li>
                <li><strong>Scroll ngang:</strong> Xem các ngày khác trong tháng</li>
              </ul>
            </div>
            
            <div className={styles.helpSection}>
              <h4>🔄 Thứ tự chuyển đổi nhanh:</h4>
              <div className={styles.cycleFlow}>
                <span className={styles.cycleStep}>Trống</span>
                <span className={styles.cycleArrow}>→</span>
                <span className={styles.cycleStep}>💼 Làm việc</span>
                <span className={styles.cycleArrow}>→</span>
                <span className={styles.cycleStep}>🌙 Trực</span>
                <span className={styles.cycleArrow}>→</span>
                <span className={styles.cycleStep}>🏖️ Nghỉ</span>
                <span className={styles.cycleArrow}>→</span>
                <span className={styles.cycleStep}>🗑️ Xóa</span>
              </div>
            </div>
            
            <div className={styles.helpSection}>
              <h4>📋 Quy định:</h4>
              <ul className={styles.helpList}>
                <li>Chỉ đăng ký từ ngày <strong>{config?.openFrom || (new Date().toISOString().slice(0,7)+'-15')}</strong> trở đi</li>
                <li>Mỗi ngày có 3 ca: 🌅 Sáng, ☀️ Chiều, 🌙 Tối</li>
                <li>Ca tối + Trực = Ca trực đêm (tính vào thống kê)</li>
                <li>Tự động kiểm tra giới hạn số ca theo chức vụ</li>
              </ul>
            </div>
          </div>
        </div>

       

        {/* Week Headers */}
        <div className={styles.weekHeaderWrapper}>
          <div className={styles.weekHeader}>
            <div className={styles.weekDay}></div>
            {days.map(d => {
              const dayOfWeek = d.getDay();
              const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
              return (
                <div key={localDateStr(d)} className={styles.weekDay}>
                  {weekDays[dayOfWeek]}
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Grid */}
        {loading ? (
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
          </div>
        ) : (
          <div className={styles.scheduleWrapper}>
            <div className={styles.scheduleGrid}>
              {/* Header row */}
              <div className={styles.dayHeader}>
                <div>Ca/Ngày</div>
              </div>
              {days.map(d => {
                const dayOfWeek = d.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                return (
                  <div key={localDateStr(d)} className={`${styles.dayHeader} ${isWeekend ? styles.weekend : ''}`}>
                    <div>{d.getDate()}</div>
                    {localDateStr(d) === todayStr && <div className={styles.todayMark}>●</div>}
                  </div>
                );
              })}

              {/* Shift rows */}
              {shifts.map(sh => (
                <React.Fragment key={sh}>
                  <div className={styles.shiftLabel}>
                    {sh === 'sang' ? '🌅 Sáng' : sh === 'chieu' ? '☀️ Chiều' : '🌙 Tối'}
                  </div>
                  {days.map(d => {
                    const cell = getCell(d, sh);
                    const isToday = localDateStr(d) === todayStr;
                    let cellClass = styles.scheduleCell;
                    
                    // Enhanced color coding based on shift and type
                    if (cell) {
                      if (cell.shiftType === 'lam_viec') {
                        if (sh === 'sang') cellClass += ` ${styles.cellMorning}`;
                        else if (sh === 'chieu') cellClass += ` ${styles.cellAfternoon}`;
                        else cellClass += ` ${styles.cellEvening}`;
                      } else if (cell.shiftType === 'truc') {
                        cellClass += ` ${styles.cellOn}`;
                      } else if (cell.shiftType === 'nghi') {
                        cellClass += ` ${styles.cellOff}`;
                      }
                    } else {
                      cellClass += ` ${styles.cellEmpty}`;
                    }
                    
                    if (isToday) cellClass += ` ${styles.todayCell}`;

                    return (
                      <div
                        key={sh + localDateStr(d)}
                        className={cellClass}
                        onClick={(e) => handleClick(d, sh, e)}
                        title={`${sh === 'sang' ? 'Ca sáng' : sh === 'chieu' ? 'Ca chiều' : 'Ca tối'} ngày ${d.getDate()} - ${cell ? shiftTypeLabel[cell.shiftType] : 'Click để đăng ký'}`}
                      >
                        {cell ? (
                          <>
                            <span className={styles.shiftText}>{shiftTypeLabel[cell.shiftType]}</span>
                            {cell.shiftType === 'truc' && <div className={styles.shiftIndicator}></div>}
                          </>
                        ) : (
                          <span className={styles.emptyText}>+</span>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Modal */}
        {modal && (
          <div className={styles.modal} onClick={() => setModal(null)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>
                  {modal.shift === 'sang' ? '🌅' : modal.shift === 'chieu' ? '☀️' : '🌙'} 
                  Ca {modal.shift === 'sang' ? 'Sáng' : modal.shift === 'chieu' ? 'Chiều' : 'Tối'}
                </div>
                <div className={styles.modalSubtitle}>
                  Ngày {modal.day?.getDate()} tháng {formatMonth(modal.day).slice(-2)}
                </div>
                <button 
                  className={styles.modalClose}
                  onClick={() => setModal(null)}
                  title="Đóng"
                >
                  ✕
                </button>
              </div>
              
              <div className={styles.modalBody}>
                {modal.existing && (
                  <div className={styles.currentStatus}>
                    <span className={styles.currentLabel}>Hiện tại:</span>
                    <span className={`${styles.currentValue} ${styles[`status${modal.existing.shiftType}`]}`}>
                      {modal.existing.shiftType === 'lam_viec' ? '💼' : 
                       modal.existing.shiftType === 'truc' ? '🌙' : '🏖️'} 
                      {shiftTypeLabel[modal.existing.shiftType]}
                    </span>
                  </div>
                )}
                
                <div className={styles.optionLabel}>
                  {modal.existing ? 'Thay đổi thành:' : 'Chọn loại ca:'}
                </div>
                
                <div className={styles.shiftTypeGrid}>
                  {shiftTypes.map(type => {
                    const isSelected = modal.existing?.shiftType === type;
                    const icons = { lam_viec: '💼', truc: '🌙', nghi: '🏖️' };
                    const colors = { lam_viec: 'work', truc: 'duty', nghi: 'off' };
                    
                    return (
                      <button 
                        key={type} 
                        className={`${styles.shiftTypeBtn} ${styles[colors[type]]} ${isSelected ? styles.selected : ''}`}
                        onClick={() => save(type)}
                        disabled={isSelected}
                      >
                        <div className={styles.btnIcon}>{icons[type]}</div>
                        <div className={styles.btnLabel}>{shiftTypeLabel[type]}</div>
                        {type === 'truc' && modal.shift === 'toi' && (
                          <div className={styles.btnNote}>Ca đêm</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className={styles.modalFooter}>
                {modal.existing && (
                  <button 
                    className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                    onClick={clearCell}
                    title="Xóa ca này"
                  >
                    🗑️ Xóa ca
                  </button>
                )}
                <button 
                  className={`${styles.actionBtn} ${styles.cancelBtn}`} 
                  onClick={() => setModal(null)}
                >
                  Hủy
                </button>
              </div>
              
              <div className={styles.modalTip}>
                💡 <strong>Mẹo:</strong> Dùng Ctrl/Alt + Click để chuyển đổi nhanh
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
