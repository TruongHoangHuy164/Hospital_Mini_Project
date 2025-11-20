const express = require('express');
const User = require('../models/User');
const BenhNhan = require('../models/BenhNhan');
const Otp = require('../models/Otp');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const { sendOtpEmail } = require('../services/emailService');

const router = express.Router();

// GET /api/users?page=1&limit=10&q=abc&role=admin
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

    // Attach phone (soDienThoai) from BenhNhan if available (single query)
    try {
      const userIds = items.map(u => String(u._id));
      const phones = await BenhNhan.find({ userId: { $in: userIds } }).select('userId soDienThoai');
      const phoneMap = {};
      for (const p of phones) phoneMap[String(p.userId)] = p.soDienThoai || '';
      const itemsWithPhone = items.map(u => {
        const obj = (u.toObject ? u.toObject() : u);
        // Prefer phone stored on User model; fallback to BenhNhan.soDienThoai
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
      // If anything goes wrong attaching phones, still return users without phones
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

// GET /api/users/:id/profile - admin can fetch any user's combined profile
router.get('/:id/profile', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password -resetPasswordToken -resetPasswordExpires -refreshTokenIds');
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

    // Find benhNhan record (latest)
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

// GET /api/users/my-patient-profile - get current user's BenhNhan profile for self-booking
router.get('/my-patient-profile', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Find the first BenhNhan record for this user (self profile)
    let benhNhan = await BenhNhan.findOne({ userId }).sort({ createdAt: -1 });
    
    if (!benhNhan) {
      // If no BenhNhan profile exists, create a basic one from User data
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Người dùng không tồn tại' });
      }
      
      // Create basic BenhNhan profile from User
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

// GET /api/users/profile - get current user's complete profile info
router.get('/profile', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get User basic info
    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires -refreshTokenIds');
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    
    // Get BenhNhan detailed info
    let benhNhan = await BenhNhan.findOne({ userId }).sort({ createdAt: -1 });
    
    if (!benhNhan) {
      // Create basic BenhNhan profile if doesn't exist
      benhNhan = await BenhNhan.create({
        userId: userId,
        hoTen: user.name || 'Chưa cập nhật',
        gioiTinh: 'khac',
        soDienThoai: '',
      });
    }
    
    // Combine both profiles
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

// PUT /api/users/profile - update current user's profile info
router.put('/profile', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { hoTen, ngaySinh, gioiTinh, diaChi, soDienThoai, maBHYT } = req.body;
    
    // Validation
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
    
    // Update User name
    await User.findByIdAndUpdate(userId, { 
      name: hoTen.trim() 
    });
    
    // Update or create BenhNhan profile
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
    
    // Return updated profile
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

// POST /api/users/request-change-password-otp - request OTP for password change
router.post('/request-change-password-otp', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword } = req.body;
    
    // Validation
    if (!currentPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại' });
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
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time (3 minutes from now)
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
    
    // Delete any existing unused OTPs for this user and type
    await Otp.deleteMany({ 
      userId, 
      type: 'change_password', 
      isUsed: false 
    });
    
    // Create new OTP
    const newOtp = await Otp.create({
      userId,
      email: user.email,
      otp,
      type: 'change_password',
      expiresAt
    });
    
    // Send OTP via email
    const emailResult = await sendOtpEmail(user.email, otp, 'change_password');
    
    if (!emailResult.success) {
      // If email fails, delete the OTP and return error
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

// POST /api/users/verify-change-password-otp - verify OTP and change password
router.post('/verify-change-password-otp', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { otp, newPassword } = req.body;
    
    // Validation
    if (!otp || !newPassword) {
      return res.status(400).json({ message: 'Thiếu mã OTP hoặc mật khẩu mới' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }
    
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Mã OTP phải là 6 chữ số' });
    }
    
    // Find valid OTP
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
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    
    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();
    
    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();
    
    // Clear all refresh tokens to force re-login on other devices
    user.refreshTokenIds = [];
    await user.save();
    
    // Clean up any remaining OTPs for this user
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
