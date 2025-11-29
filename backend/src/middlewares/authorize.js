// Middleware phân quyền: chỉ cho phép các vai trò nằm trong danh sách `allowed`
function authorize(...allowed) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (allowed.length === 0) return next();
    const ok = allowed.includes(user.role);
    if (!ok) return res.status(403).json({ message: 'Forbidden' });
    return next();
  };
}

module.exports = authorize;
