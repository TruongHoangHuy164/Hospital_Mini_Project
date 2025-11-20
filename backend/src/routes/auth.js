const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Helpers
function newTokenId() {
  return crypto.randomBytes(24).toString('hex');
}

function getJwtSecrets() {
  const accessSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || accessSecret;
  if (!accessSecret) {
    throw new Error('Server misconfiguration: JWT_SECRET is missing');
  }
  return { accessSecret, refreshSecret };
}

const router = express.Router();

function signAccessToken(user) {
  const payload = { id: user._id, email: user.email, phone: user.phone, name: user.name, role: user.role };
  const { accessSecret: secret } = getJwtSecrets();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

function signRefreshToken(user, tokenId) {
  const payload = { sub: user._id.toString(), tid: tokenId };
  const { refreshSecret: secret } = getJwtSecrets();
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
  return jwt.sign(payload, secret, { expiresIn });
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body || {};
    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({ message: 'Thiếu name, password và (email hoặc phone)' });
    }

    // Normalize phone: remove non-digits
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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Thiếu email' });
    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ message: 'Nếu email tồn tại, hướng dẫn đã được gửi' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    const hashed = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
    await user.save();

    // In production: send email with link containing resetToken
    // For now, return token for testing
    return res.json({ message: 'Đã tạo token đặt lại mật khẩu', resetToken });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ message: 'Thiếu token hoặc password' });
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
