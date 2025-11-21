const express = require('express');
const DichVu = require('../models/DichVu');
const ChuyenKhoa = require('../models/ChuyenKhoa');

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
    const items = await ChuyenKhoa.find().sort({ ten: 1 });
    res.json(items);
  }catch(err){ next(err); }
});

module.exports = router;

// Public: list doctors (basic info) for selection in UI
// GET /api/public/doctors?q=&limit=20
router.get('/doctors', async (req, res, next) => {
  try{
    const BacSi = require('../models/BacSi');
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit||'50',10), 200);
    const filter = {};
    if(q) filter.hoTen = { $regex: q, $options: 'i' };
    const items = await BacSi.find(filter).select('hoTen chuyenKhoa phongKhamId userId').limit(limit).sort({ hoTen: 1 });
    res.json(items);
  }catch(err){ next(err); }
});
