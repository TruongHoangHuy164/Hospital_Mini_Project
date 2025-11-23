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
router.post('/orders/:id/start', async (req, res, next) => {
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

module.exports = router;

// ===== Upload PDF result (new endpoint) =====
// POST /api/lab/orders/:id/result  (multipart/form-data, field: file)
// Accept only application/pdf, store under /uploads/lab-results
const resultsDir = path.join(__dirname, '..', 'uploads', 'lab-results');
if(!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function(req,file,cb){ cb(null, resultsDir); },
  filename: function(req,file,cb){
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    cb(null, unique + '.pdf');
  }
});
const upload = multer({
  storage,
  fileFilter: (req,file,cb)=>{
    if(file.mimetype !== 'application/pdf') return cb(new Error('Chỉ chấp nhận PDF'));
    cb(null,true);
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post('/orders/:id/result', upload.single('file'), async (req,res,next)=>{
  try{
    if(!req.file) return res.status(400).json({ message: 'Thiếu file PDF' });
    const doc = await CanLamSang.findById(req.params.id)
      .populate({ path: 'dichVuId', select: 'ten gia chuyenKhoaId', populate: { path:'chuyenKhoaId', select:'ten' } })
      .populate({ path: 'hoSoKhamId', select: 'benhNhanId bacSiId trangThai createdAt', populate: [
        { path: 'benhNhanId', select: 'hoTen soDienThoai ngaySinh' },
        { path: 'bacSiId', select: 'hoTen' }
      ]});
    if(!doc) return res.status(404).json({ message: 'Không tìm thấy chỉ định' });
    doc.ketQuaPdf = `/uploads/lab-results/${path.basename(req.file.path)}`;
    // If not yet completed, mark completed
    if(doc.trangThai !== 'da_xong') {
      doc.trangThai = 'da_xong';
      if(!doc.ngayThucHien) doc.ngayThucHien = new Date();
    }
    await doc.save();
    res.status(201).json(doc);
  }catch(err){ return next(err); }
});
