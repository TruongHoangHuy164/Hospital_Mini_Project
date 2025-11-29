// Router quản trị tổng quan hệ thống
const express = require('express');
// Model người dùng (User) để thống kê số lượng và người dùng đang online theo vai trò
const User = require('../models/User');
// Model Bệnh Nhân để lấy danh sách bệnh nhân mới tạo gần đây
const BenhNhan = require('../models/BenhNhan');
// Model Thanh Toán để tổng hợp doanh thu theo ngày
const ThanhToan = require('../models/ThanhToan');

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

module.exports = router;
