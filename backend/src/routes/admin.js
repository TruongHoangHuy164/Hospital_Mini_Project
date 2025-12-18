/**
 * =========================================================
 * ADMIN OVERVIEW & STATISTICS ROUTER
 * ---------------------------------------------------------
 * Cung cấp các API phục vụ Dashboard quản trị hệ thống:
 * - Tổng quan người dùng, bệnh nhân
 * - Người dùng đang online theo vai trò
 * - Doanh thu theo ngày
 * - Thống kê đặt lịch khám
 * =========================================================
 */

const express = require('express');

/**
 * Models sử dụng cho thống kê
 */
const User = require('../models/User');             // Người dùng hệ thống
const BenhNhan = require('../models/BenhNhan');     // Bệnh nhân
const ThanhToan = require('../models/ThanhToan');   // Thanh toán
const LichKham = require('../models/LichKham');     // Lịch khám

const router = express.Router();

/**
 * =========================================================
 * GET /api/admin/overview
 * ---------------------------------------------------------
 * CHỨC NĂNG CHÍNH:
 * Trả về dữ liệu tổng quan hiển thị trên Admin Dashboard
 *
 * BAO GỒM:
 * - Tổng số người dùng
 * - Tổng số bệnh nhân
 * - Danh sách bệnh nhân tạo gần đây
 * - Số người dùng đang online theo vai trò
 * - Doanh thu trong 14 ngày gần nhất (dùng cho biểu đồ)
 * =========================================================
 */
router.get('/overview', async (req, res, next) => {
  try {
    /**
     * Định nghĩa khoảng thời gian để xác định "đang online"
     * Người dùng có lastActive trong vòng 10 phút gần nhất
     */
    const onlineWindowMinutes = 10;
    const since = new Date(Date.now() - onlineWindowMinutes * 60 * 1000);

    /**
     * Thực hiện song song các truy vấn để tối ưu hiệu năng
     */
    const [
      usersCount,
      patientsCount,
      latestBenhNhan,
      onlineCounts
    ] = await Promise.all([
      // Tổng số người dùng
      User.countDocuments({}),

      // Tổng số bệnh nhân
      BenhNhan.countDocuments({}),

      // 8 bệnh nhân mới nhất
      BenhNhan.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .select('hoTen gioiTinh ngaySinh createdAt'),

      // Thống kê người dùng đang online theo role
      User.aggregate([
        { $match: { lastActive: { $gte: since } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ])
    ]);

    /**
     * Chuẩn hóa dữ liệu bệnh nhân cho frontend
     */
    const latestPatients = latestBenhNhan.map(p => ({
      _id: p._id,
      fullName: p.hoTen,
      gender: p.gioiTinh,
      dob: p.ngaySinh,
      createdAt: p.createdAt,
    }));

    /**
     * Khởi tạo bộ đếm online theo vai trò
     */
    const onlineByRole = {
      user: 0,
      doctor: 0,
      admin: 0,
    };

    onlineCounts.forEach(o => {
      if (o?._id && onlineByRole.hasOwnProperty(o._id)) {
        onlineByRole[o._id] = o.count;
      }
    });

    /**
     * Tính doanh thu theo ngày (14 ngày gần nhất)
     */
    const days = 14;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));

    const revenueAgg = await ThanhToan.aggregate([
      { $match: { ngayThanhToan: { $gte: from } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$ngayThanhToan',
            }
          },
          total: { $sum: '$soTien' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    /**
     * Ghép dữ liệu doanh thu theo từng ngày (kể cả ngày không có doanh thu)
     */
    const revenueMap = new Map(revenueAgg.map(r => [r._id, r.total]));
    const revenue = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const key = d.toISOString().slice(0, 10);

      revenue.push({
        date: key,
        total: revenueMap.get(key) || 0,
      });
    }

    return res.json({
      usersCount,
      patientsCount,
      latestPatients,
      onlineByRole,
      revenue,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * =========================================================
 * GET /api/admin/booking-stats
 * ---------------------------------------------------------
 * CHỨC NĂNG CHÍNH:
 * Thống kê hành vi đặt lịch khám của người dùng
 *
 * QUERY PARAMS:
 * - year  : năm (mặc định năm hiện tại)
 * - month : tháng (1–12, nếu có → thống kê theo ngày)
 * - top   : số user đặt lịch nhiều nhất (tối đa 50)
 *
 * TRẢ VỀ:
 * - Tổng số lịch khám
 * - Số người dùng đặt lịch
 * - Phân loại trạng thái lịch khám
 * - Thống kê theo tháng hoặc ngày
 * - Top người dùng đặt lịch nhiều nhất
 * - Tỷ lệ dùng hồ sơ bệnh nhân
 * =========================================================
 */
router.get('/booking-stats', async (req, res, next) => {
  try {
    const now = new Date();

    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const monthRaw = req.query.month;
    const month = monthRaw ? parseInt(monthRaw, 10) : null;
    const top = Math.min(Math.max(parseInt(req.query.top, 10) || 10, 1), 50);

    if (month && (month < 1 || month > 12)) {
      return res.status(400).json({ message: 'Tháng không hợp lệ (1-12).' });
    }

    /**
     * Xác định khoảng thời gian thống kê
     */
    const start = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);

    const end = month
      ? new Date(year, month, 1)
      : new Date(year + 1, 0, 1);

    /**
     * Định nghĩa các thống kê cần gom trong $facet
     */
    const facets = {
      totals: [
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            users: { $addToSet: '$nguoiDatId' }
          }
        },
        {
          $project: {
            _id: 0,
            total: 1,
            uniqueUsers: { $size: '$users' }
          }
        }
      ],

      status: [
        { $group: { _id: '$trangThai', count: { $sum: 1 } } }
      ],

      profileUsage: [
        {
          $group: {
            _id: null,
            withPatientProfile: {
              $sum: {
                $cond: [{ $ifNull: ['$hoSoBenhNhanId', false] }, 1, 0]
              }
            },
            withBenhNhan: {
              $sum: {
                $cond: [{ $ifNull: ['$benhNhanId', false] }, 1, 0]
              }
            }
          }
        },
        { $project: { _id: 0, withPatientProfile: 1, withBenhNhan: 1 } }
      ],

      topUsers: [
        { $group: { _id: '$nguoiDatId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: top },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            count: 1,
            name: '$user.name',
            email: '$user.email'
          }
        }
      ]
    };

    /**
     * Thống kê theo ngày hoặc theo tháng
     */
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
    const totals = data.totals?.[0] || { total: 0, uniqueUsers: 0 };

    const statusBreakdown = {};
    (data.status || []).forEach(s => {
      statusBreakdown[s._id] = s.count;
    });

    return res.json({
      year,
      month: month || undefined,
      totalBookings: totals.total,
      uniqueUsers: totals.uniqueUsers,
      statusBreakdown,
      monthly: data.monthly,
      days: data.days,
      topUsers: data.topUsers || [],
      profileUsage: data.profileUsage?.[0] || {
        withPatientProfile: 0,
        withBenhNhan: 0
      },
      period: {
        from: start.toISOString(),
        to: end.toISOString()
      }
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
