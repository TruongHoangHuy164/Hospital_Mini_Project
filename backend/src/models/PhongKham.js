const mongoose = require('mongoose');

// Mô hình Phòng khám: lưu tên phòng, chuyên khoa và liên kết chuyên khoa
const PhongKhamSchema = new mongoose.Schema(
  {
    tenPhong: { type: String, required: true, trim: true },
    chuyenKhoa: { type: String, required: true, trim: true, index: true },
    chuyenKhoaId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChuyenKhoa', index: true },
  },
  { timestamps: true }
);

// Text index hỗ trợ tìm kiếm theo tên phòng và chuyên khoa
PhongKhamSchema.index({ tenPhong: 'text', chuyenKhoa: 'text' });

module.exports = mongoose.model('PhongKham', PhongKhamSchema);
