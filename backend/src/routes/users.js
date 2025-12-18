// Router quản lý người dùng và hồ sơ bệnh nhân (self-service)
const express = require('express');
// Model người dùng
const User = require('../models/User');
// Model bệnh nhân (thông tin hồ sơ bệnh nhân gắn với user)
const BenhNhan = require('../models/BenhNhan');
// Model OTP dùng cho các thao tác bảo mật (đổi mật khẩu)
const Otp = require('../models/Otp');
// Middleware xác thực và phân quyền
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
// Dịch vụ email để gửi mã OTP
const { sendOtpEmail } = require('../services/emailService');

const router = express.Router();

// ===== Tóm tắt API Người dùng (users) =====
// Quyền hạn tổng quan:
// - Các route quản trị dùng cặp middleware: auth + authorize('admin').
// - Các route tự phục vụ dùng auth (user hiện tại).
//
// Quản trị
// - GET    /api/users                         : Liệt kê người dùng (phân trang, tìm theo tên/email, lọc theo role) [admin]
// - GET    /api/users/:id/profile             : Lấy hồ sơ tổng hợp của 1 user (gộp thông tin BenhNhan mới nhất) [admin]
// - PATCH  /api/users/:id/role                : Cập nhật vai trò (user/doctor/admin/reception/lab/cashier/nurse/pharmacy) [admin]
// - PATCH  /api/users/:id/lock                : Khoá/Mở khoá tài khoản; khi khoá sẽ thu hồi toàn bộ refresh tokens [admin]
//
// Tự phục vụ (self-service)
// - GET    /api/users/my-patient-profile      : Lấy (hoặc tạo cơ bản) hồ sơ BenhNhan của chính user (phục vụ đặt lịch)
// - GET    /api/users/profile                 : Lấy hồ sơ tổng hợp (User + BenhNhan)
// - PUT    /api/users/profile                 : Cập nhật hồ sơ (kiểm tra hợp lệ: họ tên, giới tính, ngày sinh, SĐT...)
// - POST   /api/users/request-change-password-otp : Yêu cầu OTP (email) để đổi mật khẩu; xác thực mật khẩu hiện tại trước khi gửi OTP
// - POST   /api/users/verify-change-password-otp  : Xác thực OTP hợp lệ, đổi mật khẩu, thu hồi toàn bộ refresh tokens
// - PUT    /api/users/change-password          : Phương thức cũ đổi mật khẩu (giữ tương thích); thu hồi refresh tokens
//
// GET /api/users?page=1&limit=10&q=abc&role=admin
// Mô tả: Liệt kê người dùng với phân trang, tìm kiếm theo tên/email và lọc theo vai trò.
// Phân quyền: Chỉ admin.
router.get('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
    const skip = (page - 1) * limit;
    const q = (req.query.q || '').trim();
    const role = (req.query.role || '').trim();

    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    if (role) filter.role = role;

    const [items, total] = await Promise.all([
      User.find(filter)
        .select('-password -resetPasswordToken -resetPasswordExpires -refreshTokenIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    // Gắn số điện thoại từ hồ sơ BenhNhan nếu có (1 truy vấn để ghép)
    try {
      const userIds = items.map(u => String(u._id));
      const phones = await BenhNhan.find({ userId: { $in: userIds } }).select('userId soDienThoai');
      const phoneMap = {};
      for (const p of phones) phoneMap[String(p.userId)] = p.soDienThoai || '';
      const itemsWithPhone = items.map(u => {
        const obj = (u.toObject ? u.toObject() : u);
        // Ưu tiên số điện thoại trên User; nếu không có, dùng BenhNhan.soDienThoai
        obj.phone = obj.phone || phoneMap[String(obj._id)] || '';
        return obj;
      });

      return res.json({
        items: itemsWithPhone,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (e) {
      // Nếu lỗi khi gắn số điện thoại, vẫn trả danh sách người dùng
      return res.json({
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }
  } catch (err) {
    return next(err);
  }
});

// GET /api/users/:id/profile - Admin lấy hồ sơ tổng hợp của bất kỳ user
router.get('/:id/profile', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password -resetPasswordToken -resetPasswordExpires -refreshTokenIds');
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

    // Tìm hồ sơ BenhNhan mới nhất gắn với user
    const benhNhan = await BenhNhan.findOne({ userId: id }).sort({ createdAt: -1 });

    const profile = {
      id: user._id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      hoTen: benhNhan?.hoTen || user.name || '',
      ngaySinh: benhNhan?.ngaySinh || null,
      gioiTinh: benhNhan?.gioiTinh || null,
      diaChi: benhNhan?.diaChi || '',
      soDienThoai: benhNhan?.soDienThoai || '',
      maBHYT: benhNhan?.maBHYT || '',
      benhNhanId: benhNhan?._id || null,
    };

    return res.json(profile);
  } catch (err) {
    return next(err);
  }
});

// GET /api/users/my-patient-profile - Lấy hồ sơ BenhNhan của chính user (dùng đặt lịch)
router.get('/my-patient-profile', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Tìm hồ sơ BenhNhan đầu tiên của user
    let benhNhan = await BenhNhan.findOne({ userId }).sort({ createdAt: -1 });
    
    if (!benhNhan) {
      // Nếu chưa có, tạo hồ sơ cơ bản từ dữ liệu User
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Người dùng không tồn tại' });
      }
      
      // Tạo hồ sơ BenhNhan cơ bản từ User
      benhNhan = await BenhNhan.create({
        userId: userId,
        hoTen: user.name || 'Chưa cập nhật',
        gioiTinh: 'khac', // Default gender
        soDienThoai: '', // User model doesn't have phone, will be updated later
        // ngaySinh and diaChi will be null until user updates
      });
      
      console.log('Created basic BenhNhan profile for user:', userId, benhNhan._id);
    }
    
    return res.json(benhNhan);
  } catch (err) {
    return next(err);
  }
});

// GET /api/users/profile - Lấy hồ sơ tổng hợp của chính user
router.get('/profile', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Lấy thông tin cơ bản từ User
    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires -refreshTokenIds');
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    
    // Lấy thông tin chi tiết từ BenhNhan
    let benhNhan = await BenhNhan.findOne({ userId }).sort({ createdAt: -1 });
    
    if (!benhNhan) {
      // Tạo hồ sơ BenhNhan cơ bản nếu chưa có
      benhNhan = await BenhNhan.create({
        userId: userId,
        hoTen: user.name || 'Chưa cập nhật',
        gioiTinh: 'khac',
        soDienThoai: '',
      });
    }
    
    // Gộp dữ liệu từ User và BenhNhan thành profile tổng hợp
    const profile = {
      // User info
      id: user._id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      // BenhNhan info
      hoTen: benhNhan.hoTen,
      ngaySinh: benhNhan.ngaySinh,
      gioiTinh: benhNhan.gioiTinh,
      diaChi: benhNhan.diaChi,
      soDienThoai: benhNhan.soDienThoai,
      maBHYT: benhNhan.maBHYT,
      benhNhanId: benhNhan._id
    };
    
    return res.json(profile);
  } catch (err) {
    return next(err);
  }
});

// PUT /api/users/profile - Cập nhật hồ sơ của chính user
router.put('/profile', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { hoTen, ngaySinh, gioiTinh, diaChi, soDienThoai, maBHYT } = req.body;
    
    // Kiểm tra hợp lệ đầu vào
    if (!hoTen || hoTen.trim().length === 0) {
      return res.status(400).json({ message: 'Họ tên không được để trống' });
    }
    
    if (gioiTinh && !['nam', 'nu', 'khac'].includes(gioiTinh)) {
      return res.status(400).json({ message: 'Giới tính không hợp lệ' });
    }
    
    if (ngaySinh) {
      const birthDate = new Date(ngaySinh);
      if (isNaN(birthDate.getTime())) {
        return res.status(400).json({ message: 'Ngày sinh không hợp lệ' });
      }
      if (birthDate > new Date()) {
        return res.status(400).json({ message: 'Ngày sinh không thể là tương lai' });
      }
    }
    
    if (soDienThoai && !/^[0-9+\-\s()]{10,15}$/.test(soDienThoai.replace(/\s/g, ''))) {
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
    }
    
    // Cập nhật tên trên model User
    await User.findByIdAndUpdate(userId, { 
      name: hoTen.trim() 
    });
    
    // Cập nhật hoặc tạo hồ sơ BenhNhan
    const updateData = {
      hoTen: hoTen.trim(),
      ...(ngaySinh && { ngaySinh: new Date(ngaySinh) }),
      ...(gioiTinh && { gioiTinh }),
      ...(diaChi !== undefined && { diaChi: diaChi.trim() }),
      ...(soDienThoai !== undefined && { soDienThoai: soDienThoai.trim() }),
      ...(maBHYT !== undefined && { maBHYT: maBHYT.trim() })
    };
    
    const benhNhan = await BenhNhan.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, upsert: true }
    );
    
    // Trả về hồ sơ đã cập nhật
    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires -refreshTokenIds');
    
    const profile = {
      id: user._id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      hoTen: benhNhan.hoTen,
      ngaySinh: benhNhan.ngaySinh,
      gioiTinh: benhNhan.gioiTinh,
      diaChi: benhNhan.diaChi,
      soDienThoai: benhNhan.soDienThoai,
      maBHYT: benhNhan.maBHYT,
      benhNhanId: benhNhan._id
    };
    
    return res.json({ 
      message: 'Cập nhật thông tin thành công',
      profile 
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/users/request-change-password-otp - Yêu cầu mã OTP để đổi mật khẩu
router.post('/request-change-password-otp', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword } = req.body;
    
    // Kiểm tra hợp lệ đầu vào
    if (!currentPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại' });
    }
    
    // Lấy user và kiểm tra mật khẩu hiện tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    
    // Đối chiếu mật khẩu hiện tại
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }
    
    // Sinh mã OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Thời hạn hiệu lực OTP: 3 phút kể từ bây giờ
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
    
    // Xóa mã OTP chưa dùng trước đó của user cho loại change_password
    await Otp.deleteMany({ 
      userId, 
      type: 'change_password', 
      isUsed: false 
    });
    
    // Tạo OTP mới
    const newOtp = await Otp.create({
      userId,
      email: user.email,
      otp,
      type: 'change_password',
      expiresAt
    });
    
    // Gửi OTP qua email
    const emailResult = await sendOtpEmail(user.email, otp, 'change_password');
    
    if (!emailResult.success) {
      // Nếu gửi email thất bại, xóa OTP vừa tạo và trả lỗi
      await Otp.findByIdAndDelete(newOtp._id);
      return res.status(500).json({ 
        message: 'Không thể gửi email OTP. Vui lòng thử lại sau.',
        error: emailResult.error 
      });
    }
    
    return res.json({ 
      message: 'Mã OTP đã được gửi đến email của bạn. Mã có hiệu lực trong 3 phút.',
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Hide part of email
      expiresAt: expiresAt.toISOString()
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/users/verify-change-password-otp - Xác thực OTP và đổi mật khẩu
router.post('/verify-change-password-otp', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { otp, newPassword } = req.body;
    
    // Kiểm tra hợp lệ đầu vào
    if (!otp || !newPassword) {
      return res.status(400).json({ message: 'Thiếu mã OTP hoặc mật khẩu mới' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }
    
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Mã OTP phải là 6 chữ số' });
    }
    
    // Tìm OTP hợp lệ còn hiệu lực
    const otpRecord = await Otp.findOne({
      userId,
      otp,
      type: 'change_password',
      isUsed: false,
      expiresAt: { $gt: new Date() } // Not expired
    });
    
    if (!otpRecord) {
      return res.status(400).json({ 
        message: 'Mã OTP không hợp lệ, đã được sử dụng hoặc đã hết hạn' 
      });
    }
    
    // Lấy user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    
    // Đánh dấu OTP đã sử dụng
    otpRecord.isUsed = true;
    await otpRecord.save();
    
    // Cập nhật mật khẩu mới (được hash bởi middleware trước khi lưu)
    user.password = newPassword;
    await user.save();
    
    // Xóa toàn bộ refreshTokenIds để buộc đăng nhập lại trên thiết bị khác
    user.refreshTokenIds = [];
    await user.save();
    
    // Dọn dẹp các OTP còn lại của user
    await Otp.deleteMany({ userId, type: 'change_password' });
    
    return res.json({ 
      message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại trên các thiết bị khác.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/users/change-password - change current user's password (OLD METHOD - Keep for backward compatibility)
router.put('/change-password', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Thiếu mật khẩu hiện tại hoặc mật khẩu mới' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }
    
    // Get user and verify current password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    
    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }
    
    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();
    
    // Clear all refresh tokens to force re-login on other devices
    user.refreshTokenIds = [];
    await user.save();
    
    return res.json({ 
      message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại trên các thiết bị khác.' 
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

// PATCH /api/users/:id/role
router.patch('/:id/role', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

  const allowed = ['user', 'doctor', 'admin', 'reception', 'lab', 'cashier', 'nurse', 'pharmacy'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ' });
    }

    // Optional safety: prevent current admin from demoting themselves to avoid lockout
    if (req.user && req.user.id === id && req.user.role === 'admin' && role !== 'admin') {
      return res.status(400).json({ message: 'Không thể tự hạ quyền chính mình' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true, projection: '-password -resetPasswordToken -resetPasswordExpires -refreshTokenIds' }
    );
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    return res.json({ message: 'Cập nhật vai trò thành công', user });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/users/:id/lock { isLocked: true|false }
router.patch('/:id/lock', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isLocked } = req.body || {};
    if (typeof isLocked !== 'boolean') {
      return res.status(400).json({ message: 'Thiếu hoặc sai định dạng isLocked' });
    }

    // Safety: prevent current admin from locking themselves
    if (req.user && req.user.id === id) {
      return res.status(400).json({ message: 'Không thể tự khóa tài khoản của chính mình' });
    }

    const update = { isLocked };
    // If locking, also revoke all refresh tokens to force logout
    if (isLocked) update.refreshTokenIds = [];

    const user = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, projection: '-password -resetPasswordToken -resetPasswordExpires -refreshTokenIds' }
    );
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    return res.json({ message: isLocked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản', user });
  } catch (err) {
    return next(err);
  }
});
