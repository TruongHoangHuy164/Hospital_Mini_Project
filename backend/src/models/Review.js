const mongoose = require('mongoose');

// Mô hình đánh giá (Review)
// - user: người tạo đánh giá (tham chiếu tới User)
// - rating: điểm số từ 1 đến 5 (ràng buộc min/max)
// - comment: nhận xét (tùy chọn)
// Sử dụng timestamps để tự động thêm createdAt/updatedAt.
const ReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
}, { timestamps: true });

// Tạo index theo user và createdAt để tối ưu truy vấn lịch sử đánh giá của người dùng
ReviewSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
