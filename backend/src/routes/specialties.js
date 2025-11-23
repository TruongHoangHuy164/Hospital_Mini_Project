const express = require('express');
const ChuyenKhoa = require('../models/ChuyenKhoa');

const router = express.Router();

// List specialties with pagination/search
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 200);
    const skip = (page - 1) * limit;
    const q = (req.query.q || '').trim();
    const filter = q ? { ten: { $regex: q, $options: 'i' } } : {};
    const [items, total] = await Promise.all([
      ChuyenKhoa.find(filter).sort({ ten: 1 }).skip(skip).limit(limit),
      ChuyenKhoa.countDocuments(filter)
    ]);
    res.json({ items, total, page, limit, totalPages: Math.ceil(total/limit) });
  } catch (err) { next(err); }
});

// Create (admin only)
router.post('/', async (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const { ten, moTa } = req.body || {};
    if (!ten) return res.status(400).json({ message: 'Thiếu tên chuyên khoa' });
    const created = await ChuyenKhoa.create({ ten, moTa });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// Update (admin only)
router.put('/:id', async (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const { ten, moTa } = req.body || {};
    const updated = await ChuyenKhoa.findByIdAndUpdate(req.params.id, { ten, moTa }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(updated);
  } catch (err) { next(err); }
});

// Delete (admin only)
router.delete('/:id', async (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const deleted = await ChuyenKhoa.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã xóa' });
  } catch (err) { next(err); }
});

module.exports = router;
