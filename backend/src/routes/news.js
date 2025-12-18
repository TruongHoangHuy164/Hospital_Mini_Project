/*
TÓM TẮT API — Tin tức (News)
- Mục tiêu: Công bố bài viết đã xuất bản cho người dùng; xem chi tiết theo slug.
- Quyền: Public (không yêu cầu đăng nhập) vì chỉ trả bài đã `isPublished=true`.
- Mô hình: `Post` với các trường chính: title, slug, coverImage, tags, publishedAt, isPublished.

Endpoints chính:
1) GET /api/news?q? (không dùng) & tag? & page=1 & limit=10
  - Liệt kê bài đã xuất bản, lọc theo `tag` nếu có.
  - Sắp xếp: `publishedAt` giảm dần. Chỉ select các trường: title, slug, coverImage, tags, publishedAt.
  - Phân trang: `page>=1`, `limit` số dương. Trả về: { items, total, page, limit }.

2) GET /api/news/:slug
  - Lấy chi tiết 1 bài viết đã xuất bản theo `slug`; 404 nếu không tồn tại.

Ghi chú:
- Khuyến nghị index: Post(isPublished, publishedAt), Post(slug), Post(tags).
*/
const express = require('express');
const Post = require('../models/Post');
const router = express.Router();

// GET /api/news - liệt kê bài viết đã xuất bản, hỗ trợ lọc theo tag và phân trang
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, tag } = req.query;
    const filter = { isPublished: true };
    // Nếu có tag, lọc theo tag tương ứng
    if (tag) filter.tags = tag;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Post.find(filter)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('title slug coverImage tags publishedAt'),
      Post.countDocuments(filter)
    ]);
    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    // Lỗi tải danh sách tin tức
    res.status(500).json({ message: 'Không thể tải danh sách tin tức', error: err.message });
  }
});

// GET /api/news/:slug - lấy chi tiết một bài viết đã xuất bản theo slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await Post.findOne({ slug, isPublished: true });
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    res.json(post);
  } catch (err) {
    // Lỗi tải chi tiết bài viết
    res.status(500).json({ message: 'Không thể tải bài viết', error: err.message });
  }
});

module.exports = router;
