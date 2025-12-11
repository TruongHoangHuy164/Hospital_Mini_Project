const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware xác thực JWT
// Nhiệm vụ:
// - Kiểm tra header Authorization dạng `Bearer <token>`
// - Giải mã token bằng `JWT_SECRET`
// - Gắn thông tin người dùng vào `req.user` để các middleware/route sau sử dụng
// - Kiểm tra trạng thái khóa tài khoản và cập nhật thời điểm hoạt động gần nhất
function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');
    // Nếu không phải Bearer token hoặc thiếu token → không được phép
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Giải mã JWT, lấy payload (id, email, name, role, exp...)
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Gắn payload vào req.user để dùng ở các bước sau
    req.user = payload; // chứa: id, email, name, role

    // Nếu có id trong token, kiểm tra trạng thái tài khoản và cập nhật hoạt động
    if (payload?.id) {
      User.findById(payload.id)
        .then((u) => {
          // Nếu tài khoản bị khóa → từ chối truy cập
          if (u?.isLocked) {
            return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
          }
          // Cập nhật thời điểm hoạt động gần nhất (lastActive) theo kiểu fire-and-forget
          // Việc này không chặn luồng phản hồi để giữ hiệu năng
          User.updateOne(
            { _id: payload.id },
            { $set: { lastActive: new Date() } }
          ).catch(() => {});

          // Cho qua tiếp các middleware/route
          return next();
        })
        .catch(() => {
          // Nếu lỗi DB hoặc không tìm thấy user → coi như không hợp lệ
          return res.status(401).json({ message: 'Unauthorized' });
        });
      return; // Tránh gọi next() lần hai
    }

    // Token hợp lệ nhưng không có id (ít gặp) → vẫn cho qua
    return next();
  } catch (err) {
    // Lỗi giải mã token (hết hạn/không đúng secret...) → không hợp lệ
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
}

module.exports = auth;
