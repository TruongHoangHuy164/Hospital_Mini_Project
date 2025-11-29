const express = require('express');
const Busboy = require('busboy');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();

const destDir = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(destDir, { recursive: true });

router.post('/image', (req, res) => {
  // ===== Upload ảnh đại diện =====
  // Endpoint: POST /api/uploads/image
  // - Chỉ chấp nhận file ảnh (jpeg/png/gif/webp/bmp/svg+xml)
  // - Giới hạn 1 file, tối đa 5MB
  // - Trả về `url` tương đối để client sử dụng hiển thị
  const bb = Busboy({ headers: req.headers, limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
  let savedFilePath = null;
  let responded = false;

  function safeRespond(status, payload) {
    if (responded) return;
    responded = true;
    res.status(status).json(payload);
  }

  bb.on('file', (_, file, info) => {
    const { filename, mimeType } = info || {};
    const allowed = /^image\/(jpeg|png|gif|webp|bmp|svg\+xml)$/;
    if (!allowed.test(mimeType || '')) {
      file.resume();
      return safeRespond(400, { message: 'Chỉ cho phép upload ảnh' });
    }
    // Tạo tên file ngẫu nhiên theo đuôi file gốc
    const ext = path.extname(filename || '').toLowerCase() || '.jpg';
    const base = crypto.randomUUID ? crypto.randomUUID() : (Date.now() + '-' + Math.round(Math.random() * 1e9));
    const finalName = `${base}${ext}`;
    const finalPath = path.join(destDir, finalName);
    savedFilePath = finalPath;
    const ws = fs.createWriteStream(finalPath);
    file.pipe(ws);
    ws.on('error', (err) => {
      try { fs.unlinkSync(finalPath); } catch {}
      safeRespond(500, { message: 'Lỗi lưu file', error: err?.message });
    });
  });

  bb.on('filesLimit', () => {
    safeRespond(400, { message: 'Vượt quá số lượng file cho phép' });
  });

  bb.on('finish', () => {
    if (!savedFilePath) return safeRespond(400, { message: 'Không có file' });
    const rel = `/uploads/avatars/${path.basename(savedFilePath)}`;
    safeRespond(201, { url: rel });
  });

  bb.on('error', (err) => {
    safeRespond(500, { message: 'Lỗi xử lý upload', error: err?.message });
  });

  req.pipe(bb);
});

module.exports = router;
