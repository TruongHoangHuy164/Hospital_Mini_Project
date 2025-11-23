const express = require('express');
const DichVu = require('../models/DichVu');

const router = express.Router();

// List services (optional filter by chuyenKhoaId)
router.get('/', async (req, res, next) => {
  try{
    const q = (req.query.q || '').trim();
    const { chuyenKhoaId } = req.query;
    const filter = { ...(q ? { ten: { $regex: q, $options: 'i' } } : {}), ...(chuyenKhoaId ? { chuyenKhoaId } : {}) };
    const items = await DichVu.find(filter).populate('chuyenKhoaId','ten').sort({ ten: 1 });
    res.json(items);
  }catch(err){ next(err); }
});

// Create service (admin only)
router.post('/', async (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try{
    const { ten, moTa, active = true, chuyenKhoaId, gia } = req.body || {};
    if(!ten) return res.status(400).json({ message: 'Thiếu tên dịch vụ' });
    if(!chuyenKhoaId) return res.status(400).json({ message: 'Thiếu chuyenKhoaId' });
    const payload = { ten, moTa, active, chuyenKhoaId };
    if (typeof gia === 'number' && gia >= 0) payload.gia = gia;
    const created = await DichVu.create(payload);
    res.status(201).json(created);
  }catch(err){ next(err); }
});

// Update service (admin only)
router.put('/:id', async (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try{
    const { ten, moTa, active, chuyenKhoaId, gia } = req.body || {};
    const update = { ten, moTa, active, ...(chuyenKhoaId? { chuyenKhoaId } : {}) };
    if (typeof gia === 'number' && gia >= 0) update.gia = gia;
    const updated = await DichVu.findByIdAndUpdate(req.params.id, update, { new: true });
    if(!updated) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(updated);
  }catch(err){ next(err); }
});

// Delete service (admin only)
router.delete('/:id', async (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try{
    const deleted = await DichVu.findByIdAndDelete(req.params.id);
    if(!deleted) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã xóa' });
  }catch(err){ next(err); }
});

module.exports = router;
