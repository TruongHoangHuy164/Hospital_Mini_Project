// Các route dành cho bộ phận lễ tân (reception)
const express = require('express');
const LichKham = require('../models/LichKham');
const DonThuoc = require('../models/DonThuoc');

const router = express.Router();

// ===== Tóm tắt API Lễ tân (reception) =====
// Lưu ý quyền hạn: Dành cho 'reception' hoặc 'admin' (tùy cấu hình middleware chung).
//
// - GET  /api/reception/booking-stats   : Thống kê đặt lịch theo năm/tháng
//   + Tham số: year (YYYY), month (1-12, tùy chọn), top (số user đặt lịch nhiều nhất)
//   + Trả về: tổng số lịch, số người dùng duy nhất, breakdown theo trạng thái,
//             biểu đồ theo tháng hoặc theo ngày, topUsers, tỉ lệ dùng PatientProfile/BenhNhan, và khoảng thời gian thống kê
//
// - GET  /api/reception/pharmacy-stats  : Thống kê doanh thu quầy thuốc theo ngày trong 1 tháng
//   + Tham số: year (YYYY), month (1-12)
//   + Trả về: mảng days [{day, labRevenue}], period (from/to)

// GET /api/reception/booking-stats
// Thống kê đặt lịch cho lễ tân (chỉ dành cho quyền 'reception' hoặc 'admin')
router.get('/booking-stats', async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const monthRaw = req.query.month;
    const month = monthRaw ? parseInt(monthRaw, 10) : null; // Giá trị 1-12
    const top = Math.min(Math.max(parseInt(req.query.top, 10) || 10, 1), 50);

    if (month && (month < 1 || month > 12)) {
      return res.status(400).json({ message: 'Tháng không hợp lệ (1-12).' });
    }

    // Xác định khoảng thời gian thống kê theo tháng hoặc cả năm
    const start = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    const end = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);

    // Các nhánh thống kê (facets) cho aggregate
    const facets = {
      totals: [
        { $group: { _id: null, total: { $sum: 1 }, users: { $addToSet: '$nguoiDatId' } } },
        { $project: { _id: 0, total: 1, uniqueUsers: { $size: '$users' } } },
      ],
      status: [
        // Đếm số lượng theo trạng thái đặt lịch
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
        // Chú ý: $lookup theo _id của user, đảm bảo index _id tồn tại
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, userId: '$_id', count: 1, name: '$user.name', email: '$user.email' } },
      ],
    };

    if (month) {
      // Nếu lọc theo tháng: thống kê theo ngày trong tháng
      facets.days = [
        { $group: { _id: { day: { $dayOfMonth: '$ngayKham' } }, count: { $sum: 1 } } },
        { $project: { _id: 0, day: '$_id.day', count: 1 } },
        { $sort: { day: 1 } }
      ];
    } else {
      // Nếu lọc theo năm: thống kê theo tháng trong năm
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

// Thống kê doanh thu quầy thuốc theo ngày (lễ tân)
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

    // Chỉ tính các đơn sau quy trình thanh toán
    const statuses = ['pending_pharmacy', 'dispensing', 'dispensed'];

    const agg = await DonThuoc.aggregate([
      { $match: { ngayKeDon: { $gte: start, $lt: end }, status: { $in: statuses } } },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } }, // Lưu ý: nếu đơn không có items, vẫn giữ để không làm mất ngày
      { $lookup: { from: 'thuockhos', localField: 'items.thuocId', foreignField: '_id', as: 'med' } }, // Cẩn thận: tên collection trong MongoDB là 'thuockhos'
      { $unwind: { path: '$med', preserveNullAndEmptyArrays: true } }, // Giữ null để tránh loại bỏ bản ghi khi thiếu thông tin thuốc
      { $project: {
          day: { $dayOfMonth: '$ngayKeDon' },
          amount: { $multiply: [ { $ifNull: ['$items.soLuong', 0] }, { $ifNull: ['$med.gia', 0] } ] }
        }
      }, // Tính doanh thu theo ngày từ số lượng * giá
      { $group: { _id: '$day', labRevenue: { $sum: '$amount' } } },
      { $project: { _id: 0, day: '$_id', labRevenue: 1 } },
      { $sort: { day: 1 } }
    ]);

    // Chuẩn hóa dữ liệu sang đủ mọi ngày có trong tháng
    const daysInMonth = new Date(year, month, 0).getDate();
    const map = new Map(agg.map(x => [x.day, x.labRevenue]));
    const days = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, labRevenue: map.get(i + 1) || 0 }));

    return res.json({ year, month, days, period: { from: start.toISOString(), to: end.toISOString() } });
  } catch (err) { return next(err); }
});
