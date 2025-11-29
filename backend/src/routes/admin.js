// Router quản trị tổng quan hệ thống
const express = require('express');
// Model người dùng (User) để thống kê số lượng và người dùng đang online theo vai trò
const User = require('../models/User');
// Model Bệnh Nhân để lấy danh sách bệnh nhân mới tạo gần đây
const BenhNhan = require('../models/BenhNhan');
// Model Thanh Toán để tổng hợp doanh thu theo ngày
const ThanhToan = require('../models/ThanhToan');
// Model Lịch Khám để thống kê đặt lịch
const LichKham = require('../models/LichKham');

const router = express.Router();

// GET /api/admin/overview
// Mô tả: Trả về dữ liệu tổng quan cho màn hình Admin bao gồm:
// - Tổng số người dùng (usersCount)
// - Tổng số bệnh nhân (patientsCount)
// - Danh sách bệnh nhân tạo gần đây (latestPatients)
// - Số người dùng online theo vai trò (onlineByRole)
// - Biểu đồ doanh thu 14 ngày gần nhất (revenue)
router.get('/overview', async (req, res, next) => {
  try {
    // Cửa sổ thời gian xét "đang online": người dùng hoạt động trong 10 phút gần nhất
    const onlineWindowMinutes = 10; // xem người dùng hoạt động trong 10 phút là online
    const since = new Date(Date.now() - onlineWindowMinutes * 60 * 1000);

    const [usersCount, patientsCount, latestBenhNhan, onlineCounts] = await Promise.all([
      // Đếm tổng số người dùng
      User.countDocuments({}),
      // Đếm tổng số bệnh nhân
      BenhNhan.countDocuments({}),
      // Lấy 8 bệnh nhân mới nhất, chỉ chọn các trường cần hiển thị
      BenhNhan.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .select('hoTen gioiTinh ngaySinh createdAt'),
      // Tổng hợp số người dùng đang online theo vai trò dựa trên trường lastActive
      User.aggregate([
        { $match: { lastActive: { $gte: since } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
    ]);

    // Chuyển đổi dữ liệu bệnh nhân sang định dạng frontend mong muốn
    const latestPatients = latestBenhNhan.map((p) => ({
      _id: p._id,
      fullName: p.hoTen,
      gender: p.gioiTinh,
      dob: p.ngaySinh,
      createdAt: p.createdAt,
    }));

    // Khởi tạo bộ đếm online theo vai trò: user, doctor, admin
    const onlineByRole = { user: 0, doctor: 0, admin: 0 };
    for (const o of onlineCounts) {
      if (o?._id && onlineByRole.hasOwnProperty(o._id)) onlineByRole[o._id] = o.count;
    }

    // Doanh thu theo ngày: tổng hợp 14 ngày gần nhất, cộng dồn trường soTien theo từng ngày
    const days = 14;
    const from = new Date(); from.setHours(0,0,0,0); from.setDate(from.getDate() - (days - 1));
    const revenueAgg = await ThanhToan.aggregate([
      { $match: { ngayThanhToan: { $gte: from } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$ngayThanhToan' } },
          total: { $sum: '$soTien' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const revenueMap = new Map(revenueAgg.map(r => [r._id, r.total]));
    const revenue = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(from); d.setDate(from.getDate() + i);
      const key = d.toISOString().slice(0,10);
      revenue.push({ date: key, total: revenueMap.get(key) || 0 });
    }

    return res.json({
      usersCount,
      patientsCount,
      latestPatients,
      onlineByRole,
      revenue,
    });
  } catch (err) {
    // Chuyển lỗi cho middleware xử lý lỗi chung
    return next(err);
  }
});

// GET /api/admin/booking-stats
// Thống kê người dùng đặt lịch:
// Query params:
// - year: năm (mặc định: năm hiện tại)
// - month: tháng (1-12, tùy chọn). Nếu có -> trả về thêm mảng days.
// - top: số lượng top người dùng đặt lịch nhiều nhất (mặc định 10)
// Trả về:
// {
//   year, month?,
//   totalBookings, uniqueUsers,
//   statusBreakdown: { cho_thanh_toan, da_thanh_toan, da_kham },
//   monthly: [ { month, count } ] (khi không truyền month)
//   days: [ { day, count } ] (khi truyền month)
//   topUsers: [ { userId, count, name, email } ],
//   profileUsage: { withPatientProfile, withBenhNhan },
// }
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

    // Pipeline chung để lấy số liệu tổng hợp theo khoảng thời gian
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
