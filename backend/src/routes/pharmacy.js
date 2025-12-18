// Router hiệu thuốc: xử lý đơn thuốc và quản lý kho
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const DonThuoc = require('../models/DonThuoc');
const CapThuoc = require('../models/CapThuoc');
const ThuocKho = require('../models/ThuocKho');
const LoaiThuoc = require('../models/LoaiThuoc');

// Tất cả endpoint yêu cầu đăng nhập và role 'pharmacy' (hoặc 'admin')
router.use(auth);
router.use(authorize('pharmacy', 'admin'));

// ===== Tóm tắt API Hiệu thuốc (pharmacy) =====
// Quyền hạn: tất cả endpoint yêu cầu đăng nhập và role 'pharmacy' hoặc 'admin'.
//
// Đơn thuốc (workflow)
// - GET    /api/pharmacy/orders                  : Liệt kê đơn theo trạng thái (WAITING_FOR_MEDICINE|PAID|PREPARING|COMPLETED) và theo ngày; kèm tổng tiền
// - GET    /api/pharmacy/stats                   : Thống kê số lượng theo trạng thái trong ngày: waiting|paid|preparing|completed
// - PATCH  /api/pharmacy/orders/:id/pay          : Xác nhận thanh toán (issued -> pending_pharmacy)
// - PATCH  /api/pharmacy/orders/:id/prepare      : Bắt đầu chuẩn bị thuốc (pending_pharmacy -> dispensing)
// - PATCH  /api/pharmacy/orders/:id/dispense     : Phát thuốc/hoàn tất (dispensing -> dispensed), lưu người/phút phát thuốc
//
// Quản lý kho (inventory)
// - GET    /api/pharmacy/inventory               : Liệt kê kho (phân trang, tìm kiếm, sắp xếp, lọc theo danh mục)
// - POST   /api/pharmacy/inventory               : Tạo mục kho mới
// - PUT    /api/pharmacy/inventory/:id           : Cập nhật mục kho
// - DELETE /api/pharmacy/inventory/:id           : Xoá mục kho
// - POST   /api/pharmacy/inventory/import        : Import danh sách JSON (tùy chọn gán categoryId cho tất cả)
//
// Danh mục thuốc (categories)
// - GET    /api/pharmacy/categories              : Liệt kê danh mục + số lượng thuốc mỗi danh mục
// - POST   /api/pharmacy/categories              : Tạo danh mục thuốc
// - PUT    /api/pharmacy/categories/:id          : Cập nhật danh mục
// - DELETE /api/pharmacy/categories/:id          : Xoá danh mục (chặn nếu còn thuốc thuộc danh mục)
// - POST   /api/pharmacy/categories/:id/import   : Import vào danh mục cụ thể (ủy quyền sang /inventory/import)

// Lấy đơn thuốc theo trạng thái
// GET /api/pharmacy/orders?status=WAITING_FOR_MEDICINE|PAID|PREPARING|COMPLETED&day=YYYY-MM-DD
router.get('/orders', async (req, res) => {
  try {
    const { status, day } = req.query;
    const filter = {};
    
    // Ánh xạ trạng thái luồng công việc sang trạng thái trong model DonThuoc
    const statusMap = {
      'WAITING_FOR_MEDICINE': 'issued',
      'PAID': 'pending_pharmacy',
      'PREPARING': 'dispensing',
      'COMPLETED': 'dispensed'
    };
    
    if (status && statusMap[status]) {
      filter.status = statusMap[status];
    }
    
    // Lọc theo ngày cụ thể
    if (day) {
      const start = new Date(`${day}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.ngayKeDon = { $gte: start, $lt: end };
    }
    
    let orders = await DonThuoc.find(filter)
      .populate({
        path: 'hoSoKhamId',
        select: 'benhNhanId bacSiId trangThai createdAt',
        populate: [
          { path: 'benhNhanId', select: 'hoTen soDienThoai ngaySinh' },
          { path: 'bacSiId', select: 'hoTen' }
        ]
      })
      .populate({
        path: 'items.thuocId',
        select: 'gia ten_san_pham don_vi'
      })
      .sort({ createdAt: -1 })
      .limit(200);

    // Chuyển sang plain object và tính tổng tiền đơn (tongTien)
    const ordersWithTotal = orders.map(o => {
      const doc = o.toObject({ virtuals: true });
      let total = 0;
      if (Array.isArray(doc.items)) {
        doc.items.forEach(it => {
          const gia = (it.thuocId && typeof it.thuocId.gia === 'number') ? it.thuocId.gia : 0;
          const qty = typeof it.soLuong === 'number' ? it.soLuong : 0;
          total += gia * qty;
        });
      }
      doc.tongTien = total;
      return doc;
    });
    
    res.json(ordersWithTotal);
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// Thống kê số lượng theo trạng thái
// GET /api/pharmacy/stats?date=YYYY-MM-DD
router.get('/stats', async (req, res) => {
  try {
    const { date } = req.query;
    const filter = {};
    
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.ngayKeDon = { $gte: start, $lt: end };
    }
    
    const stats = {
      waiting: 0,    // trạng thái: 'issued' (chờ thanh toán)
      paid: 0,       // trạng thái: 'pending_pharmacy' (đã thanh toán)
      preparing: 0,  // trạng thái: 'dispensing' (đang chuẩn bị)
      completed: 0   // trạng thái: 'dispensed' (đã phát thuốc)
    };
    
    stats.waiting = await DonThuoc.countDocuments({ ...filter, status: 'issued' });
    stats.paid = await DonThuoc.countDocuments({ ...filter, status: 'pending_pharmacy' });
    stats.preparing = await DonThuoc.countDocuments({ ...filter, status: 'dispensing' });
    stats.completed = await DonThuoc.countDocuments({ ...filter, status: 'dispensed' });
    
    res.json(stats);
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// Xác nhận thanh toán đơn thuốc: chuyển từ WAITING_FOR_MEDICINE -> PAID
// PATCH /api/pharmacy/orders/:id/pay
router.patch('/orders/:id/pay', async (req, res) => {
  try {
    const { amount, note } = req.body || {};
    const don = await DonThuoc.findById(req.params.id);
    
    if (!don) return res.status(404).json({ message: 'Không tìm thấy đơn' });
    if (don.status !== 'issued') return res.status(400).json({ message: 'Đơn không ở trạng thái "Chờ thanh toán"' });
    
    don.status = 'pending_pharmacy';
    await don.save();
    
    res.json(don);
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// Bắt đầu chuẩn bị thuốc: PAID -> PREPARING
// PATCH /api/pharmacy/orders/:id/prepare
router.patch('/orders/:id/prepare', async (req, res) => {
  try {
    const don = await DonThuoc.findById(req.params.id);
    
    if (!don) return res.status(404).json({ message: 'Không tìm thấy đơn' });
    if (don.status !== 'pending_pharmacy') return res.status(400).json({ message: 'Đơn không ở trạng thái "Đã thanh toán"' });
    
    don.status = 'dispensing';
    await don.save();
    
    res.json(don);
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// Phát thuốc/Hoàn tất: PREPARING -> COMPLETED
// PATCH /api/pharmacy/orders/:id/dispense
router.patch('/orders/:id/dispense', async (req, res) => {
  try {
    const don = await DonThuoc.findById(req.params.id);
    
    if (!don) return res.status(404).json({ message: 'Không tìm thấy đơn' });
    if (don.status !== 'dispensing') return res.status(400).json({ message: 'Đơn không ở trạng thái "Chuẩn bị"' });
    
    don.status = 'dispensed';
    don.pharmacyIssuedBy = req.user._id;
    don.pharmacyIssuedAt = new Date();
    await don.save();
    
    res.json(don);
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

module.exports = router;
// Quản lý kho thuốc bên dưới

// Liệt kê kho thuốc với phân trang, tìm kiếm, sắp xếp
router.get('/inventory', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      q = '',
      sortBy = 'createdAt',
      order = 'desc',
      categoryId,
    } = req.query;

    const filter = {
      ...(q
        ? {
            $or: [
              { ten_san_pham: { $regex: q, $options: 'i' } },
              { mo_ta: { $regex: q, $options: 'i' } },
            ],
          }
        : {}),
      ...(categoryId ? { loaiThuoc: categoryId } : {}),
    };

    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      ThuocKho.find(filter).populate('loaiThuoc').sort(sort).skip(skip).limit(Number(limit)),
      ThuocKho.countDocuments(filter),
    ]);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// Tạo thuốc/kho mục mới
router.post('/inventory', async (req, res) => {
  try {
    const body = req.body || {};
    const created = await ThuocKho.create(body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: 'Không tạo được', error: err.message });
  }
});

// Cập nhật thuốc/kho mục
router.put('/inventory/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await ThuocKho.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Không cập nhật được', error: err.message });
  }
});

// Xóa thuốc/kho mục
router.delete('/inventory/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await ThuocKho.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã xóa', id });
  } catch (err) {
    res.status(400).json({ message: 'Không xóa được', error: err.message });
  }
});

// Import danh sách JSON các mục kho
router.post('/inventory/import', async (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ message: 'Payload phải là mảng JSON' });
    }

    const { categoryId } = req.query; // tùy chọn: gán danh mục cho tất cả mục

    const results = {
      total: data.length,
      inserted: 0,
      updated: 0,
      failed: 0,
      details: [], // {index, key, status, id, message}
    };

    await Promise.all(
      data.map(async (item, idx) => {
        try {
          if (!item || (!item.link && !item.ten_san_pham)) {
            results.failed += 1;
            results.details.push({ index: idx, key: null, status: 'error', id: null, message: 'Thiếu link hoặc ten_san_pham' });
            return;
          }

          // Gán danh mục đã chọn cho tất cả item nếu có
          if (categoryId) item.loaiThuoc = categoryId;

          const key = item.link ? { link: item.link } : { ten_san_pham: item.ten_san_pham };
          const existed = await ThuocKho.findOne(key).select('_id');

          if (existed) {
            await ThuocKho.updateOne({ _id: existed._id }, item, { runValidators: true });
            results.updated += 1;
            results.details.push({ index: idx, key, status: 'updated', id: String(existed._id) });
          } else {
            const created = await ThuocKho.create(item);
            results.inserted += 1;
            results.details.push({ index: idx, key, status: 'inserted', id: String(created._id) });
          }
        } catch (e) {
          results.failed += 1;
          results.details.push({ index: idx, key: item?.link || item?.ten_san_pham || null, status: 'error', id: null, message: e.message });
        }
      })
    );

    res.json({ message: 'Đã import', ...results });
  } catch (err) {
    res.status(400).json({ message: 'Import thất bại', error: err.message });
  }
});

// CRUD danh mục (loại thuốc)
router.get('/categories', async (req, res) => {
  try {
    const categories = await LoaiThuoc.find({}).sort({ ten: 1 });
    // Đếm số lượng theo danh mục
    const counts = await ThuocKho.aggregate([
      { $group: { _id: '$loaiThuoc', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    const result = categories.map((c) => ({
      _id: c._id,
      ten: c.ten,
      mo_ta: c.mo_ta,
      count: countMap.get(String(c._id)) || 0,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const c = await LoaiThuoc.create({ ten: req.body.ten, mo_ta: req.body.mo_ta });
    res.status(201).json(c);
  } catch (err) {
    res.status(400).json({ message: 'Không tạo được', error: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const c = await LoaiThuoc.findByIdAndUpdate(req.params.id, { ten: req.body.ten, mo_ta: req.body.mo_ta }, { new: true, runValidators: true });
    if (!c) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(c);
  } catch (err) {
    res.status(400).json({ message: 'Không cập nhật được', error: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    // Tùy chọn: ngăn xóa nếu còn thuốc liên kết với danh mục
    const cnt = await ThuocKho.countDocuments({ loaiThuoc: req.params.id });
    if (cnt > 0) return res.status(400).json({ message: 'Không thể xóa: còn thuốc thuộc loại này' });
    await LoaiThuoc.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(400).json({ message: 'Không xóa được', error: err.message });
  }
});

// Import vào một danh mục cụ thể
router.post('/categories/:id/import', async (req, res) => {
  req.query.categoryId = req.params.id;
  return router.handle({ ...req, method: 'POST', url: '/inventory/import' }, res, () => {});
});
