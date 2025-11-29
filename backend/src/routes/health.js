const { Router } = require('express');
const { getDbStatus } = require('../db/mongo');
const router = Router();

router.get('/', (req, res) => {
  // ===== Health check =====
  // Trả về trạng thái hệ thống: `status`, `uptime`, `timestamp`, `db`.
  // - `db` lấy từ `getDbStatus()` cho biết kết nối Mongo hiện tại.
  res.json({
    status: 'up',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: getDbStatus(),
  });
});

module.exports = router;
