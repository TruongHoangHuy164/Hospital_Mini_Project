const mongoose = require('mongoose');

// Mô hình bài viết (Post)
// - title: tiêu đề
// - slug: định danh duy nhất dạng URL (unique + index để tìm nhanh)
// - content: nội dung bài viết
// - coverImage: ảnh bìa (đường dẫn/URL)
// - tags: danh sách thẻ (phân loại/tìm kiếm)
// - author: tác giả (tham chiếu User)
// - isPublished: trạng thái xuất bản
// - publishedAt: thời điểm xuất bản (nếu đã xuất bản)
// Dùng timestamps để có createdAt/updatedAt mặc định.
const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  content: { type: String, required: true },
  coverImage: { type: String },
  tags: [{ type: String }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);
