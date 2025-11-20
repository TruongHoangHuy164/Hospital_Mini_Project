const express = require('express');
const Staff = require('../models/Staff');
const PhongKham = require('../models/PhongKham');
const User = require('../models/User');

const router = express.Router();

// GET /api/staff?vaiTro=reception|lab&q=&phongKhamId=&page=&limit=
router.get('/', async (req, res, next) => {
  try{
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
    const skip = (page - 1) * limit;
    const q = (req.query.q || '').trim();
    const vaiTro = (req.query.vaiTro || '').trim();
    const phongKhamId = (req.query.phongKhamId || '').trim();
    const filter = {};
    if (q) filter.hoTen = { $regex: q, $options: 'i' };
    if (vaiTro) filter.vaiTro = vaiTro;
    if (phongKhamId) filter.phongKhamId = phongKhamId;
    const [items, total] = await Promise.all([
      Staff.find(filter)
        .populate('phongKhamId','tenPhong chuyenKhoa')
        .populate('userId','email role')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Staff.countDocuments(filter)
    ]);
    res.json({ items, total, page, limit, totalPages: Math.ceil(total/limit) });
  }catch(err){ return next(err); }
});

// POST /api/staff
router.post('/', async (req, res, next) => {
  try{
    const body = req.body || {};
    if(!body.hoTen || !body.vaiTro){ return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' }); }
  if(!['reception','lab','cashier','nurse','pharmacy'].includes(body.vaiTro)) return res.status(400).json({ message: 'vaiTro không hợp lệ' });
    if(body.phongKhamId){ const pk = await PhongKham.findById(body.phongKhamId); if(!pk) return res.status(400).json({ message: 'Phòng khám không tồn tại' }); }
    const st = await Staff.create(body);
    res.status(201).json(st);
  }catch(err){ return next(err); }
});

// GET /api/staff/:id
router.get('/:id', async (req, res, next) => {
  try{
    const st = await Staff.findById(req.params.id).populate('phongKhamId','tenPhong').populate('userId','email role');
    if(!st) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(st);
  }catch(err){ return next(err); }
});

// PUT /api/staff/:id
router.put('/:id', async (req, res, next) => {
  try{
    const st = await Staff.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
    if(!st) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(st);
  }catch(err){ return next(err); }
});

// DELETE /api/staff/:id
router.delete('/:id', async (req, res, next) => {
  try{
    const st = await Staff.findByIdAndDelete(req.params.id);
    if(!st) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã xóa' });
  }catch(err){ return next(err); }
});

// POST /api/staff/:id/provision-account - cấp tài khoản theo email như bác sĩ
router.post('/:id/provision-account', async (req, res, next) => {
  try{
    const st = await Staff.findById(req.params.id);
    if(!st) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    if(st.userId) return res.status(400).json({ message: 'Nhân viên đã có tài khoản' });
    if(!st.email) return res.status(400).json({ message: 'Nhân viên chưa có email' });

    const email = st.email;
    const password = '123456';

    const exists = await User.findOne({ email });
    if(exists) return res.status(400).json({ message: 'Email đã tồn tại' });

  const allowedMap = { reception: 'reception', lab: 'lab', cashier: 'cashier', nurse: 'nurse', pharmacy: 'pharmacy' };
  const role = allowedMap[st.vaiTro] || 'reception';
    const user = await User.create({ name: st.hoTen, email, password, role });
    st.userId = user._id;
    await st.save();

    res.status(201).json({ message: 'Đã cấp tài khoản (mật khẩu: 123456)', user: { id: user._id, email: user.email, role: user.role }, staffId: st._id });
  }catch(err){ return next(err); }
});

module.exports = router;
