// Router xác thực và khôi phục mật khẩu
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
// Model người dùng
const User = require('../models/User');

// Helpers
// Tạo tokenId ngẫu nhiên để gắn vào refresh token (phục vụ thu hồi/rotate)
function newTokenId() {
  return crypto.randomBytes(24).toString('hex');
}

// Lấy secret cho JWT access/refresh; nếu thiếu JWT_SECRET sẽ throw lỗi cấu hình
function getJwtSecrets() {
  const accessSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || accessSecret;
  if (!accessSecret) {
    throw new Error('Server misconfiguration: JWT_SECRET is missing');
  }
  return { accessSecret, refreshSecret };
}

const router = express.Router();

// Ký access token chứa thông tin cơ bản của user
function signAccessToken(user) {
  const payload = { id: user._id, email: user.email, phone: user.phone, name: user.name, role: user.role };
  const { accessSecret: secret } = getJwtSecrets();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

// Ký refresh token (ít thông tin), chứa sub (userId) và tid (tokenId)
function signRefreshToken(user, tokenId) {
  const payload = { sub: user._id.toString(), tid: tokenId };
  const { refreshSecret: secret } = getJwtSecrets();
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
  return jwt.sign(payload, secret, { expiresIn });
}

// POST /api/auth/register
// Mô tả: Đăng ký tài khoản mới bằng name, password và (email hoặc phone). Trả về access/refresh token.
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body || {};
    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({ message: 'Thiếu name, password và (email hoặc phone)' });
    }

    // Chuẩn hóa số điện thoại: loại bỏ ký tự không phải số
    let phoneNorm = null;
    if (phone) phoneNorm = String(phone).replace(/[^0-9+]/g, '');

    if (email) {
      const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
      if (existing) return res.status(409).json({ message: 'Email đã tồn tại' });
    }
    if (phoneNorm) {
      const existingPhone = await User.findOne({ phone: phoneNorm });
      if (existingPhone) return res.status(409).json({ message: 'Số điện thoại đã tồn tại' });
    }

    const user = await User.create({ name, email: email ? String(email).toLowerCase().trim() : undefined, phone: phoneNorm || undefined, password });
    const tokenId = newTokenId();
    user.refreshTokenIds.push(tokenId);
    await user.save();
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, tokenId);
    return res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/login
// Mô tả: Đăng nhập bằng email/phone/identifier + password. Kiểm tra khóa tài khoản, trả về access/refresh token.
router.post('/login', async (req, res, next) => {
  try {
    const { email, phone, identifier, password } = req.body || {};
    if ((!email && !phone && !identifier) || !password) {
      return res.status(400).json({ message: 'Thiếu identifier (email hoặc phone) hoặc password' });
    }

    let user;
    if (email) {
      user = await User.findOne({ email: String(email).toLowerCase().trim() });
    } else if (phone) {
      const p = String(phone).replace(/[^0-9+]/g, '');
      user = await User.findOne({ phone: p });
    } else if (identifier) {
      if (String(identifier).includes('@')) {
        user = await User.findOne({ email: String(identifier).toLowerCase().trim() });
      } else {
        const p = String(identifier).replace(/[^0-9+]/g, '');
        user = await User.findOne({ phone: p });
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Sai thông tin đăng nhập hoặc password' });
    }

    if (user.isLocked) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: 'Sai thông tin đăng nhập hoặc password' });
    }

    const tokenId = newTokenId();
    user.refreshTokenIds.push(tokenId);
    await user.save();
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, tokenId);
    return res.status(200).json({
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isLocked: !!user.isLocked },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/refresh
// Mô tả: Làm mới access token bằng refresh token (verify + rotate tid).
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ message: 'Thiếu refreshToken' });
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    let payload;
    try {
      payload = jwt.verify(refreshToken, secret);
    } catch {
      return res.status(401).json({ message: 'Refresh token không hợp lệ' });
    }
  const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'User không tồn tại' });
  if (user.isLocked) return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    const valid = user.refreshTokenIds.includes(payload.tid);
    if (!valid) return res.status(401).json({ message: 'Refresh token đã thu hồi' });

    // Rotate
    const newTid = newTokenId();
    user.refreshTokenIds = user.refreshTokenIds.filter((id) => id !== payload.tid);
    user.refreshTokenIds.push(newTid);
    await user.save();

    const accessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user, newTid);
    return res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/logout
// Mô tả: Thu hồi refresh token hiện tại (nếu hợp lệ) và trả về trạng thái đăng xuất.
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ message: 'Thiếu refreshToken' });
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    let payload;
    try {
      payload = jwt.verify(refreshToken, secret);
    } catch {
      return res.status(200).json({ message: 'Đã đăng xuất' });
    }
    const user = await User.findById(payload.sub);
    if (user) {
      user.refreshTokenIds = user.refreshTokenIds.filter((id) => id !== payload.tid);
      await user.save();
    }
    return res.json({ message: 'Đã đăng xuất' });
  } catch (err) {
    return next(err);
  }
});

// OTP helpers
// Sinh OTP số, đệm đầu bằng 0 nếu cần
function generateOTP(length = 6) {
  // Returns zero-padded numeric OTP
  return String(Math.floor(Math.random() * Math.pow(10, length))).padStart(length, '0');
}
const { sendEmailOTP, sendSmsOTP } = require('../services/otpSender');

// POST /api/auth/forgot-password  { identifier }
// Mô tả: Nhận email hoặc số điện thoại; nếu tài khoản tồn tại thì gửi OTP 6 số qua email/SMS.
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier) return res.status(400).json({ message: 'Thiếu identifier (email hoặc phone)' });

    let user;
    let channel = 'email';
    if (String(identifier).includes('@')) {
      user = await User.findOne({ email: String(identifier).toLowerCase().trim() });
      channel = 'email';
    } else {
      const phoneNorm = String(identifier).replace(/[^0-9+]/g, '');
      user = await User.findOne({ phone: phoneNorm });
      channel = 'sms';
    }

    if (!user) {
      // Tránh lộ thông tin: luôn trả về thành công
      return res.json({ message: 'Nếu tài khoản tồn tại, OTP đã được gửi' });
    }

    const otp = generateOTP(6);
    const hashed = crypto.createHash('sha256').update(otp).digest('hex');
    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 5); // 5 phút
    await user.save();

    if (channel === 'email') {
      await sendEmailOTP(user.email, otp);
    } else {
      await sendSmsOTP(user.phone, otp);
    }

    return res.json({ message: 'Nếu tài khoản tồn tại, OTP đã được gửi' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/reset-password { identifier, otp, password }
// Mô tả: Xác thực OTP đã gửi và đặt lại mật khẩu mới; tránh double-hash bằng cách để pre-save hook xử lý.
router.post('/reset-password', async (req, res, next) => {
  try {
    const { identifier, otp, password } = req.body || {};
    if (!identifier || !otp || !password) {
      return res.status(400).json({ message: 'Thiếu identifier, otp hoặc password' });
    }

    let user;
    if (String(identifier).includes('@')) {
      user = await User.findOne({ email: String(identifier).toLowerCase().trim() });
    } else {
      const phoneNorm = String(identifier).replace(/[^0-9+]/g, '');
      user = await User.findOne({ phone: phoneNorm });
    }
    if (!user) return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });

    if (!user.resetPasswordToken || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
    }
    const hashedInput = crypto.createHash('sha256').update(String(otp)).digest('hex');
    if (hashedInput !== user.resetPasswordToken) {
      return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
    }

    // Ghi trực tiếp mật khẩu mới (plaintext) để pre-save hook tự hash.
    // Tránh double-hash (đã từng hash thủ công rồi bị hook hash lần nữa làm sai mật khẩu).
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
