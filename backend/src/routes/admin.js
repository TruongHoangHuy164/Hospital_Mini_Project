const express = require('express'); // Import thư viện Express để tạo router HTTP

const User = require('../models/User');             // Import model người dùng hệ thống
const BenhNhan = require('../models/BenhNhan');     // Import model bệnh nhân
const ThanhToan = require('../models/ThanhToan');   // Import model thanh toán
const LichKham = require('../models/LichKham');     // Import model lịch khám

const router = express.Router(); // Khởi tạo một router Express để định nghĩa các endpoint admin

router.get('/overview', async (req, res, next) => { // Định nghĩa endpoint GET /overview cho admin
  try { // Bọc logic trong try/catch để chuyển lỗi sang middleware xử lý
    
    const onlineWindowMinutes = 10; // Số phút để coi người dùng là đang online
    const since = new Date(Date.now() - onlineWindowMinutes * 60 * 1000); // Mốc thời gian: hiện tại trừ đi 10 phút

    /**
     * Thực hiện song song các truy vấn để tối ưu hiệu năng
     */
    const [
      usersCount,        // Tổng số người dùng hệ thống
      patientsCount,     // Tổng số bệnh nhân
      latestBenhNhan,    // Danh sách bệnh nhân mới nhất
      onlineCounts       // Số người dùng đang online theo vai trò
    ] = await Promise.all([
      // Tổng số người dùng
      User.countDocuments({}), // Đếm tổng số bản ghi trong collection users

      // Tổng số bệnh nhân
      BenhNhan.countDocuments({}), // Đếm tổng số bản ghi trong collection benhnhans

      // 8 bệnh nhân mới nhất
      BenhNhan.find({})
        .sort({ createdAt: -1 }) // Sắp xếp giảm dần theo thời gian tạo
        .limit(8)                 // Lấy tối đa 8 bản ghi
        .select('hoTen gioiTinh ngaySinh createdAt'), // Chỉ lấy các trường cần thiết

      // Thống kê người dùng đang online theo role
      User.aggregate([
        { $match: { lastActive: { $gte: since } } }, // Lọc người dùng có lastActive >= since
        { $group: { _id: '$role', count: { $sum: 1 } } }, // Nhóm theo role và đếm số lượng
      ])
    ]);

    /**
     * Chuẩn hóa dữ liệu bệnh nhân cho frontend
     */
    const latestPatients = latestBenhNhan.map(p => ({ // Chuyển đối tượng từ schema sang dạng UI-friendly
      _id: p._id,               // ID bệnh nhân
      fullName: p.hoTen,        // Họ tên
      gender: p.gioiTinh,       // Giới tính
      dob: p.ngaySinh,          // Ngày sinh
      createdAt: p.createdAt,   // Thời điểm tạo hồ sơ
    }));

    /**
     * Khởi tạo bộ đếm online theo vai trò
     */
    const onlineByRole = { // Mặc định số lượng online theo role là 0
      user: 0,
      doctor: 0,
      admin: 0,
    };

    onlineCounts.forEach(o => { // Duyệt kết quả aggregate và gán vào bộ đếm
      if (o?._id && onlineByRole.hasOwnProperty(o._id)) { // Chỉ nhận các role hợp lệ
        onlineByRole[o._id] = o.count; // Cập nhật số lượng online cho role tương ứng
      }
    });

    /**
     * Tính doanh thu theo ngày (14 ngày gần nhất)
     */
    const days = 14; // Số ngày cần thống kê
    const from = new Date(); // Ngày hiện tại
    from.setHours(0, 0, 0, 0); // Đặt mốc về 00:00:00 để tính theo ngày
    from.setDate(from.getDate() - (days - 1)); // Lùi về 13 ngày trước để có 14 ngày liên tiếp

    const revenueAgg = await ThanhToan.aggregate([
      { $match: { ngayThanhToan: { $gte: from } } }, // Lọc các thanh toán từ mốc 'from'
      {
        $group: {
          _id: { // Nhóm theo ngày (YYYY-MM-DD)
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$ngayThanhToan',
            }
          },
          total: { $sum: '$soTien' } // Cộng dồn số tiền theo ngày
        }
      },
      { $sort: { _id: 1 } } // Sắp xếp tăng dần theo ngày
    ]);

    /**
     * Ghép dữ liệu doanh thu theo từng ngày (kể cả ngày không có doanh thu)
     */
    const revenueMap = new Map(revenueAgg.map(r => [r._id, r.total])); // Map ngày -> tổng tiền
    const revenue = []; // Mảng kết quả cho frontend (đủ 14 ngày)

    for (let i = 0; i < days; i++) { // Duyệt từng ngày trong khoảng
      const d = new Date(from); // Clone mốc 'from'
      d.setDate(from.getDate() + i); // Dịch sang ngày thứ i
      const key = d.toISOString().slice(0, 10); // Chuỗi ngày dạng YYYY-MM-DD

      revenue.push({ // Thêm bản ghi doanh thu của ngày
        date: key, // Ngày
        total: revenueMap.get(key) || 0, // Tổng tiền, nếu không có thì 0
      });
    }

    return res.json({ // Trả về dữ liệu tổng quan cho dashboard
      usersCount,      // Tổng số người dùng
      patientsCount,   // Tổng số bệnh nhân
      latestPatients,  // Danh sách bệnh nhân mới nhất (đã chuẩn hóa)
      onlineByRole,    // Người dùng online theo vai trò
      revenue,         // Doanh thu 14 ngày gần nhất
    });
  } catch (err) { // Nếu có lỗi
    return next(err); // Chuyển lỗi cho middleware xử lý
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
router.get('/booking-stats', async (req, res, next) => { // Định nghĩa endpoint GET /booking-stats
  try { // Bọc logic trong try/catch
    const now = new Date(); // Lấy thời điểm hiện tại

    const year = parseInt(req.query.year, 10) || now.getFullYear(); // Năm cần thống kê (mặc định năm hiện tại)
    const monthRaw = req.query.month; // Giá trị tháng nguyên bản từ query
    const month = monthRaw ? parseInt(monthRaw, 10) : null; // Chuyển sang số, nếu không có thì null
    const top = Math.min(Math.max(parseInt(req.query.top, 10) || 10, 1), 50); // Số lượng top user (giới hạn 1..50)

    if (month && (month < 1 || month > 12)) { // Kiểm tra tính hợp lệ của tháng
      return res.status(400).json({ message: 'Tháng không hợp lệ (1-12).' }); // Trả lỗi 400 nếu tháng sai
    }

    /**
     * Xác định khoảng thời gian thống kê
     */
    const start = month
      ? new Date(year, month - 1, 1) // Nếu có tháng: bắt đầu từ ngày 1 của tháng đó
      : new Date(year, 0, 1);        // Nếu không: bắt đầu từ 01/01 của năm

    const end = month
      ? new Date(year, month, 1)     // Nếu có tháng: kết thúc ở ngày 1 của tháng kế tiếp
      : new Date(year + 1, 0, 1);    // Nếu không: kết thúc ở 01/01 của năm sau

    /**
     * Định nghĩa các thống kê cần gom trong $facet
     */
    const facets = { // Sử dụng $facet để chạy nhiều pipeline song song trên cùng tập dữ liệu
      totals: [
        {
          $group: {
            _id: null,                  // Gom tất cả bản ghi thành 1 nhóm
            total: { $sum: 1 },         // Tổng số lịch khám
            users: { $addToSet: '$nguoiDatId' } // Tập hợp user đặt lịch (loại trùng)
          }
        },
        {
          $project: {
            _id: 0,                      // Loại bỏ _id
            total: 1,                    // Giữ tổng số lịch
            uniqueUsers: { $size: '$users' } // Đếm số user duy nhất
          }
        }
      ],

      status: [
        { $group: { _id: '$trangThai', count: { $sum: 1 } } } // Đếm số lượng theo từng trạng thái
      ],

      profileUsage: [ // Thống kê mức độ dùng hồ sơ bệnh nhân
        {
          $group: {
            _id: null,
            withPatientProfile: { // Đếm bản ghi có trường hoSoBenhNhanId
              $sum: {
                $cond: [{ $ifNull: ['$hoSoBenhNhanId', false] }, 1, 0]
              }
            },
            withBenhNhan: { // Đếm bản ghi có trường benhNhanId
              $sum: {
                $cond: [{ $ifNull: ['$benhNhanId', false] }, 1, 0]
              }
            }
          }
        },
        { $project: { _id: 0, withPatientProfile: 1, withBenhNhan: 1 } } // Chỉ trả hai trường cần thiết
      ],

      topUsers: [ // Tìm các user đặt lịch nhiều nhất
        { $group: { _id: '$nguoiDatId', count: { $sum: 1 } } }, // Nhóm theo user đặt lịch và đếm
        { $sort: { count: -1 } }, // Sắp xếp giảm dần theo số lần đặt
        { $limit: top },          // Giới hạn theo tham số top
        {
          $lookup: { // Join sang collection users để lấy thông tin tên/email
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }, // Tách mảng user thành đối tượng (nếu có)
        {
          $project: { // Chọn trường trả về cho mỗi top user
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
    if (month) { // Nếu truy vấn có tháng → thống kê theo ngày của tháng đó
      facets.days = [
        { $group: { _id: { day: { $dayOfMonth: '$ngayKham' } }, count: { $sum: 1 } } }, // Nhóm theo ngày trong tháng
        { $project: { _id: 0, day: '$_id.day', count: 1 } }, // Đưa day ra ngoài và giữ count
        { $sort: { day: 1 } } // Sắp xếp tăng dần theo ngày
      ];
    } else { // Nếu không có tháng → thống kê theo tháng trong năm
      facets.monthly = [
        { $group: { _id: { month: { $month: '$ngayKham' } }, count: { $sum: 1 } } }, // Nhóm theo tháng
        { $project: { _id: 0, month: '$_id.month', count: 1 } }, // Trả về month và count
        { $sort: { month: 1 } } // Sắp xếp tăng dần theo tháng
      ];
    }

    const agg = await LichKham.aggregate([
      { $match: { ngayKham: { $gte: start, $lt: end } } }, // Chỉ lấy lịch khám trong khoảng thời gian xác định
      { $facet: facets } // Áp dụng các pipeline song song đã định nghĩa
    ]);

    const data = agg[0] || {}; // Lấy kết quả facet đầu tiên (hoặc đối tượng rỗng)
    const totals = data.totals?.[0] || { total: 0, uniqueUsers: 0 }; // Tổng số lịch và số user duy nhất

    const statusBreakdown = {}; // Khởi tạo object cho phân bổ trạng thái
    (data.status || []).forEach(s => { // Duyệt từng trạng thái từ facet
      statusBreakdown[s._id] = s.count; // Gán số lượng tương ứng cho trạng thái
    });

    return res.json({ // Trả về kết quả thống kê
      year,                                  // Năm thống kê
      month: month || undefined,             // Tháng (nếu có)
      totalBookings: totals.total,           // Tổng số lịch khám
      uniqueUsers: totals.uniqueUsers,       // Số người dùng duy nhất đã đặt lịch
      statusBreakdown,                       // Phân tích theo trạng thái
      monthly: data.monthly,                 // Thống kê theo tháng (nếu không chọn month)
      days: data.days,                       // Thống kê theo ngày (nếu chọn month)
      topUsers: data.topUsers || [],         // Danh sách top người dùng đặt lịch
      profileUsage: data.profileUsage?.[0] || { // Tỷ lệ sử dụng hồ sơ bệnh nhân
        withPatientProfile: 0,
        withBenhNhan: 0
      },
      period: {                              // Khoảng thời gian đã thống kê
        from: start.toISOString(),
        to: end.toISOString()
      }
    });
  } catch (err) { // Nếu lỗi xảy ra trong quá trình aggregate
    return next(err); // Chuyển lỗi cho middleware xử lý chung
  }
});

module.exports = router; // Xuất router để hệ thống sử dụng tại app chính
