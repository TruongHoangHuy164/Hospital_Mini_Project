const mongoose = require('mongoose');

// Mô hình Loại thuốc: danh mục/nhóm thuốc để phân loại kho thuốc
const LoaiThuocSchema = new mongoose.Schema(
  {
    ten: { type: String, required: true, trim: true, unique: true, index: true },
    mo_ta: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LoaiThuoc', LoaiThuocSchema);
