// Middleware 404: API không tồn tại
// Đặt middleware này sau tất cả các route để bắt mọi đường dẫn
// không khớp và trả về thông báo 404 rõ ràng cho client.
function notFound(req, res, next) {
  res.status(404).json({ error: 'Không tìm thấy tài nguyên' });
}

// Middleware xử lý lỗi chung
// Đặt sau `notFound` và sau toàn bộ hệ thống route/middleware ở app.
// Nhận lỗi thông qua `next(err)` hoặc các lỗi runtime ném ra trong luồng.
// Không trả về stack trace cho client để tránh lộ thông tin nội bộ.
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Lỗi máy chủ nội bộ' });
}

module.exports = { notFound, errorHandler };
