const mongoose = require('mongoose');

// Mô hình Chuyên khoa: lưu tên và mô tả, dùng để phân loại dịch vụ/phòng khám
const ChuyenKhoaSchema = new mongoose.Schema(
  {
    ten: { type: String, required: true, trim: true, unique: true },
    moTa: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChuyenKhoa', ChuyenKhoaSchema);
