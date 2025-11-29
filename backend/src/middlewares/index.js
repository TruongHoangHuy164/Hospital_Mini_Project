// Middleware 404: API không tồn tại
function notFound(req, res, next) {
  res.status(404).json({ error: 'Không tìm thấy tài nguyên' });
}

// eslint-disable-next-line no-unused-vars
// Middleware xử lý lỗi chung
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Lỗi máy chủ nội bộ' });
}

module.exports = { notFound, errorHandler };
