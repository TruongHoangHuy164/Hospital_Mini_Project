const express = require('express');
const DichVu = require('../models/DichVu');
const ChuyenKhoa = require('../models/ChuyenKhoa');
const ThuocKho = require('../models/ThuocKho');
const LoaiThuoc = require('../models/LoaiThuoc');

const router = express.Router();

// Public: list active services, optional filter by specialty and query
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

// Optional: Public list of specialties (active only if you have such a flag). For now reuse all.
// GET /api/public/specialties
router.get('/specialties', async (req, res, next) => {
  try{
    // Danh sách chuyên khoa (không cần đăng nhập)
    const items = await ChuyenKhoa.find().sort({ ten: 1 });
    res.json(items);
  }catch(err){ next(err); }
});
// Public: list doctors (basic info) for selection in UI
// GET /api/public/doctors?q=&limit=20
router.get('/doctors', async (req, res, next) => {
  try{
    const BacSi = require('../models/BacSi');
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit||'50',10), 200);
    const filter = {};
    if (q) filter.hoTen = { $regex: q, $options: 'i' };
    // Filters: by specialty (accept id or name) and clinic id
    let chuyenKhoa = (req.query.chuyenKhoa || '').trim();
    if (chuyenKhoa) {
      // If it's an ObjectId, map to specialty name
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

// Public: list medicines (paginated)
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

// Public: medicine detail
// GET /api/public/medicines/:id
router.get('/medicines/:id', async (req, res, next) => {
  try {
    const it = await ThuocKho.findById(req.params.id).populate('loaiThuoc','ten');
    if (!it) return res.status(404).json({ message: 'Không tìm thấy thuốc' });
    res.json(it);
  } catch (err) { next(err); }
});

// Public: medicine categories with counts
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
