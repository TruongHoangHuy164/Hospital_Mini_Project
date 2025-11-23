const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const DonThuoc = require('../models/DonThuoc');
const CapThuoc = require('../models/CapThuoc');
const ThuocKho = require('../models/ThuocKho');
const LoaiThuoc = require('../models/LoaiThuoc');

// All endpoints require authentication and pharmacy role
router.use(auth);
router.use(authorize('pharmacy', 'admin'));

// Get prescriptions pending for pharmacy
router.get('/prescriptions', async (req, res) => {
  try {
    const list = await DonThuoc.find({ status: { $in: ['issued', 'pending_pharmacy', 'dispensing'] } })
      .populate('hoSoKhamId')
      .sort({ createdAt: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// Dispense a prescription: mark as dispensed and optionally create CapThuoc records
router.post('/prescriptions/:id/dispense', async (req, res) => {
  try {
    const id = req.params.id;
    const don = await DonThuoc.findById(id);
    if (!don) return res.status(404).json({ message: 'Không tìm thấy đơn' });

    if (don.status === 'dispensed') return res.status(400).json({ message: 'Đơn đã được phát' });

    // Mark as dispensed
    don.status = 'dispensed';
    don.pharmacyIssuedBy = req.user._id;
    don.pharmacyIssuedAt = new Date();
    await don.save();

    // Optionally, create CapThuoc records from items if provided
    if (don.items && don.items.length) {
      const caps = await Promise.all(
        don.items.map(async (it) => {
          try {
            const cap = await CapThuoc.create({ donThuocId: don._id, thuocId: it.thuocId, soLuong: it.soLuong || it.quantity || 1 });
            return cap;
          } catch (e) {
            return null;
          }
        })
      );
    }

    res.json({ message: 'Đã đánh dấu là đã phát', don });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

module.exports = router;
// Inventory management below

// List inventory with pagination, search, sort
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

// Create a new item
router.post('/inventory', async (req, res) => {
  try {
    const body = req.body || {};
    const created = await ThuocKho.create(body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: 'Không tạo được', error: err.message });
  }
});

// Update an item
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

// Delete an item
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

// Import JSON array of items
router.post('/inventory/import', async (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ message: 'Payload phải là mảng JSON' });
    }

    const { categoryId } = req.query; // optional assign category id

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

          // Assign selected category for all items if provided
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

// Categories CRUD
router.get('/categories', async (req, res) => {
  try {
    const categories = await LoaiThuoc.find({}).sort({ ten: 1 });
    // counts
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
    // Optional: prevent delete if there are medicines linked
    const cnt = await ThuocKho.countDocuments({ loaiThuoc: req.params.id });
    if (cnt > 0) return res.status(400).json({ message: 'Không thể xóa: còn thuốc thuộc loại này' });
    await LoaiThuoc.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(400).json({ message: 'Không xóa được', error: err.message });
  }
});

// Import into a specific category
router.post('/categories/:id/import', async (req, res) => {
  req.query.categoryId = req.params.id;
  return router.handle({ ...req, method: 'POST', url: '/inventory/import' }, res, () => {});
});
