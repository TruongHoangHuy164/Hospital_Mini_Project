/*
TÓM TẮT API — Quản trị tin tức (Admin News)
- Mục tiêu: Quản lý bài viết (Post) cho khu vực quản trị: liệt kê, tạo, sửa, xóa.
- Quyền: Tất cả endpoints yêu cầu đăng nhập (`auth`) và phân quyền `admin`.
- Mô hình: `Post` với các trường: title, slug, content, coverImage, tags, author, isPublished, publishedAt.

Endpoints chính:
1) GET /api/admin/news
  - Liệt kê toàn bộ bài (mọi trạng thái), sắp xếp `createdAt` giảm dần.
  - Trả về: { items: Post[] }.

2) POST /api/admin/news
  - Tạo bài: body { title, slug, content, coverImage?, tags?, isPublished? }.
  - `author` lấy từ `req.user._id`. Nếu `isPublished=true` thì set `publishedAt=now`.
  - Trả về 201 cùng bản ghi mới.

3) PUT /api/admin/news/:id
  - Cập nhật các trường { title, slug, content, coverImage, tags, isPublished }.
  - Nếu `isPublished` là boolean: `true` -> set `publishedAt=now`, `false` -> `publishedAt=undefined`.
  - 404 nếu không tìm thấy.

4) DELETE /api/admin/news/:id
  - Xóa bài viết theo id; 404 nếu không tìm thấy.

Ghi chú:
- Khuyến nghị index: Post(slug) unique, Post(createdAt), Post(isPublished,publishedAt).
- Kiểm tra trùng `slug` phía DB hoặc trước khi tạo/cập nhật để tránh xung đột.
*/
const express = require('express');
const Post = require('../models/Post');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const router = express.Router();

// Admin: list all posts
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json({ items: posts });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load posts', error: err.message });
  }
});

// Admin: create post
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { title, slug, content, coverImage, tags, isPublished } = req.body;
    const post = await Post.create({
      title, slug, content, coverImage, tags,
      author: req.user._id,
      isPublished: !!isPublished,
      publishedAt: isPublished ? new Date() : undefined,
    });
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create post', error: err.message });
  }
});

// Admin: update post
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, content, coverImage, tags, isPublished } = req.body;
    const update = { title, slug, content, coverImage, tags, isPublished };
    if (typeof isPublished === 'boolean') {
      update.publishedAt = isPublished ? new Date() : undefined;
    }
    const post = await Post.findByIdAndUpdate(id, update, { new: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update post', error: err.message });
  }
});

// Admin: delete post
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findByIdAndDelete(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete post', error: err.message });
  }
});

module.exports = router;
