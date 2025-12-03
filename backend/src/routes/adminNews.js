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
