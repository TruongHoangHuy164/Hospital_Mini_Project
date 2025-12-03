const express = require('express');
const Post = require('../models/Post');
const router = express.Router();

// GET /api/news - list published posts with optional tag and pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, tag } = req.query;
    const filter = { isPublished: true };
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
    res.status(500).json({ message: 'Failed to load news', error: err.message });
  }
});

// GET /api/news/:slug - get single published post
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await Post.findOne({ slug, isPublished: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load post', error: err.message });
  }
});

module.exports = router;
