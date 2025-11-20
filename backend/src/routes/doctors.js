const express = require('express');
const mongoose = require('mongoose');
const BacSi = require('../models/BacSi');
const PhongKham = require('../models/PhongKham');
const User = require('../models/User');

const router = express.Router();

// List doctors with pagination/search/filter
// GET /api/doctors?page=1&limit=10&q=&chuyenKhoa=&phongKhamId=
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
    const skip = (page - 1) * limit;
    const q = (req.query.q || '').trim();
    const chuyenKhoa = (req.query.chuyenKhoa || '').trim();
    const phongKhamId = (req.query.phongKhamId || '').trim();

    const filter = {};
    if (q) filter.hoTen = { $regex: q, $options: 'i' };
    if (chuyenKhoa) filter.chuyenKhoa = { $regex: chuyenKhoa, $options: 'i' };
    if (phongKhamId) filter.phongKhamId = phongKhamId;

    const [items, total] = await Promise.all([
      BacSi.find(filter)
        .populate('phongKhamId', 'tenPhong chuyenKhoa')
        .populate('userId', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BacSi.countDocuments(filter),
    ]);

    return res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    return next(err);
  }
});

// Create doctor
// POST /api/doctors
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.hoTen || !body.chuyenKhoa || !body.phongKhamId) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }
    if (!mongoose.isValidObjectId(body.phongKhamId)) {
      return res.status(400).json({ message: 'phongKhamId không hợp lệ' });
    }
    // Ensure clinic exists
    const pk = await PhongKham.findById(body.phongKhamId);
    if (!pk) return res.status(400).json({ message: 'Phòng khám không tồn tại' });

    try {
      const bs = await BacSi.create(body);
      return res.status(201).json(bs);
    } catch (err) {
      // Duplicate key (email, maSo, userId)
      if (err.code === 11000) {
        const dupFields = Object.keys(err.keyPattern || {});
        return res.status(409).json({ message: `Giá trị đã tồn tại ở trường: ${dupFields.join(', ')}` });
      }
      if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
      }
      throw err; // Let global handler log unexpected
    }
  } catch (err) {
    return next(err);
  }
});

// Get by id
router.get('/:id', async (req, res, next) => {
  try {
    const bs = await BacSi.findById(req.params.id).populate('phongKhamId', 'tenPhong chuyenKhoa').populate('userId', 'email role');
    if (!bs) return res.status(404).json({ message: 'Không tìm thấy' });
    return res.json(bs);
  } catch (err) { return next(err); }
});

// Update
router.put('/:id', async (req, res, next) => {
  try {
    const body = req.body || {};
    const bs = await BacSi.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!bs) return res.status(404).json({ message: 'Không tìm thấy' });
    return res.json(bs);
  } catch (err) { return next(err); }
});

// Delete
router.delete('/:id', async (req, res, next) => {
  try {
    const bs = await BacSi.findByIdAndDelete(req.params.id);
    if (!bs) return res.status(404).json({ message: 'Không tìm thấy' });
    return res.json({ message: 'Đã xóa' });
  } catch (err) { return next(err); }
});

// Provision user account for doctor using doctor's email and default password
// POST /api/doctors/:id/provision-account
router.post('/:id/provision-account', async (req, res, next) => {
  try {
    const bs = await BacSi.findById(req.params.id);
    if (!bs) return res.status(404).json({ message: 'Không tìm thấy bác sĩ' });
    if (bs.userId) return res.status(400).json({ message: 'Bác sĩ đã có tài khoản' });
    if (!bs.email) return res.status(400).json({ message: 'Bác sĩ chưa có email. Vui lòng cập nhật email trước khi cấp tài khoản.' });

    const email = bs.email; // BacSi schema lowercases email
    const password = '123456';

    // Ensure email is not already used
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email đã tồn tại' });

    const user = await User.create({ name: bs.hoTen, email, password, role: 'doctor' });
    bs.userId = user._id;
    await bs.save();

    return res.status(201).json({ message: 'Đã cấp tài khoản mặc định (mật khẩu: 123456)', user: { id: user._id, email: user.email, role: user.role }, bacSiId: bs._id });
  } catch (err) { return next(err); }
});

module.exports = router;
