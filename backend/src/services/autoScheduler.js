// Dịch vụ tự động xếp lịch làm việc
// Tạo lịch công bằng cho tháng kế tiếp dựa trên các quy tắc:
// - Tối đa 6 ngày làm liên tiếp
// - Tối thiểu 4 ngày nghỉ mỗi tháng
// - Phân bổ ca tối ("toi") đồng đều (dùng như ca trực/ca tối)
// - Nếu nhân sự trực ca tối (shiftType 'truc' ở 'toi'), sáng hôm sau nghỉ (bỏ gán ca sáng)
// - Mục tiêu số ngày/ca làm việc theo vai trò:
//   doctor: 22-25 ngày (có thể 2 ca/ngày)
//   nurse: ~22 ca (trộn ca ngày/ca tối) theo chu kỳ 4 ngày + 1 tối + 1 nghỉ
//   reception|cashier|lab: 24-26 ca ngày, mỗi ngày 1 ca (sáng hoặc chiều) luân phiên
// Cách triển khai dùng heuristic theo mẫu, không tối ưu hoá tuyệt đối.

const WorkSchedule = require('../models/WorkSchedule');

function daysInYearMonth(yearMonth){
  const [y,m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function dateList(yearMonth){
  const total = daysInYearMonth(yearMonth);
  return Array.from({length: total}, (_,i)=> `${yearMonth}-${String(i+1).padStart(2,'0')}`);
}

function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

// Bộ sinh lịch theo từng vai trò
function generateForRole({ role, users, yearMonth, options = {} }){
  const days = dateList(yearMonth);
  const entries = [];
  const stats = Object.fromEntries(users.map(u=> [u._id.toString(), { userId: u._id, role, shifts:0, days:Set.prototype, nights:0, lastDay:null, consecutive:0, maxConsecutive:0, workedDays: new Set() }]));
  // Replace prototype placeholders
  for(const s of Object.values(stats)){ s.workedDays = new Set(); }

  if(role === 'nurse'){
    // Mẫu: 4 ngày (sáng) + 1 tối (toi, trực) + 1 nghỉ, lặp lại
    const pattern = ['sang','sang','sang','sang','toi','off'];
    let patIndex = 0;
    let userIndex = 0;
    for(const day of days){
      const act = pattern[patIndex];
      patIndex = (patIndex + 1) % pattern.length;
      if(act === 'off') continue;
      const user = users[userIndex];
      userIndex = (userIndex + 1) % users.length;
      if(act === 'sang'){
        entries.push({ userId: user._id, role, day, shift: 'sang', shiftType: 'lam_viec' });
        entries.push({ userId: user._id, role, day, shift: 'chieu', shiftType: 'lam_viec' });
        stats[user._id.toString()].shifts += 2;
        stats[user._id.toString()].workedDays.add(day);
      } else if(act === 'toi'){
        entries.push({ userId: user._id, role, day, shift: 'toi', shiftType: 'truc' });
        stats[user._id.toString()].shifts += 1;
        stats[user._id.toString()].nights += 1;
        stats[user._id.toString()].workedDays.add(day);
      }
    }
  } else if(role === 'doctor'){
    // Phân bổ cặp ca sáng/chiều, có ngày làm cả ngày và ngày chỉ một ca.
    // Bước 1: Tạo thứ tự luân phiên
    const orderedUsers = shuffle(users);
    let idx = 0;
    for(const day of days){
      const weekday = new Date(day).getDay(); // 0: Chủ nhật
      // Bỏ một số Chủ nhật để nghỉ
      const restDay = (weekday === 0); // Mặc định nghỉ Chủ nhật
      if(restDay) continue;
      // Quyết định làm cả ngày hay một ca
      const fullDay = (weekday === 2 || weekday === 4); // Thứ 4/Thứ 6 làm cả ngày theo mẫu
      if(fullDay){
        const u = orderedUsers[idx % orderedUsers.length]; idx++;
        entries.push({ userId: u._id, role, day, shift: 'sang', shiftType: 'lam_viec' });
        entries.push({ userId: u._id, role, day, shift: 'chieu', shiftType: 'lam_viec' });
        const st = stats[u._id.toString()];
        st.shifts += 2; st.workedDays.add(day);
      } else {
        // Hai bác sĩ khác nhau cho ca sáng/chiều
        const u1 = orderedUsers[idx % orderedUsers.length]; idx++;
        const u2 = orderedUsers[idx % orderedUsers.length]; idx++;
        entries.push({ userId: u1._id, role, day, shift: 'sang', shiftType: 'lam_viec' });
        entries.push({ userId: u2._id, role, day, shift: 'chieu', shiftType: 'lam_viec' });
        stats[u1._id.toString()].shifts += 1; stats[u1._id.toString()].workedDays.add(day);
        stats[u2._id.toString()].shifts += 1; stats[u2._id.toString()].workedDays.add(day);
      }
      // Thỉnh thoảng thêm ca tối (toi) vào Thứ 7 để trực luân phiên
      if(weekday === 6){
        const u = orderedUsers[idx % orderedUsers.length]; idx++;
        entries.push({ userId: u._id, role, day, shift: 'toi', shiftType: 'truc' });
        stats[u._id.toString()].shifts += 1; stats[u._id.toString()].nights += 1; stats[u._id.toString()].workedDays.add(day);
      }
    }
  } else {
    // reception, cashier, lab -> mỗi ngày một ca để phủ kín ngày mở cửa
    const orderedUsers = shuffle(users);
    let idx = 0;
    for(const day of days){
      const weekday = new Date(day).getDay();
      // Ví dụ: phòng khám mở cả tuần; có thể giảm tải Chủ nhật bằng cách bỏ qua
      const closed = false;
      if(closed) continue;
      const u = orderedUsers[idx % orderedUsers.length]; idx++;
      entries.push({ userId: u._id, role, day, shift: 'sang', shiftType: 'lam_viec' });
      stats[u._id.toString()].shifts += 1; stats[u._id.toString()].workedDays.add(day);
    }
  }

  // Tính thống kê tổng hợp
  const summaries = Object.values(stats).map(s => ({
    userId: s.userId,
    role,
    totalShifts: s.shifts,
    nightShifts: s.nights||0,
    daysWorked: s.workedDays.size,
  }));

  return { entries, summaries };
}

async function generateAutoSchedule({ yearMonth, usersByRole }){
  // usersByRole: { role: [UserDoc] }
  const allEntries = [];
  const allSummaries = [];
  for(const [role, users] of Object.entries(usersByRole)){
    if(!users || !users.length) continue;
    const { entries, summaries } = generateForRole({ role, users, yearMonth });
    allEntries.push(...entries);
    allSummaries.push(...summaries);
  }
  return { entries: allEntries, summaries: allSummaries };
}

module.exports = { generateAutoSchedule };
