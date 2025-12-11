const mongoose = require('mongoose');

// Nạp tất cả model để Mongoose đăng ký (cần thiết trước khi sync index)
require('../models/BenhNhan');
require('../models/SoThuTu');
require('../models/PhongKham');
require('../models/BacSi');
require('../models/HoSoKham');
require('../models/CanLamSang');
require('../models/ThanhToan');
require('../models/DonThuoc');
require('../models/CapThuoc');

// Đồng bộ hoá index (theo schema) cho tất cả model đã đăng ký
// Lưu ý:
// - syncIndexes sẽ tạo/cập nhật index theo định nghĩa trong schema
// - Không xoá index không thuộc schema (khác với ensureIndexes ở phiên bản cũ)
// - Nên chạy sau khi kết nối MongoDB và load đầy đủ model
async function syncAllIndexes() {
  const modelNames = mongoose.modelNames();
  for (const name of modelNames) {
    try {
      const Model = mongoose.model(name);
      await Model.syncIndexes();
      // console.log(`Đã đồng bộ index cho ${name}`);
    } catch (e) {
      console.error(`Lỗi đồng bộ index cho ${name}:`, e.message);
    }
  }
}

module.exports = { syncAllIndexes };
