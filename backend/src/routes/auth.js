// Router xác thực và khôi phục mật khẩu
// Mô tả tổng quan:
// - Cung cấp các endpoint đăng ký, đăng nhập, làm mới token, đăng xuất
// - Hỗ trợ quên mật khẩu bằng OTP qua email/SMS và đặt lại mật khẩu
// - Sử dụng JWT cho access token (chứa thông tin cơ bản) và refresh token (ít thông tin, có tid để thu hồi/rotate)
const express = require('express'); // Express Router để định nghĩa các endpoint HTTP
const jwt = require('jsonwebtoken'); // Thư viện JWT để ký/xác minh token
const crypto = require('crypto'); // Dùng tạo tid và hash OTP
const bcrypt = require('bcryptjs'); // Bcrypt (có thể dùng trong model User)
// Model người dùng
const User = require('../models/User'); // Mongoose Model người dùng

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

const router = express.Router(); // Khởi tạo router

// Ký access token chứa thông tin cơ bản của user
// Payload: { id, email, phone, name, role }
// expiresIn: mặc định 7 ngày (cấu hình qua ENV JWT_EXPIRES_IN)
function signAccessToken(user) {
  const payload = { id: user._id, email: user.email, phone: user.phone, name: user.name, role: user.role };
  const { accessSecret: secret } = getJwtSecrets();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

// Ký refresh token (ít thông tin), chứa sub (userId) và tid (tokenId)
// Mục đích: kéo dài phiên đăng nhập; có thể rotate và thu hồi theo tid
function signRefreshToken(user, tokenId) {
  const payload = { sub: user._id.toString(), tid: tokenId };
  const { refreshSecret: secret } = getJwtSecrets();
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
  return jwt.sign(payload, secret, { expiresIn });
}

// POST /api/auth/register
// Mô tả:
// - Đăng ký tài khoản mới bằng name, password và (email hoặc phone)
// - Chuẩn hoá số điện thoại, kiểm tra trùng email/phone
// - Lưu user, tạo tid, đẩy vào danh sách refreshTokenIds, trả về access/refresh token
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
    const tokenId = newTokenId(); // Tạo tid mới cho refresh token
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
// Mô tả:
// - Đăng nhập bằng email/phone/identifier + password
// - Kiểm tra khoá tài khoản, trả về access/refresh token
// - Chuẩn hoá input, tìm user theo ưu tiên: email -> phone -> identifier
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

    const ok = await user.comparePassword(password); // So sánh mật khẩu bằng bcrypt (trong model User)
    if (!ok) {
      return res.status(401).json({ message: 'Sai thông tin đăng nhập hoặc password' });
    }

    const tokenId = newTokenId(); // Tạo tid mới và lưu vào user để phép refresh
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
// Mô tả:
// - Làm mới access token bằng refresh token
// - Xác minh refresh token, kiểm tra tid có nằm trong danh sách hợp lệ
// - Rotate: loại tid cũ, thêm tid mới, ký lại refresh token
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
  const user = await User.findById(payload.sub); // Lấy user theo sub
    if (!user) return res.status(401).json({ message: 'User không tồn tại' });
  if (user.isLocked) return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    const valid = user.refreshTokenIds.includes(payload.tid);
    if (!valid) return res.status(401).json({ message: 'Refresh token đã thu hồi' });

    // Rotate
    const newTid = newTokenId(); // Tạo tid mới
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
// Mô tả:
// - Thu hồi refresh token hiện tại (nếu hợp lệ) và trả về trạng thái đăng xuất
// - Nếu refreshToken invalid thì vẫn trả success để đơn giản hoá
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
// Mô tả:
// - Nhận email hoặc số điện thoại; nếu tài khoản tồn tại thì gửi OTP 6 số qua email/SMS
// - Tránh lộ thông tin người dùng: luôn trả về thành công dù không tìm thấy tài khoản
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

    const otp = generateOTP(6); // Sinh OTP 6 số
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
// Mô tả:
// - Xác thực OTP đã gửi và đặt lại mật khẩu mới
// - Tránh double-hash: để pre-save hook của model User xử lý bcrypt hashing
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
    const hashedInput = crypto.createHash('sha256').update(String(otp)).digest('hex'); // Hash OTP nhập vào để so với DB
    if (hashedInput !== user.resetPasswordToken) {
      return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
    }

    // Ghi trực tiếp mật khẩu mới (plaintext) để pre-save hook tự hash.
    // Tránh double-hash (đã từng hash thủ công rồi bị hook hash lần nữa làm sai mật khẩu).
    user.password = password; // Gán plaintext để hook pre-save tự hash
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
