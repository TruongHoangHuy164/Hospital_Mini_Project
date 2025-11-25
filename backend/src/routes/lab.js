const express = require('express');
const CanLamSang = require('../models/CanLamSang');
const HoSoKham = require('../models/HoSoKham');
const BenhNhan = require('../models/BenhNhan');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();

// List pending orders
// GET /api/lab/orders?status=cho_thuc_hien|dang_thuc_hien|da_xong
router.get('/orders', async (req, res, next) => {
  try {
    const { status, q, day } = req.query;
    const filter = {};
    if (status) filter.trangThai = status;
    if (q) {
      filter.$or = [
        { ghiChu: { $regex: q, $options: 'i' } },
        { loaiChiDinh: { $regex: q, $options: 'i' } }
      ];
    }
    // Date filtering for a specific day (YYYY-MM-DD)
    if (day) {
      const start = new Date(`${day}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }
    // By default only show lab orders that have been paid by reception (daThanhToan = true).
    // If caller sets includeUnpaid=1, return unpaid as well (for admin/debug).
    if(!req.query.includeUnpaid) filter.daThanhToan = true;
    const items = await CanLamSang.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate({
        path: 'dichVuId',
        select: 'ten gia chuyenKhoaId',
        populate: { path: 'chuyenKhoaId', select: 'ten' }
      })
      .populate({
        path: 'hoSoKhamId',
        select: 'benhNhanId bacSiId trangThai createdAt',
        populate: [
          { path: 'benhNhanId', select: 'hoTen soDienThoai ngaySinh' },
          { path: 'bacSiId', select: 'hoTen' }
        ]
      });
    res.json(items);
  } catch (err) {
    return next(err);
  }
});

// Claim/Start an order
// POST /api/lab/orders/:id/start
// PATCH /api/lab/orders/:id/start
router.post('/orders/:id/start', async (req, res, next) => {
  try{
    const u = req.user;
    const doc = await CanLamSang.findByIdAndUpdate(req.params.id, { $set: { trangThai: 'dang_thuc_hien', nhanVienId: u?.id, ngayThucHien: new Date() } }, { new: true });
    if(!doc) return res.status(404).json({ message: 'Không tìm thấy chỉ định' });
    res.json(doc);
  }catch(err){ return next(err); }
});

router.patch('/orders/:id/start', async (req, res, next) => {
  try{
    const u = req.user;
    const doc = await CanLamSang.findByIdAndUpdate(req.params.id, { $set: { trangThai: 'dang_thuc_hien', nhanVienId: u?.id, ngayThucHien: new Date() } }, { new: true });
    if(!doc) return res.status(404).json({ message: 'Không tìm thấy chỉ định' });
    res.json(doc);
  }catch(err){ return next(err); }
});

// Submit result
// POST /api/lab/orders/:id/complete
router.post('/orders/:id/complete', async (req, res, next) => {
  try{
    const { ketQua } = req.body || {};
    const doc = await CanLamSang.findByIdAndUpdate(req.params.id, { $set: { ketQua: ketQua||'', trangThai: 'da_xong' } }, { new: true });
    if(!doc) return res.status(404).json({ message: 'Không tìm thấy chỉ định' });
    res.json(doc);
  }catch(err){ return next(err); }
});

// Submit result with optional file upload
// PATCH /api/lab/orders/:id/result (both with and without file)
// Accepts: JSON { ketQua: string } or FormData with ketQua + file
const resultsDir = path.join(__dirname, '..', 'uploads', 'lab-results');
if(!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function(req,file,cb){ cb(null, resultsDir); },
  filename: function(req,file,cb){
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});
const uploadResult = multer({
  storage,
  fileFilter: (req,file,cb)=>{
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if(!allowedMimes.includes(file.mimetype)) return cb(new Error('Chỉ chấp nhận PDF, JPG, PNG, DOC, DOCX'));
    cb(null,true);
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.patch('/orders/:id/result', uploadResult.single('file'), async (req, res, next) => {
  try{
    const { ketQua } = req.body || {};
    if (!ketQua || !String(ketQua).trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập kết quả' });
    }
    
    const updateData = { 
      ketQua: String(ketQua).trim(), 
      trangThai: 'da_xong' 
    };
    
    // Nếu có file upload
    if(req.file){
      updateData.ketQuaPdf = `/uploads/lab-results/${path.basename(req.file.path)}`;
    }
    
    const doc = await CanLamSang.findByIdAndUpdate(
      req.params.id, 
      { $set: updateData }, 
      { new: true }
    );
    if(!doc) return res.status(404).json({ message: 'Không tìm thấy chỉ định' });
    res.json(doc);
  }catch(err){ 
    // Xóa file nếu upload bị lỗi
    if(req.file) fs.unlink(req.file.path, (e) => {});
    return next(err); 
  }
});

// GET /api/lab/stats?date=YYYY-MM-DD
// Returns: { paid, pending, done, ready }
router.get('/stats', async (req, res, next) => {
  try {
    const { date } = req.query;
    const filter = {};

    // If date provided, filter by that specific day
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }

    // Only count lab orders that have been paid (daThanhToan = true)
    filter.daThanhToan = true;

    const stats = {
      paid: 0,      // Status: 'cho_thuc_hien' (PAID, waiting)
      pending: 0,   // Status: 'dang_thuc_hien' (in progress)
      done: 0,      // Status: 'da_xong' (done, needs result)
      ready: 0      // HoSoKham with trangThai 'RESULT_READY'
    };

    // Count by CanLamSang status
    stats.paid = await CanLamSang.countDocuments({ ...filter, trangThai: 'cho_thuc_hien' });
    stats.pending = await CanLamSang.countDocuments({ ...filter, trangThai: 'dang_thuc_hien' });
    stats.done = await CanLamSang.countDocuments({ ...filter, trangThai: 'da_xong' });

    // Count cases (HoSoKham) with trangThai = 'RESULT_READY'
    const readyFilter = {};
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      readyFilter.createdAt = { $gte: start, $lt: end };
    }
    stats.ready = await HoSoKham.countDocuments({ ...readyFilter, trangThai: 'RESULT_READY' });

    res.json(stats);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
