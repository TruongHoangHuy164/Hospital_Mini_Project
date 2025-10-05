// Seed some demo work schedules for a given month
// Usage: node src/scripts/seedWorkSchedules.js 2025-10
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');

async function main(){
  const monthArg = process.argv[2];
  if(!monthArg){ console.error('Thiếu tham số month (YYYY-MM)'); process.exit(1); }
  const [y,m] = monthArg.split('-').map(n=>parseInt(n,10));
  if(!y || !m || m<1 || m>12){ console.error('Sai định dạng month'); process.exit(1); }
  const start = new Date(y, m-1, 1);
  const end = new Date(y, m, 1);

  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({ role: { $in: ['doctor','reception','lab','cashier','nurse'] } }).select('_id role name').limit(50);
  if(!users.length){ console.log('Không có user role phù hợp'); process.exit(0); }
  const ops = [];
  for(const u of users){
    for(let d = new Date(start); d < end; d.setDate(d.getDate()+1)){
      if([0,6].includes(d.getDay())) continue; // bỏ cuối tuần ví dụ
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      // tạo 1 hoặc 2 ca ngẫu nhiên
      const shifts = ['sang','chieu'];
      for(const shift of shifts){
        const shiftType = 'lam_viec';
        ops.push({ updateOne: { filter: { userId: u._id, day, shift }, update: { $set: { userId: u._id, role: u.role, day, shift, shiftType } }, upsert: true } });
      }
    }
  }
  if(!ops.length){ console.log('Không có dữ liệu để ghi'); return; }
  const res = await WorkSchedule.bulkWrite(ops, { ordered: false });
  console.log('Done. Upserted:', res.upsertedCount, 'Modified:', res.modifiedCount);
  await mongoose.disconnect();
}

main().catch(e=>{ console.error(e); process.exit(1); });
