// Reception-specific routes (tiếp tân)
const express = require('express');
const LichKham = require('../models/LichKham');
const DonThuoc = require('../models/DonThuoc');

const router = express.Router();

// GET /api/reception/booking-stats
// Thống kê đặt lịch cho tiếp tân (quyền reception hoặc admin)
router.get('/booking-stats', async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const monthRaw = req.query.month;
    const month = monthRaw ? parseInt(monthRaw, 10) : null; // 1-12
    const top = Math.min(Math.max(parseInt(req.query.top, 10) || 10, 1), 50);

    if (month && (month < 1 || month > 12)) {
      return res.status(400).json({ message: 'Tháng không hợp lệ (1-12).' });
    }

    const start = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    const end = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);

    const facets = {
      totals: [
        { $group: { _id: null, total: { $sum: 1 }, users: { $addToSet: '$nguoiDatId' } } },
        { $project: { _id: 0, total: 1, uniqueUsers: { $size: '$users' } } },
      ],
      status: [
        { $group: { _id: '$trangThai', count: { $sum: 1 } } },
      ],
      profileUsage: [
        { $group: { _id: null,
          withPatientProfile: { $sum: { $cond: [{ $ifNull: ['$hoSoBenhNhanId', false] }, 1, 0] } },
          withBenhNhan: { $sum: { $cond: [{ $ifNull: ['$benhNhanId', false] }, 1, 0] } }
        } },
        { $project: { _id: 0, withPatientProfile: 1, withBenhNhan: 1 } }
      ],
      topUsers: [
        { $group: { _id: '$nguoiDatId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: top },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, userId: '$_id', count: 1, name: '$user.name', email: '$user.email' } },
      ],
    };

    if (month) {
      facets.days = [
        { $group: { _id: { day: { $dayOfMonth: '$ngayKham' } }, count: { $sum: 1 } } },
        { $project: { _id: 0, day: '$_id.day', count: 1 } },
        { $sort: { day: 1 } }
      ];
    } else {
      facets.monthly = [
        { $group: { _id: { month: { $month: '$ngayKham' } }, count: { $sum: 1 } } },
        { $project: { _id: 0, month: '$_id.month', count: 1 } },
        { $sort: { month: 1 } }
      ];
    }

    const agg = await LichKham.aggregate([
      { $match: { ngayKham: { $gte: start, $lt: end } } },
      { $facet: facets }
    ]);

    const data = agg[0] || {};
    const totals = data.totals && data.totals[0] ? data.totals[0] : { total: 0, uniqueUsers: 0 };
    const statusBreakdown = {};
    (data.status || []).forEach(s => { statusBreakdown[s._id] = s.count; });

    return res.json({
      year,
      month: month || undefined,
      totalBookings: totals.total,
      uniqueUsers: totals.uniqueUsers,
      statusBreakdown,
      monthly: data.monthly || undefined,
      days: data.days || undefined,
      topUsers: data.topUsers || [],
      profileUsage: (data.profileUsage && data.profileUsage[0]) || { withPatientProfile: 0, withBenhNhan: 0 },
      period: { from: start.toISOString(), to: end.toISOString() }
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

// Reception view of pharmacy daily revenue
// GET /api/reception/pharmacy-stats?year=YYYY&month=MM
router.get('/pharmacy-stats', async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const monthRaw = req.query.month;
    const month = monthRaw ? parseInt(monthRaw, 10) : now.getMonth() + 1;
    if (month < 1 || month > 12) {
      return res.status(400).json({ message: 'Tháng không hợp lệ (1-12).' });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    // Only include orders after payment workflow
    const statuses = ['pending_pharmacy', 'dispensing', 'dispensed'];

    const agg = await DonThuoc.aggregate([
      { $match: { ngayKeDon: { $gte: start, $lt: end }, status: { $in: statuses } } },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'thuockhos', localField: 'items.thuocId', foreignField: '_id', as: 'med' } },
      { $unwind: { path: '$med', preserveNullAndEmptyArrays: true } },
      { $project: {
          day: { $dayOfMonth: '$ngayKeDon' },
          amount: { $multiply: [ { $ifNull: ['$items.soLuong', 0] }, { $ifNull: ['$med.gia', 0] } ] }
        }
      },
      { $group: { _id: '$day', labRevenue: { $sum: '$amount' } } },
      { $project: { _id: 0, day: '$_id', labRevenue: 1 } },
      { $sort: { day: 1 } }
    ]);

    // Normalize to every day in month present
    const daysInMonth = new Date(year, month, 0).getDate();
    const map = new Map(agg.map(x => [x.day, x.labRevenue]));
    const days = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, labRevenue: map.get(i + 1) || 0 }));

    return res.json({ year, month, days, period: { from: start.toISOString(), to: end.toISOString() } });
  } catch (err) { return next(err); }
});
