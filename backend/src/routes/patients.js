const express = require('express');
const Patient = require('../models/BenhNhan');
const PatientProfile = require('../models/PatientProfile');

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
