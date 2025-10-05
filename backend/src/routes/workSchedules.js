const express = require('express');
const WorkSchedule = require('../models/WorkSchedule');
const User = require('../models/User');

const router = express.Router();

// Validate day string YYYY-MM-DD
function isDayStr(s){ return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s); }
// Build month string range for lexicographic compare (YYYY-MM-DD)
function monthRange(month){
  if(!month) return null;
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(month);
  if(!m) return null;
  const y = +m[1]; const mon = +m[2]; if(mon<1||mon>12) return null;
  const start = `${m[1]}-${m[2]}-01`;
  const nextMonth = new Date(Date.UTC(y, mon-1, 1)); nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1);
  const ny = nextMonth.getUTCFullYear(); const nm = String(nextMonth.getUTCMonth()+1).padStart(2,'0');
  const end = `${ny}-${nm}-01`; // exclusive
  return { start, end };
}

// Helpers to restrict operations to ONLY next calendar month from 'now'
function getNextMonthYearMonth(){
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  const next = new Date(y, m + 1, 1);
  const ny = next.getFullYear();
  const nm = String(next.getMonth() + 1).padStart(2,'0');
  return `${ny}-${nm}`; // YYYY-MM of next month
}
function isInNextMonth(dayStr){
  if(!isDayStr(dayStr)) return false;
  return dayStr.slice(0,7) === getNextMonthYearMonth();
}

// Precompute once per process tick (acceptable; recompute if needed per request otherwise)
function assertNextMonth(dayStr){
  if(!isInNextMonth(dayStr)){
    const allowed = getNextMonthYearMonth();
    const err = new Error(`Chỉ được đăng ký lịch cho tháng tiếp theo (${allowed})`);
    err.status = 400;
    throw err;
  }
}

// GET /api/work-schedules?month=YYYY-MM&role=&userId=
// Trả về danh sách lịch của 1 tháng theo role hoặc user cụ thể
router.get('/', async (req, res, next) => {
  try {
    const { month, role, userId } = req.query;
    const range = monthRange(month);
    if(!range) return res.status(400).json({ message: 'month phải dạng YYYY-MM' });
  const filter = { day: { $gte: range.start, $lt: range.end } };
    if(role) filter.role = role;
    if(userId) filter.userId = userId;
    const items = await WorkSchedule.find(filter).sort({ day: 1, userId: 1, shift: 1 });
    res.json(items);
  } catch(err){ return next(err); }
});

// POST /api/work-schedules - tạo 1 lịch
router.post('/', async (req, res, next) => {
  try {
  const { userId, role, day, shift, shiftType='lam_viec', clinicId, reason, note, meta } = req.body || {};
    if(!userId || !role || !day || !shift) return res.status(400).json({ message: 'Thiếu trường bắt buộc' });
    if(!['doctor','reception','lab','cashier','nurse'].includes(role)) return res.status(400).json({ message: 'role không hợp lệ' });
    if(!['sang','chieu','toi'].includes(shift)) return res.status(400).json({ message: 'shift không hợp lệ' });
    if(shiftType && !['lam_viec','truc','nghi'].includes(shiftType)) return res.status(400).json({ message: 'shiftType không hợp lệ' });
  if(!isDayStr(day)) return res.status(400).json({ message: 'day không hợp lệ' });
    // Enforce next month restriction
    try { assertNextMonth(day); } catch(e){ return res.status(e.status||400).json({ message: e.message }); }
    const user = await User.findById(userId).select('role');
    if(!user) return res.status(404).json({ message: 'User không tồn tại' });
    if(user.role !== role) return res.status(400).json({ message: 'role không khớp với user' });
  const doc = await WorkSchedule.create({ userId, role, day, shift, shiftType, clinicId, reason, note, meta });
    res.status(201).json(doc);
  } catch(err){
    if(err && err.code === 11000) return res.status(409).json({ message: 'Đã có lịch cho user/day/shift' });
    return next(err);
  }
});

// PUT /api/work-schedules/:id
router.put('/:id', async (req, res, next) => {
  try {
    const allow = ['shift','shiftType','clinicId','reason','note','meta','day'];
    const body = req.body || {};
    const update = {};
    for(const k of allow){ if(typeof body[k] !== 'undefined') update[k] = body[k]; }
    if(update.shift && !['sang','chieu','toi'].includes(update.shift)) return res.status(400).json({ message: 'shift không hợp lệ' });
    if(update.shiftType && !['lam_viec','truc','nghi'].includes(update.shiftType)) return res.status(400).json({ message: 'shiftType không hợp lệ' });
  if(update.day){ if(!isDayStr(update.day)) return res.status(400).json({ message: 'day không hợp lệ' }); }
    // Fetch existing doc to enforce month rule even if day not changed
    const existing = await WorkSchedule.findById(req.params.id);
    if(!existing) return res.status(404).json({ message: 'Không tìm thấy' });
    const targetDay = update.day || existing.day;
    try { assertNextMonth(targetDay); } catch(e){ return res.status(e.status||400).json({ message: e.message }); }
    const doc = await WorkSchedule.findByIdAndUpdate(req.params.id, update, { new: true });
    if(!doc) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(doc);
  } catch(err){
    if(err && err.code === 11000) return res.status(409).json({ message: 'Xung đột user/day/shift' });
    return next(err);
  }
});

// DELETE /api/work-schedules/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const r = await WorkSchedule.findByIdAndDelete(req.params.id);
    if(!r) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ ok: true });
  } catch(err){ return next(err); }
});

// POST /api/work-schedules/bulk
// body: { items: [ { userId, role, day, shift, shiftType, clinicId, reason, note, meta } ], upsert=true }
router.post('/bulk', async (req, res, next) => {
  try {
    const { items, upsert = true } = req.body || {};
    if(!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'items trống' });
    const ops = [];
    const allowedMonth = getNextMonthYearMonth();
    for(const it of items){
      if(!it.userId || !it.role || !it.day || !it.shift) continue;
      if(!['doctor','reception','lab','cashier','nurse'].includes(it.role)) continue;
      if(!['sang','chieu','toi'].includes(it.shift)) continue;
  if(!isDayStr(it.day)) continue;
      if(it.day.slice(0,7) !== allowedMonth) return res.status(400).json({ message: `Tất cả day phải thuộc tháng tiếp theo (${allowedMonth})` });
  const doc = { ...it };
      if(doc.shiftType && !['lam_viec','truc','nghi'].includes(doc.shiftType)) doc.shiftType='lam_viec';
      ops.push({ updateOne: { filter: { userId: doc.userId, day: doc.day, shift: doc.shift }, update: { $set: doc }, upsert } });
    }
    if(!ops.length) return res.status(400).json({ message: 'Không có bản ghi hợp lệ' });
    const bulkRes = await WorkSchedule.bulkWrite(ops, { ordered: false });
    res.json({ ok: true, upserted: bulkRes.upsertedCount || 0, modified: bulkRes.modifiedCount || 0 });
  } catch(err){ return next(err); }
});

// GET /api/work-schedules/stats?month=YYYY-MM&role=doctor -> trả tổng số ca theo shiftType
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { month, role } = req.query;
    const range = monthRange(month);
    if(!range) return res.status(400).json({ message: 'month phải dạng YYYY-MM' });
    const match = { day: { $gte: range.start, $lt: range.end } };
    if(role) match.role = role;
    const agg = await WorkSchedule.aggregate([
  { $match: match },
      { $group: { _id: { role: '$role', shiftType: '$shiftType' }, count: { $sum: 1 } } },
      { $sort: { '_id.role': 1, '_id.shiftType': 1 } }
    ]);
    res.json(agg);
  } catch(err){ return next(err); }
});

// ===== Self view for current user =====
// GET /api/work-schedules/me?month=YYYY-MM
router.get('/me/self', async (req, res, next) => {
  try {
    const { month } = req.query;
    const range = monthRange(month);
    if(!range) return res.status(400).json({ message: 'month phải dạng YYYY-MM' });
    const userId = req.user?.id;
    if(!userId) return res.status(401).json({ message: 'Unauthorized' });
  const items = await WorkSchedule.find({ userId, day: { $gte: range.start, $lt: range.end } }).sort({ day: 1, shift: 1 });
    res.json(items);
  } catch(err){ return next(err); }
});

module.exports = router;
