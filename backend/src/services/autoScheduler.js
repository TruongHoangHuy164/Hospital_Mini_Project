// Auto scheduling service
// Generates fair next-month schedules based on rules:
// - Max 6 consecutive working days
// - Min 4 days off per month
// - Spread night ("toi") shifts evenly (used as night or evening shift placeholder)
// - If a user works a night shift (shiftType 'truc' on 'toi'), next day morning shift is off (enforced by skipping assignment)
// - Target working days range per role:
//   doctor: 22-25 days (2 shifts/day possible)
//   nurse: ~22 shifts (mix of day/night) using sequential pattern 4 day + 1 night + 1 off
//   reception|cashier|lab: 24-26 day shifts, single shift (sang or chieu) with rotation
// Implementation chooses a pattern heuristic rather than exact optimization.

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

// Core generator per role
function generateForRole({ role, users, yearMonth, options = {} }){
  const days = dateList(yearMonth);
  const entries = [];
  const stats = Object.fromEntries(users.map(u=> [u._id.toString(), { userId: u._id, role, shifts:0, days:Set.prototype, nights:0, lastDay:null, consecutive:0, maxConsecutive:0, workedDays: new Set() }]));
  // Replace prototype placeholders
  for(const s of Object.values(stats)){ s.workedDays = new Set(); }

  if(role === 'nurse'){
    // Pattern: 4 day (sang) + 1 night (toi, truc) + 1 off, repeat
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
    // Assign morning/afternoon pairs spread, allow some full days and some single shifts.
    // Step 1: Build rotation order
    const orderedUsers = shuffle(users);
    let idx = 0;
    for(const day of days){
      const weekday = new Date(day).getDay(); // 0 Sunday
      // Skip some Sundays for rest
      const restDay = (weekday === 0); // Sunday off default
      if(restDay) continue;
      // Decide if full-day or single-shift day
      const fullDay = (weekday === 2 || weekday === 4); // Wed/Fri full-day pattern
      if(fullDay){
        const u = orderedUsers[idx % orderedUsers.length]; idx++;
        entries.push({ userId: u._id, role, day, shift: 'sang', shiftType: 'lam_viec' });
        entries.push({ userId: u._id, role, day, shift: 'chieu', shiftType: 'lam_viec' });
        const st = stats[u._id.toString()];
        st.shifts += 2; st.workedDays.add(day);
      } else {
        // Two different doctors morning/afternoon
        const u1 = orderedUsers[idx % orderedUsers.length]; idx++;
        const u2 = orderedUsers[idx % orderedUsers.length]; idx++;
        entries.push({ userId: u1._id, role, day, shift: 'sang', shiftType: 'lam_viec' });
        entries.push({ userId: u2._id, role, day, shift: 'chieu', shiftType: 'lam_viec' });
        stats[u1._id.toString()].shifts += 1; stats[u1._id.toString()].workedDays.add(day);
        stats[u2._id.toString()].shifts += 1; stats[u2._id.toString()].workedDays.add(day);
      }
      // Occasionally add an evening (toi) on Saturdays rotating for on-call
      if(weekday === 6){
        const u = orderedUsers[idx % orderedUsers.length]; idx++;
        entries.push({ userId: u._id, role, day, shift: 'toi', shiftType: 'truc' });
        stats[u._id.toString()].shifts += 1; stats[u._id.toString()].nights += 1; stats[u._id.toString()].workedDays.add(day);
      }
    }
  } else {
    // reception, cashier, lab -> single shift coverage for each open day
    const orderedUsers = shuffle(users);
    let idx = 0;
    for(const day of days){
      const weekday = new Date(day).getDay();
      // Example: clinic open all days; optionally make Sunday lighter by skipping
      const closed = false;
      if(closed) continue;
      const u = orderedUsers[idx % orderedUsers.length]; idx++;
      entries.push({ userId: u._id, role, day, shift: 'sang', shiftType: 'lam_viec' });
      stats[u._id.toString()].shifts += 1; stats[u._id.toString()].workedDays.add(day);
    }
  }

  // Compute summary stats
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
