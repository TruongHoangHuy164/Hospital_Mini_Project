const express = require('express');
const CanLamSang = require('../models/CanLamSang');
const HoSoKham = require('../models/HoSoKham');
const BenhNhan = require('../models/BenhNhan');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();

// ===== Tóm tắt API Phòng Xét Nghiệm (lab) =====
// - GET   /api/lab/orders                  : Liệt kê chỉ định CLS theo trạng thái, tìm kiếm, lọc theo ngày; mặc định chỉ hiển thị đã thanh toán
// - POST  /api/lab/orders/:id/start        : Nhận xử lý/bắt đầu chỉ định (đặt 'dang_thuc_hien')
// - PATCH /api/lab/orders/:id/start        : Bắt đầu chỉ định (tương tự POST)
// - POST  /api/lab/orders/:id/complete     : Gửi kết quả dạng text và hoàn thành chỉ định (đặt 'da_xong')
// - PATCH /api/lab/orders/:id/result       : Gửi kết quả (bắt buộc có 'ketQua'), tùy chọn upload file (PDF/JPG/PNG/DOC/DOCX); đặt 'da_xong'
// - GET   /api/lab/stats                   : Thống kê tổng quan theo ngày: { paid, pending, done, ready }

// ===== Phòng xét nghiệm (Lab) =====
// Quản lý các chỉ định cận lâm sàng (CanLamSang) và kết quả.
// Lưu ý: Mặc định chỉ hiển thị các chỉ định đã thanh toán (`daThanhToan = true`).

// Liệt kê các chỉ định theo trạng thái
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
    // Lọc theo ngày cụ thể (YYYY-MM-DD)
    if (day) {
      const start = new Date(`${day}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }
    // Mặc định chỉ hiển thị các chỉ định đã được lễ tân thu phí (daThanhToan = true).
    // Nếu truyền includeUnpaid=1, sẽ trả cả chỉ định chưa thanh toán (cho admin/kiểm tra).
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

// Nhận xử lý/Bắt đầu một chỉ định
// POST /api/lab/orders/:id/start
// PATCH /api/lab/orders/:id/start
router.post('/orders/:id/start', async (req, res, next) => {
  try{
    const u = req.user;
    // Nhận việc và chuyển trạng thái chỉ định sang 'dang_thuc_hien'
    const doc = await CanLamSang.findByIdAndUpdate(req.params.id, { $set: { trangThai: 'dang_thuc_hien', nhanVienId: u?.id, ngayThucHien: new Date() } }, { new: true });
    if(!doc) return res.status(404).json({ message: 'Không tìm thấy chỉ định' });
    res.json(doc);
  }catch(err){ return next(err); }
});

router.patch('/orders/:id/start', async (req, res, next) => {
  try{
    const u = req.user;
    // Cho phép bắt đầu bằng PATCH (tương tự POST)
    const doc = await CanLamSang.findByIdAndUpdate(req.params.id, { $set: { trangThai: 'dang_thuc_hien', nhanVienId: u?.id, ngayThucHien: new Date() } }, { new: true });
    if(!doc) return res.status(404).json({ message: 'Không tìm thấy chỉ định' });
    res.json(doc);
  }catch(err){ return next(err); }
});

// Gửi kết quả (hoàn thành)
// POST /api/lab/orders/:id/complete
router.post('/orders/:id/complete', async (req, res, next) => {
  try{
    const { ketQua } = req.body || {};
    // Hoàn thành và đặt trạng thái 'da_xong'. Có thể cập nhật kết quả dạng text.
    const doc = await CanLamSang.findByIdAndUpdate(req.params.id, { $set: { ketQua: ketQua||'', trangThai: 'da_xong' } }, { new: true });
    if(!doc) return res.status(404).json({ message: 'Không tìm thấy chỉ định' });
    res.json(doc);
  }catch(err){ return next(err); }
});

// Gửi kết quả kèm tùy chọn upload file
// PATCH /api/lab/orders/:id/result (hỗ trợ cả có file và không có file)
// Chấp nhận: JSON { ketQua: string } hoặc FormData có ketQua + file
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

// Thống kê tổng quan theo ngày
// GET /api/lab/stats?date=YYYY-MM-DD
// Trả về: { paid, pending, done, ready }
router.get('/stats', async (req, res, next) => {
  try {
    const { date } = req.query;
    const filter = {};

    // Nếu có tham số date, lọc theo ngày cụ thể
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }

    // Chỉ tính các chỉ định đã thanh toán (daThanhToan = true)
    filter.daThanhToan = true;

    const stats = {
      paid: 0,      // Trạng thái: 'cho_thuc_hien' (đã thanh toán, chờ thực hiện)
      pending: 0,   // Trạng thái: 'dang_thuc_hien' (đang thực hiện)
      done: 0,      // Trạng thái: 'da_xong' (đã xong, cần kết quả)
      ready: 0      // Hồ sơ khám (HoSoKham) có trangThai 'RESULT_READY'
    };

    // Đếm theo trạng thái của CanLamSang
    stats.paid = await CanLamSang.countDocuments({ ...filter, trangThai: 'cho_thuc_hien' });
    stats.pending = await CanLamSang.countDocuments({ ...filter, trangThai: 'dang_thuc_hien' });
    stats.done = await CanLamSang.countDocuments({ ...filter, trangThai: 'da_xong' });

    // Đếm số hồ sơ khám có trangThai = 'RESULT_READY'
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
