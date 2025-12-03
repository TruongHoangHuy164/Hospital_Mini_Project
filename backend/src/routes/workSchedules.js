// Router quản lý lịch làm việc (tháng kế tiếp)
const express = require('express');
const WorkSchedule = require('../models/WorkSchedule');
const User = require('../models/User');
const ScheduleConfig = require('../models/ScheduleConfig');
const { generateAutoSchedule } = require('../services/autoScheduler');

const router = express.Router();

// Kiểm tra định dạng ngày YYYY-MM-DD
function isDayStr(s){ return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s); }
// Tạo khoảng ngày cho 1 tháng (YYYY-MM-DD) để so sánh
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

// Helpers: giới hạn thao tác CHỈ cho tháng kế tiếp tính từ thời điểm hiện tại
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

// Kiểm tra và báo lỗi nếu ngày không thuộc tháng kế tiếp
function assertNextMonth(dayStr){
  if(!isInNextMonth(dayStr)){
    const allowed = getNextMonthYearMonth();
    const err = new Error(`Chỉ được đăng ký lịch cho tháng tiếp theo (${allowed})`);
    err.status = 400;
    throw err;
  }
}

// Đảm bảo đã đến ngày mở đăng ký (mặc định ngày 15 của tháng hiện tại),
// nếu có cấu hình ScheduleConfig cho tháng kế tiếp thì dùng openFrom từ đó
async function ensureWindowOpenForUser(){
  // Admin always allowed
  if(thisReqUserRole() === 'admin') return;
  const nextMonth = getNextMonthYearMonth();
  const cfg = await ScheduleConfig.findOne({ month: nextMonth });
  const todayStr = new Date().toISOString().slice(0,10);
  // Fallback: 15th of the CURRENT month (consistent with GET /config/next)
  const currentMonthPrefix = new Date().toISOString().slice(0,7);
  let openFrom = `${currentMonthPrefix}-15`;
  if(cfg) openFrom = cfg.openFrom;
  if(todayStr < openFrom){
    const err = new Error(`Chưa mở đăng ký. Mở từ: ${openFrom}`);
    err.status = 400;
    throw err;
  }
}

// Truy cập role của request hiện tại (thông qua biến closure đã được set)
let _reqUser = null;
function setReqUser(u){ _reqUser = u; }
function thisReqUserRole(){ return _reqUser?.role; }

// GET /api/work-schedules?month=YYYY-MM&role=&userId=
// Mô tả: Trả về danh sách lịch làm việc theo tháng (lọc theo vai trò hoặc user cụ thể)
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

// POST /api/work-schedules - Tạo 1 lịch làm việc
router.post('/', async (req, res, next) => {
  try {
    setReqUser(req.user);
  const { userId, role, day, shift, shiftType='lam_viec', clinicId, reason, note, meta } = req.body || {};
    if(!userId || !role || !day || !shift) return res.status(400).json({ message: 'Thiếu trường bắt buộc' });
    if(!['doctor','reception','lab','cashier','nurse'].includes(role)) return res.status(400).json({ message: 'role không hợp lệ' });
    if(!['sang','chieu','toi'].includes(shift)) return res.status(400).json({ message: 'shift không hợp lệ' });
    if(shiftType && !['lam_viec','truc','nghi'].includes(shiftType)) return res.status(400).json({ message: 'shiftType không hợp lệ' });
  if(!isDayStr(day)) return res.status(400).json({ message: 'day không hợp lệ' });
    // Enforce next month restriction
    try { assertNextMonth(day); } catch(e){ return res.status(e.status||400).json({ message: e.message }); }
  try { await ensureWindowOpenForUser(); } catch(e){ return res.status(e.status||400).json({ message: e.message }); }
    const user = await User.findById(userId).select('role');
    if(!user) return res.status(404).json({ message: 'User không tồn tại' });
    if(user.role !== role) return res.status(400).json({ message: 'role không khớp với user' });
    // Quyền: admin tạo cho bất kỳ ai; lễ tân (reception) chỉ tạo lịch cho bác sĩ
    if(req.user.role !== 'admin'){
      if(req.user.role === 'reception'){
        // reception can only create schedules for users with role 'doctor'
        if(user.role !== 'doctor') return res.status(403).json({ message: 'Reception chỉ được đăng ký lịch cho bác sĩ' });
      } else if(req.user.id !== String(userId)){
        return res.status(403).json({ message: 'Chỉ được đăng ký lịch cho chính mình' });
      }
    }
  const doc = await WorkSchedule.create({ userId, role, day, shift, shiftType, clinicId, reason, note, meta });
    res.status(201).json(doc);
  } catch(err){
    if(err && err.code === 11000) return res.status(409).json({ message: 'Đã có lịch cho user/day/shift' });
    return next(err);
  }
});

// PUT /api/work-schedules/:id - Cập nhật lịch làm việc
router.put('/:id', async (req, res, next) => {
  try {
    setReqUser(req.user);
    const allow = ['shift','shiftType','clinicId','reason','note','meta','day'];
    const body = req.body || {};
    const update = {};
    for(const k of allow){ if(typeof body[k] !== 'undefined') update[k] = body[k]; }
    if(update.shift && !['sang','chieu','toi'].includes(update.shift)) return res.status(400).json({ message: 'shift không hợp lệ' });
    if(update.shiftType && !['lam_viec','truc','nghi'].includes(update.shiftType)) return res.status(400).json({ message: 'shiftType không hợp lệ' });
  if(update.day){ if(!isDayStr(update.day)) return res.status(400).json({ message: 'day không hợp lệ' }); }
    // Lấy bản ghi hiện tại để kiểm tra quy tắc tháng dù không đổi ngày
    const existing = await WorkSchedule.findById(req.params.id);
    if(!existing) return res.status(404).json({ message: 'Không tìm thấy' });
    const targetDay = update.day || existing.day;
    try { assertNextMonth(targetDay); } catch(e){ return res.status(e.status||400).json({ message: e.message }); }
  try { await ensureWindowOpenForUser(); } catch(e){ return res.status(e.status||400).json({ message: e.message }); }
    if(req.user.role !== 'admin' && String(existing.userId) !== String(req.user.id)){
      return res.status(403).json({ message: 'Không được sửa lịch của người khác' });
    }
    const doc = await WorkSchedule.findByIdAndUpdate(req.params.id, update, { new: true });
    if(!doc) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(doc);
  } catch(err){
    if(err && err.code === 11000) return res.status(409).json({ message: 'Xung đột user/day/shift' });
    return next(err);
  }
});

// DELETE /api/work-schedules/:id - Xóa lịch làm việc
router.delete('/:id', async (req, res, next) => {
  try {
    setReqUser(req.user);
    const existing = await WorkSchedule.findById(req.params.id);
    if(!existing) return res.status(404).json({ message: 'Không tìm thấy' });
  try { await ensureWindowOpenForUser(); } catch(e){ return res.status(e.status||400).json({ message: e.message }); }
    if(req.user.role !== 'admin' && String(existing.userId) !== String(req.user.id)){
      return res.status(403).json({ message: 'Không được xóa lịch của người khác' });
    }
    const r = await WorkSchedule.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch(err){ return next(err); }
});

// POST /api/work-schedules/bulk
// Mô tả: Thêm/sửa nhiều lịch làm việc trong tháng kế tiếp.
// body: { items: [ { userId, role, day, shift, shiftType, clinicId, reason, note, meta } ], upsert=true }
router.post('/bulk', async (req, res, next) => {
  try {
    setReqUser(req.user);
    const { items, upsert = true } = req.body || {};
    if(!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'items trống' });
    const ops = [];
    const allowedMonth = getNextMonthYearMonth();
    const isAdmin = req.user.role === 'admin';
    for(const it of items){
      if(!it.userId || !it.role || !it.day || !it.shift) continue;
      if(!['doctor','reception','lab','cashier','nurse'].includes(it.role)) continue;
      if(!['sang','chieu','toi'].includes(it.shift)) continue;
  if(!isDayStr(it.day)) continue;
      if(it.day.slice(0,7) !== allowedMonth) return res.status(400).json({ message: `Tất cả day phải thuộc tháng tiếp theo (${allowedMonth})` });
  try { await ensureWindowOpenForUser(); } catch(e){ return res.status(e.status||400).json({ message: e.message }); }
      if(!isAdmin && String(it.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Không được bulk lịch cho người khác' });
  const doc = { ...it };
      if(doc.shiftType && !['lam_viec','truc','nghi'].includes(doc.shiftType)) doc.shiftType='lam_viec';
      ops.push({ updateOne: { filter: { userId: doc.userId, day: doc.day, shift: doc.shift }, update: { $set: doc }, upsert } });
    }
    if(!ops.length) return res.status(400).json({ message: 'Không có bản ghi hợp lệ' });
    const bulkRes = await WorkSchedule.bulkWrite(ops, { ordered: false });
    res.json({ ok: true, upserted: bulkRes.upsertedCount || 0, modified: bulkRes.modifiedCount || 0 });
  } catch(err){ return next(err); }
});

// GET /api/work-schedules/stats?month=YYYY-MM&role=doctor
// Mô tả: Trả tổng số ca theo loại ca (shiftType) cho từng vai trò.
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

// ===== Xem lịch của chính người dùng =====
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

// DELETE /api/work-schedules/me/next  -> Xóa toàn bộ lịch tháng kế tiếp của user hiện tại
router.delete('/me/next', async (req,res,next)=>{
  try {
    const userId = req.user?.id;
    if(!userId) return res.status(401).json({ message: 'Unauthorized' });
    // Only non-admin can only delete their own; admin could pass ?userId= for specific user (optional extension)
    const targetUserId = req.user.role === 'admin' && req.query.userId ? req.query.userId : userId;
    const nextMonth = getNextMonthYearMonth();
    const start = `${nextMonth}-01`;
    // compute exclusive end using monthRange
    const range = monthRange(nextMonth);
    await WorkSchedule.deleteMany({ userId: targetUserId, day: { $gte: range.start, $lt: range.end } });
    res.json({ ok: true });
  } catch(err){ next(err); }
});

module.exports = router;
// ===== Endpoint cấu hình (chỉ admin) =====
// GET /api/work-schedules/config/next -> Lấy cấu hình tháng kế tiếp
router.get('/config/next', async (req,res,next)=>{
  try {
    const nextMonth = getNextMonthYearMonth();
    const cfg = await ScheduleConfig.findOne({ month: nextMonth });
    // Mặc định khung giờ nếu chưa cấu hình trong DB
    const defaultShiftHours = {
      sang: { start: '07:30', end: '11:30' },
      chieu: { start: '13:00', end: '17:00' },
      toi: { start: '18:00', end: '22:00' }
    };
    if(!cfg){
      return res.json({
        month: nextMonth,
        openFrom: `${new Date().toISOString().slice(0,7)}-15`,
        shiftHours: defaultShiftHours,
        note: 'default (fallback)'
      });
    }
    // Trả về shiftHours nếu có, nếu không dùng mặc định
    const out = cfg.toObject();
    if(!out.shiftHours) out.shiftHours = defaultShiftHours;
    res.json(out);
  } catch(err){ next(err); }
});

// PUT /api/work-schedules/config/next { openFrom, note } -> Cập nhật cấu hình tháng kế tiếp
router.put('/config/next', async (req,res,next)=>{
  try {
    if(req.user.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin cấu hình' });
    const nextMonth = getNextMonthYearMonth();
    const { openFrom, note, shiftHours } = req.body || {};
    if(!openFrom || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(openFrom)) return res.status(400).json({ message: 'openFrom phải YYYY-MM-DD' });
    // openFrom must be in current month or earlier (cannot be after month start?) allow any day before nextMonth month  start
    const todayPrefix = new Date().toISOString().slice(0,7); // current YYYY-MM
    if(openFrom.slice(0,7) !== todayPrefix){
      return res.status(400).json({ message: 'openFrom phải thuộc tháng hiện tại' });
    }
    // Validate shiftHours if provided
    if(shiftHours){
      const validatePair = (p)=> p && typeof p.start === 'string' && typeof p.end === 'string' && /^[0-9]{2}:[0-9]{2}$/.test(p.start) && /^[0-9]{2}:[0-9]{2}$/.test(p.end);
      if(!(validatePair(shiftHours.sang) && validatePair(shiftHours.chieu) && validatePair(shiftHours.toi))){
        return res.status(400).json({ message: 'shiftHours phải đủ sang/chieu/toi với định dạng HH:MM' });
      }
    }
    const cfg = await ScheduleConfig.findOneAndUpdate(
      { month: nextMonth },
      { month: nextMonth, openFrom, note, ...(shiftHours ? { shiftHours } : {}) },
      { new: true, upsert: true }
    );
    res.json(cfg);
  } catch(err){ next(err); }
});

// GET /api/work-schedules/shift-hours -> Trả khung giờ ca làm việc hiệu lực cho tháng kế tiếp
router.get('/shift-hours', async (req,res,next)=>{
  try {
    const nextMonth = getNextMonthYearMonth();
    const cfg = await ScheduleConfig.findOne({ month: nextMonth });
    const defaultShiftHours = {
      sang: { start: '07:30', end: '11:30' },
      chieu: { start: '13:00', end: '17:00' },
      toi: { start: '18:00', end: '22:00' }
    };
    const shiftHours = cfg?.shiftHours || defaultShiftHours;
    res.json({ month: nextMonth, shiftHours });
  } catch(err){ next(err); }
});

// POST /api/work-schedules/auto-generate { dryRun=true, replaceExisting=false }
// Mô tả: Admin tự động sinh lịch cho tháng kế tiếp theo quy tắc trong service.
router.post('/auto-generate', async (req,res,next)=>{
  try {
    if(req.user.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin thực hiện auto-generate' });
    const yearMonth = getNextMonthYearMonth();
    const { dryRun = true, replaceExisting = false, roles } = req.body || {};
    // Fetch users grouped by role (only target specific roles if provided)
    const roleFilter = roles && Array.isArray(roles) && roles.length ? { role: { $in: roles } } : { role: { $in: ['doctor','reception','lab','cashier','nurse'] } };
    const users = await User.find(roleFilter).select('_id role');
    const usersByRole = {};
    for(const u of users){
      if(!usersByRole[u.role]) usersByRole[u.role] = [];
      usersByRole[u.role].push(u);
    }
    const { entries, summaries } = await generateAutoSchedule({ yearMonth, usersByRole });
    if(!dryRun){
      // Optionally remove existing next-month schedules before inserting
      if(replaceExisting){
        const prefix = yearMonth;
        await WorkSchedule.deleteMany({ day: { $gte: `${prefix}-01`, $lt: `${prefix}-31` } });
      }
      if(entries.length){
        // Upsert logic: avoid duplicates if some exist
        const ops = entries.map(e=> ({ updateOne: { filter: { userId: e.userId, day: e.day, shift: e.shift }, update: { $set: e }, upsert: true } }));
        await WorkSchedule.bulkWrite(ops, { ordered: false });
      }
    }
    res.json({ month: yearMonth, generated: entries.length, applied: dryRun ? 0 : entries.length, dryRun, replaceExisting, summaries });
  } catch(err){ next(err); }
});
