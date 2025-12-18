const express = require('express');
const DichVu = require('../models/DichVu');
const ChuyenKhoa = require('../models/ChuyenKhoa');
const ThuocKho = require('../models/ThuocKho');
const LoaiThuoc = require('../models/LoaiThuoc');

const router = express.Router();

// ===== Tóm tắt API Công khai (public) =====
// Không yêu cầu đăng nhập. Phục vụ tra cứu dịch vụ, chuyên khoa, bác sĩ và thuốc.
//
// - GET  /api/public/services                : Danh sách dịch vụ đang active; lọc theo chuyenKhoaId, từ khoá q
// - GET  /api/public/specialties             : Danh sách chuyên khoa (hiện lấy tất cả)
// - GET  /api/public/doctors                 : Danh sách bác sĩ cơ bản; lọc q, chuyenKhoa (id hoặc tên), phongKhamId; giới hạn limit
// - GET  /api/public/medicines               : Danh sách thuốc (phân trang); q, categoryId, sortBy, order, page, limit
// - GET  /api/public/medicines/:id           : Chi tiết 1 thuốc
// - GET  /api/public/medicine-categories     : Danh mục thuốc kèm số lượng thuốc mỗi danh mục

// Công khai: liệt kê dịch vụ đang hoạt động, hỗ trợ lọc theo chuyên khoa và từ khóa
// GET /api/public/services?chuyenKhoaId=...&q=...
router.get('/services', async (req, res, next) => {
  try{
    const { chuyenKhoaId, q } = req.query;
    const filter = { active: true };
    if (chuyenKhoaId) filter.chuyenKhoaId = chuyenKhoaId;
    if (q) filter.ten = { $regex: String(q), $options: 'i' };
    const items = await DichVu.find(filter).populate('chuyenKhoaId','ten').sort({ ten: 1 });
    res.json(items);
  }catch(err){ next(err); }
});

// Công khai: danh sách chuyên khoa (nếu có cờ active thì chỉ lấy active; hiện tại lấy tất cả)
// GET /api/public/specialties
router.get('/specialties', async (req, res, next) => {
  try{
    // Danh sách chuyên khoa (không cần đăng nhập)
    const items = await ChuyenKhoa.find().sort({ ten: 1 });
    res.json(items);
  }catch(err){ next(err); }
});
// Công khai: liệt kê bác sĩ (thông tin cơ bản) để lựa chọn trong UI
// GET /api/public/doctors?q=&limit=20
router.get('/doctors', async (req, res, next) => {
  try{
    const BacSi = require('../models/BacSi');
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit||'50',10), 200);
    const filter = {};
    if (q) filter.hoTen = { $regex: q, $options: 'i' };
    // Bộ lọc: theo chuyên khoa (chấp nhận id hoặc tên) và theo phòng khám
    let chuyenKhoa = (req.query.chuyenKhoa || '').trim();
    if (chuyenKhoa) {
      // Nếu là ObjectId, tra ra tên chuyên khoa để lọc theo tên
      if (/^[0-9a-fA-F]{24}$/.test(chuyenKhoa)) {
        try {
          const spec = await ChuyenKhoa.findById(chuyenKhoa).lean();
          if (spec && spec.ten) chuyenKhoa = spec.ten;
        } catch (_) { /* ignore */ }
      }
      filter.chuyenKhoa = chuyenKhoa;
    }
    const phongKhamId = req.query.phongKhamId;
    if (phongKhamId) filter.phongKhamId = phongKhamId;
    const items = await BacSi.find(filter)
      .select('hoTen chuyenKhoa phongKhamId userId')
      .limit(limit)
      .sort({ hoTen: 1 });
    res.json(items);
  }catch(err){ next(err); }
});

// Công khai: liệt kê thuốc (có phân trang)
// GET /api/public/medicines?page=1&limit=20&q=&categoryId=&sortBy=ten_san_pham&order=asc
router.get('/medicines', async (req, res, next) => {
  try {
    let { page = 1, limit = 20, q = '', categoryId, sortBy = 'ten_san_pham', order = 'asc' } = req.query;
    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const filter = {};
    if (q) {
      const regex = { $regex: String(q), $options: 'i' };
      filter.$or = [ { ten_san_pham: regex }, { mo_ta: regex } ];
    }
    if (categoryId) filter.loaiThuoc = categoryId;
    const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
    const total = await ThuocKho.countDocuments(filter);
    const items = await ThuocKho.find(filter)
      .populate('loaiThuoc','ten')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('ten_san_pham gia mo_ta loaiThuoc chi_tiet.anh_san_pham');
    res.json({
      items: items.map(it => ({
        _id: it._id,
        ten_san_pham: it.ten_san_pham,
        gia: it.gia,
        mo_ta: it.mo_ta,
        loaiThuoc: it.loaiThuoc,
        anh_san_pham: (it.chi_tiet?.anh_san_pham || []).slice(0,6),
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (err) { next(err); }
});

// Công khai: chi tiết thuốc
// GET /api/public/medicines/:id
router.get('/medicines/:id', async (req, res, next) => {
  try {
    const it = await ThuocKho.findById(req.params.id).populate('loaiThuoc','ten');
    if (!it) return res.status(404).json({ message: 'Không tìm thấy thuốc' });
    res.json(it);
  } catch (err) { next(err); }
});

// Công khai: danh mục thuốc kèm số lượng
// GET /api/public/medicine-categories
router.get('/medicine-categories', async (req, res, next) => {
  try {
    // Danh mục thuốc kèm số lượng thuốc trong mỗi danh mục
    const categories = await LoaiThuoc.find().sort({ ten: 1 });
    const countsAgg = await ThuocKho.aggregate([
      { $group: { _id: '$loaiThuoc', count: { $sum: 1 } } }
    ]);
    const countsMap = countsAgg.reduce((a, c) => { a[String(c._id)] = c.count; return a; }, {});
    res.json(categories.map(c => ({ _id: c._id, ten: c.ten, count: countsMap[String(c._id)] || 0 })));
  } catch (err) { next(err); }
});

module.exports = router;
