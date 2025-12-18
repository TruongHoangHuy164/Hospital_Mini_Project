const express = require('express');
const Review = require('../models/Review');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const router = express.Router();

// ===== Tóm tắt API Đánh giá (reviews) =====
// Quyền hạn:
// - GET công khai; tạo/sửa/xoá phụ thuộc xác thực hoặc quyền admin.
//
// - GET    /api/reviews                 : Lấy danh sách đánh giá mới nhất (tham số limit)
// - POST   /api/reviews                 : Tạo đánh giá (auth) — rating 1..5, comment tùy chọn
// - DELETE /api/reviews/:id             : Admin xóa đánh giá bất kỳ (auth + admin)
// - PUT    /api/reviews/:id             : Người dùng sửa đánh giá của chính mình (auth)
// - DELETE /api/reviews/:id/own         : Người dùng xóa đánh giá của chính mình (auth)

// GET /api/reviews - latest reviews
router.get('/', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const items = await Review.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('user', 'name role');
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load reviews', error: err.message });
  }
});

// POST /api/reviews - submit a review (auth required)
router.post('/', auth, async (req, res) => {
  try {
    let { rating, comment } = req.body;
    rating = Number(rating);
    if (!Number.isFinite(rating)) return res.status(400).json({ message: 'Rating must be a number' });
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });

    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const review = await Review.create({ user: userId, rating, comment });
    res.status(201).json(review);
  } catch (err) {
    const status = err.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ message: 'Failed to submit review', error: err.message });
  }
});

module.exports = router;

// Admin: delete a review
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const r = await Review.findByIdAndDelete(id);
    if (!r) return res.status(404).json({ message: 'Review not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete review', error: err.message });
  }
});

// User: update own review
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    let { rating, comment } = req.body;
    rating = Number(rating);
    if (!Number.isFinite(rating)) return res.status(400).json({ message: 'Rating must be a number' });
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });

    const userId = req.user?.id || req.user?._id;
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (String(review.user) !== String(userId)) return res.status(403).json({ message: 'Forbidden' });

    review.rating = rating;
    review.comment = comment;
    await review.save();
    res.json(review);
  } catch (err) {
    const status = err.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ message: 'Failed to update review', error: err.message });
  }
});

// User: delete own review
router.delete('/:id/own', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (String(review.user) !== String(userId)) return res.status(403).json({ message: 'Forbidden' });
    await review.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete review', error: err.message });
  }
});
