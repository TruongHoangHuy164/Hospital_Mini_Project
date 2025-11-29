// Router báo cáo doanh thu và top dịch vụ/thuốc
const express = require('express');
const router = express.Router();
const ThanhToan = require('../models/ThanhToan');
const HoSoKham = require('../models/HoSoKham');
const BenhNhan = require('../models/BenhNhan');
const DonThuoc = require('../models/DonThuoc');
const CapThuoc = require('../models/CapThuoc');
const ThuocKho = require('../models/ThuocKho');
const CanLamSang = require('../models/CanLamSang');
const DichVu = require('../models/DichVu');

// Helper: phân tích year & month an toàn (mặc định hiện tại nếu thiếu)
function parseYear(v) { const n = parseInt(v, 10); return isNaN(n) ? new Date().getFullYear() : n; }
function parseMonth(v) { const n = parseInt(v, 10); return isNaN(n) || n < 1 || n > 12 ? (new Date().getMonth() + 1) : n; }

// GET /api/revenue/summary?year=2025
// Mô tả: Tổng hợp doanh thu theo tháng và theo nhóm (hosokham, canlamsang, donthuoc)
router.get('/summary', async (req, res) => {
  try {
    const year = parseYear(req.query.year);
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

    const pipeline = [
      { $match: { status: 'PAID', ngayThanhToan: { $gte: start, $lt: end } } },
      { $group: {
          _id: {
            month: { $month: '$ngayThanhToan' },
            category: '$targetType'
          },
          total: { $sum: '$soTien' }
        }
      },
      { $group: {
          _id: '$_id.month',
          categories: { $push: { k: '$_id.category', v: '$total' } },
          monthTotal: { $sum: '$total' }
        }
      },
      { $project: {
          _id: 0,
          month: '$_id',
          monthTotal: 1,
          categories: { $arrayToObject: '$categories' }
        }
      },
      { $sort: { month: 1 } }
    ];

    const raw = await ThanhToan.aggregate(pipeline);

    // Chuẩn hóa thành 12 tháng
    const months = Array.from({ length: 12 }, (_, i) => {
      const found = raw.find(r => r.month === i + 1);
      return found || { month: i + 1, monthTotal: 0, categories: {} };
    });

    // Tạo mảng theo nhóm để dựng biểu đồ
    const categoriesSet = new Set(['hosokham','canlamsang','donthuoc']);
    const categorySeries = {};
    categoriesSet.forEach(c => { categorySeries[c] = months.map(m => m.categories[c] || 0); });

    res.json({ year, months, categorySeries, totalSeries: months.map(m => m.monthTotal) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/revenue/month?year=2025&month=11
// Mô tả: Tổng hợp doanh thu theo ngày trong tháng, chia theo nhóm
router.get('/month', async (req, res) => {
  try {
    const year = parseYear(req.query.year);
    const month = parseMonth(req.query.month); // 1-12

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const pipeline = [
      { $match: { status: 'PAID', ngayThanhToan: { $gte: start, $lt: end } } },
      { $group: {
          _id: {
            day: { $dayOfMonth: '$ngayThanhToan' },
            category: '$targetType'
          },
          total: { $sum: '$soTien' }
        }
      },
      { $group: {
          _id: '$_id.day',
          categories: { $push: { k: '$_id.category', v: '$total' } },
          dayTotal: { $sum: '$total' }
        }
      },
      { $project: { _id: 0, day: '$_id', dayTotal: 1, categories: { $arrayToObject: '$categories' } } },
      { $sort: { day: 1 } }
    ];

    const raw = await ThanhToan.aggregate(pipeline);

    // Xác định số ngày trong tháng
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const found = raw.find(r => r.day === i + 1);
      return found || { day: i + 1, dayTotal: 0, categories: {} };
    });

    const categoriesSet = new Set(['hosokham','canlamsang','donthuoc']);
    const categorySeries = {};
    categoriesSet.forEach(c => { categorySeries[c] = days.map(d => d.categories[c] || 0); });

    res.json({ year, month, days, categorySeries, totalSeries: days.map(d => d.dayTotal) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/revenue/day?date=2025-11-29
// Mô tả: Liệt kê chi tiết thanh toán trong ngày, kèm thông tin bệnh nhân/bác sĩ
router.get('/day', async (req, res) => {
  try {
    if (!req.query.date) {
      return res.status(400).json({ message: 'date (YYYY-MM-DD) is required' });
    }
    const dateParts = req.query.date.split('-').map(Number);
    if (dateParts.length !== 3) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    const [year, month, day] = dateParts;
    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const payments = await ThanhToan.find({ status: 'PAID', ngayThanhToan: { $gte: start, $lte: end } })
      .populate({
        path: 'hoSoKhamId',
        select: 'benhNhanId bacSiId lichKhamId ngayKham',
        populate: [{ path: 'benhNhanId', select: 'ten tuoi gioiTinh' }, { path: 'bacSiId', select: 'ten' }]
      })
      .lean();

    const result = payments.map(p => ({
      id: p._id,
      amount: p.soTien,
      method: p.hinhThuc,
      category: p.targetType,
      paidAt: p.ngayThanhToan,
      patient: p.hoSoKhamId && p.hoSoKhamId.benhNhanId ? {
        id: p.hoSoKhamId.benhNhanId._id,
        name: p.hoSoKhamId.benhNhanId.ten,
        age: p.hoSoKhamId.benhNhanId.tuoi,
        gender: p.hoSoKhamId.benhNhanId.gioiTinh
      } : null,
      doctor: p.hoSoKhamId && p.hoSoKhamId.bacSiId ? {
        id: p.hoSoKhamId.bacSiId._id,
        name: p.hoSoKhamId.bacSiId.ten
      } : null
    }));

    res.json({ date: req.query.date, total: result.reduce((s,r) => s + r.amount, 0), count: result.length, payments: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

// GET /api/revenue/top/medicines?year=2025&month=11&limit=10
// Mô tả: Tổng hợp số lượng và doanh thu ước tính (soLuong * gia) cho thuốc đã phát trong khoảng thời gian.
router.get('/top/medicines', async (req, res) => {
  try {
    const year = parseYear(req.query.year);
    const monthParam = req.query.month;
    const limit = parseInt(req.query.limit || '10', 10);
    const start = monthParam ? new Date(Date.UTC(year, parseMonth(monthParam) - 1, 1, 0, 0, 0)) : new Date(Date.UTC(year, 0, 1));
    const end = monthParam ? new Date(Date.UTC(year, parseMonth(monthParam), 1, 0, 0, 0)) : new Date(Date.UTC(year + 1, 0, 1));

    // Find paid prescription payments in range
    const paidPrescriptionPayments = await ThanhToan.find({ status: 'PAID', targetType: 'donthuoc', ngayThanhToan: { $gte: start, $lt: end } }).select('hoSoKhamId').lean();
    const hoSoIds = [...new Set(paidPrescriptionPayments.map(p => p.hoSoKhamId.toString()))];

    // Find DonThuoc belonging to those hoSoKham
    const prescriptions = await DonThuoc.find({ hoSoKhamId: { $in: hoSoIds } }).select('_id items').lean();

    // Collect ThuocKho IDs and quantities
    const qtyMap = new Map(); // thuocId -> total qty
    prescriptions.forEach(pr => {
      (pr.items || []).forEach(it => {
        if (!it.thuocId || !it.soLuong) return;
        const id = it.thuocId.toString();
        qtyMap.set(id, (qtyMap.get(id) || 0) + it.soLuong);
      });
    });

    const thuocIds = Array.from(qtyMap.keys());
    const medicines = await ThuocKho.find({ _id: { $in: thuocIds } }).select('ten_san_pham gia don_vi').lean();
    const rows = medicines.map(m => {
      const qty = qtyMap.get(m._id.toString());
      return {
        id: m._id,
        name: m.ten_san_pham,
        unit: m.don_vi,
        price: m.gia,
        quantity: qty,
        estimatedRevenue: (m.gia || 0) * qty
      };
    });

    rows.sort((a,b) => b.estimatedRevenue - a.estimatedRevenue);
    res.json({ year, month: monthParam ? parseMonth(monthParam) : undefined, range: { start, end }, items: rows.slice(0, limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/revenue/top/services?year=2025&month=11&limit=10
// Mô tả: Tổng hợp số lần và doanh thu ước tính cho dịch vụ (DichVu) từ các chỉ định CanLamSang gắn với thanh toán đã trả.
router.get('/top/services', async (req, res) => {
  try {
    const year = parseYear(req.query.year);
    const monthParam = req.query.month;
    const limit = parseInt(req.query.limit || '10', 10);
    const start = monthParam ? new Date(Date.UTC(year, parseMonth(monthParam) - 1, 1, 0, 0, 0)) : new Date(Date.UTC(year, 0, 1));
    const end = monthParam ? new Date(Date.UTC(year, parseMonth(monthParam), 1, 0, 0, 0)) : new Date(Date.UTC(year + 1, 0, 1));

    // Payments for lab/services (canlamsang)
    const paidLabPayments = await ThanhToan.find({ status: 'PAID', targetType: 'canlamsang', ngayThanhToan: { $gte: start, $lt: end } }).select('hoSoKhamId').lean();
    const hoSoIds = [...new Set(paidLabPayments.map(p => p.hoSoKhamId.toString()))];

    const orders = await CanLamSang.find({ hoSoKhamId: { $in: hoSoIds } }).select('dichVuId').lean();
    const countMap = new Map();
    orders.forEach(o => { if (o.dichVuId) { const id = o.dichVuId.toString(); countMap.set(id, (countMap.get(id) || 0) + 1); } });
    const serviceIds = Array.from(countMap.keys());
    const services = await DichVu.find({ _id: { $in: serviceIds } }).select('ten gia').lean();
    const rows = services.map(s => ({
      id: s._id,
      name: s.ten,
      price: s.gia,
      count: countMap.get(s._id.toString()),
      estimatedRevenue: (s.gia || 0) * countMap.get(s._id.toString())
    }));
    rows.sort((a,b) => b.estimatedRevenue - a.estimatedRevenue);
    res.json({ year, month: monthParam ? parseMonth(monthParam) : undefined, range: { start, end }, items: rows.slice(0, limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
