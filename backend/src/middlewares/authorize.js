// Middleware phân quyền
// Mục đích: Chỉ cho phép truy cập nếu vai trò của người dùng
// (lấy từ `req.user.role`) nằm trong danh sách `allowed` truyền vào.
// Sử dụng: `authorize('admin', 'staff')` hoặc `authorize()` nếu không giới hạn vai trò.
function authorize(...allowed) {
  return (req, res, next) => {
    const user = req.user;
    // Chưa xác thực (chưa có req.user) → từ chối
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    // Không truyền danh sách vai trò → không hạn chế, cho qua
    if (allowed.length === 0) return next();

    // Kiểm tra vai trò có nằm trong danh sách cho phép hay không
    const ok = allowed.includes(user.role);
    if (!ok) return res.status(403).json({ message: 'Forbidden' });

    // Đủ điều kiện → cho qua
    return next();
  };
}

module.exports = authorize;
