const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware xác thực JWT: kiểm tra header Bearer, giải mã token và gắn `req.user`
function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  req.user = payload; // chứa: id, email, name, role
    // Kiểm tra tài khoản có bị khóa ở mỗi request
    if (payload?.id) {
      User.findById(payload.id).then((u) => {
        if (u?.isLocked) {
          return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
        }
        // Cập nhật thời điểm hoạt động gần nhất (lastActive) không chặn luồng
        User.updateOne({ _id: payload.id }, { $set: { lastActive: new Date() } }).catch(() => {});
        return next();
      }).catch(() => {
        return res.status(401).json({ message: 'Unauthorized' });
      });
      return; // prevent calling next twice
    }
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

module.exports = auth;
