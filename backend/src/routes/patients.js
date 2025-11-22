const express = require('express');
const Patient = require('../models/BenhNhan');
const PatientProfile = require('../models/PatientProfile');
const User = require('../models/User');

const router = express.Router();

// Simple role check: allow admin or reception (adjust to your auth schema)
function requireReceptionOrAdmin(req, res, next){
  if(!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if(req.user.role === 'admin' || req.user.role === 'reception') return next();
  return res.status(403).json({ message: 'Forbidden' });
}

// GET /api/patients/search?q=...&limit=20
router.get('/search', requireReceptionOrAdmin, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(200, parseInt(req.query.limit,10) || 50);
    if(!q) return res.json([]);
    const or = [];
    if(/^[0-9]+$/.test(q)) {
      or.push({ soDienThoai: q }, { maBHYT: q });
    }
  or.push({ soDienThoai: { $regex: q, $options: 'i' } });
  or.push({ hoTen: { $regex: q, $options: 'i' } });
  or.push({ maBHYT: { $regex: q, $options: 'i' } });
  or.push({ diaChi: { $regex: q, $options: 'i' } });

    const docs = await Patient.find({ $or: or })
      .select('hoTen ngaySinh soDienThoai maBHYT diaChi userId _id')
      .limit(limit)
      .sort({ hoTen: 1 })
      .lean();

    // Also search PatientProfile (profiles created by users) so receptionist can find profiles
    const profileOr = [];
    if(/^[0-9]+$/.test(q)) {
      profileOr.push({ soDienThoai: q }, { maHoSo: q });
    }
    profileOr.push({ soDienThoai: { $regex: q, $options: 'i' } });
    profileOr.push({ hoTen: { $regex: q, $options: 'i' } });
    profileOr.push({ maHoSo: { $regex: q, $options: 'i' } });

    const profiles = await PatientProfile.find({ $or: profileOr })
      .select('maHoSo hoTen ngaySinh soDienThoai diaChi id_nguoiTao _id quanHe')
      .limit(limit)
      .sort({ hoTen: 1 })
      .lean();

    // If matched patients have associated user accounts, fetch their created profiles (người thân)
    const userIds = Array.from(new Set(docs.map(d => d.userId).filter(Boolean)));
    let profilesByUser = {};
    if (userIds.length > 0) {
      const profiles = await PatientProfile.find({ id_nguoiTao: { $in: userIds } })
        .select('maHoSo hoTen ngaySinh soDienThoai quanHe diaChi _id id_nguoiTao')
        .lean();
      profilesByUser = profiles.reduce((acc, p) => {
        const key = String(p.id_nguoiTao);
        acc[key] = acc[key] || [];
        acc[key].push(p);
        return acc;
      }, {});
    }

    // attach relatives array to each patient result
    const results = docs.map(d => ({
      ...d,
      _type: 'benhNhan',
      relatives: d.userId ? (profilesByUser[String(d.userId)] || []) : [],
    }));

    // Map profiles as search results too, mark type so frontend can link to hoSoBenhNhanId
    const profileResults = profiles.map(p => ({
      _id: p._id,
      hoTen: p.hoTen,
      ngaySinh: p.ngaySinh,
      soDienThoai: p.soDienThoai,
      diaChi: p.diaChi,
      maHoSo: p.maHoSo,
      id_nguoiTao: p.id_nguoiTao,
      quanHe: p.quanHe,
      _type: 'profile'
    }));

    // Combine results: prefer benhNhan matches first, then profiles (dedupe by name+phone)
    const combined = [...results];
    // Simple dedupe: avoid adding a profile if there's already a benhNhan with same phone or name
    const seen = new Set(results.map(r => `${r.soDienThoai || ''}::${(r.hoTen||'').toLowerCase()}`));
    for(const p of profileResults){
      const key = `${p.soDienThoai || ''}::${(p.hoTen||'').toLowerCase()}`;
      if(!seen.has(key)) { combined.push(p); seen.add(key); }
    }

    res.json(combined);
  } catch(err){ next(err); }
});

// GET /api/patients/user-by-contact?contact=...
// Check if a user account exists by phone or email and return related info
router.get('/user-by-contact', requireReceptionOrAdmin, async (req, res, next) => {
  try {
    let { contact } = req.query || {};
    if (!contact) return res.status(400).json({ message: 'Thiếu thông tin liên lạc (SĐT hoặc email)' });
    
    const contactTrim = String(contact).trim();
    let user = null;
    
    // Check if it's an email or phone
    if (contactTrim.includes('@')) {
      // Search by email
      user = await User.findOne({ email: contactTrim.toLowerCase() }).select('-password -resetPasswordToken -resetPasswordExpires -refreshTokenIds');
    } else {
      // Search by phone
      const phoneNorm = contactTrim.replace(/[^0-9+]/g, '');
      if (!phoneNorm) return res.status(400).json({ message: 'Số điện thoại hoặc email không hợp lệ' });
      user = await User.findOne({ phone: phoneNorm }).select('-password -resetPasswordToken -resetPasswordExpires -refreshTokenIds');
    }
    
    if (!user) {
      return res.json({ exists: false, user: null, selfPatient: null, relatives: [] });
    }

    const selfPatient = await Patient.findOne({ userId: user._id }).lean();
    const relatives = await PatientProfile.find({ id_nguoiTao: user._id })
      .select('maHoSo hoTen ngaySinh soDienThoai quanHe diaChi _id id_nguoiTao')
      .lean();

    return res.json({ exists: true, user, selfPatient, relatives });
  } catch (err) { next(err); }
});

// POST /api/patients/provision-user { name?, phone?, email? }
// Create a basic user account for the provided phone or email with default password and a basic Patient (self) if missing
router.post('/provision-user', requireReceptionOrAdmin, async (req, res, next) => {
  try {
    const { name, phone, email } = req.body || {};
    if (!phone && !email) return res.status(400).json({ message: 'Thiếu phone hoặc email' });
    
    let user = null;
    let phoneNorm = null;
    let emailNorm = null;
    
    if (email) {
      emailNorm = String(email).toLowerCase().trim();
      user = await User.findOne({ email: emailNorm });
    }
    
    if (!user && phone) {
      phoneNorm = String(phone).replace(/[^0-9+]/g, '');
      if (phoneNorm) {
        user = await User.findOne({ phone: phoneNorm });
      }
    }
    
    if (!user) {
      // Create user with default password
      const displayName = (name && String(name).trim()) || `Khách ${phoneNorm || emailNorm}`;
      const userData = { name: displayName, password: '123456', role: 'user' };
      if (emailNorm) userData.email = emailNorm;
      if (phoneNorm) userData.phone = phoneNorm;
      
      user = await User.create(userData);
    }

    // Ensure a basic Patient (self) exists
    let selfPatient = await Patient.findOne({ userId: user._id });
    if (!selfPatient) {
      selfPatient = await Patient.create({ 
        userId: user._id, 
        hoTen: user.name || 'Chưa cập nhật', 
        gioiTinh: 'khac', 
        soDienThoai: phoneNorm || '' 
      });
    }

    const userSafe = await User.findById(user._id).select('-password -resetPasswordToken -resetPasswordExpires -refreshTokenIds');
    return res.status(201).json({ message: 'Đã cấp tài khoản', user: userSafe, selfPatient });
  } catch (err) {
    // Handle duplicate phone/email gracefully
    if (err && err.code === 11000) {
      const field = err.message.includes('email') ? 'Email' : 'Số điện thoại';
      return res.status(409).json({ message: `${field} đã tồn tại` });
    }
    return next(err);
  }
});

// POST /api/patients/:userId/profiles - create a PatientProfile on behalf of a user
router.post('/:userId/profiles', requireReceptionOrAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      hoTen,
      ngaySinh,
      gioiTinh,
      soDienThoai,
      email,
      cccd,
      hoChieu,
      quocGia,
      danToc,
      ngheNghiep,
      tinhThanh,
      quanHuyen,
      phuongXa,
      diaChi,
      quanHe,
    } = req.body || {};

    if (!hoTen || !ngaySinh || !gioiTinh || !soDienThoai || !quanHe) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    const exists = await User.findById(userId).select('_id');
    if (!exists) return res.status(404).json({ message: 'User không tồn tại' });

    const profile = await PatientProfile.create({
      id_nguoiTao: userId,
      hoTen,
      ngaySinh,
      gioiTinh,
      soDienThoai,
      email,
      cccd,
      hoChieu,
      quocGia,
      danToc,
      ngheNghiep,
      tinhThanh,
      quanHuyen,
      phuongXa,
      diaChi,
      quanHe,
    });

    return res.status(201).json(profile);
  } catch (err) { next(err); }
});

// GET /api/patients/:id
router.get('/:id', requireReceptionOrAdmin, async (req, res, next) => {
  try {
    const doc = await Patient.findById(req.params.id).select('-__v').lean();
    if(!doc) return res.status(404).json({ message: 'Không tìm thấy bệnh nhân' });

    // fetch relatives (PatientProfile) when possible
    if (doc.userId) {
      const relatives = await PatientProfile.find({ id_nguoiTao: doc.userId })
        .select('maHoSo hoTen ngaySinh soDienThoai quanHe diaChi _id id_nguoiTao')
        .lean();
      doc.relatives = relatives;
    } else {
      doc.relatives = [];
    }

    res.json(doc);
  } catch(err){ next(err); }
});

module.exports = router;
