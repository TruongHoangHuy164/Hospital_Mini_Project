// Migration: chuyển WorkSchedule.day từ kiểu Date sang chuỗi YYYY-MM-DD
require('dotenv').config();
const mongoose = require('mongoose');
const WorkSchedule = require('../models/WorkSchedule');

// Chuyển đối tượng ngày sang chuỗi ngày UTC dạng YYYY-MM-DD
function toDayStr(d){
  const dt = new Date(d);
  if(isNaN(dt)) return null;
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth()+1).padStart(2,'0');
  const day = String(dt.getUTCDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

(async function(){
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const cursor = WorkSchedule.find({}).cursor(); // dùng cursor để tiết kiệm bộ nhớ
    let updated = 0; let skipped = 0;
    for(let doc = await cursor.next(); doc; doc = await cursor.next()){
      // Bỏ qua nếu đã là chuỗi đúng định dạng
      if(typeof doc.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(doc.day)){ skipped++; continue; }
      const str = toDayStr(doc.day);
      if(!str){ skipped++; continue; }
      doc.day = str;
      await doc.save();
      updated++;
      if(updated % 100 === 0) console.log('Đã cập nhật', updated);
    }
    console.log('Hoàn tất. Updated:', updated, 'Skipped:', skipped);
    process.exit(0);
  } catch(err){
    console.error(err);
    process.exit(1);
  }
})();
