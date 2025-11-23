const mongoose = require('mongoose');

const SoThuTuSchema = new mongoose.Schema(
  {
    lichKhamId: { type: mongoose.Schema.Types.ObjectId, ref: 'LichKham', index: true },
    benhNhanId: { type: mongoose.Schema.Types.ObjectId, ref: 'BenhNhan', required: true, index: true },
    soThuTu: { type: Number, required: true, index: true },
    thoiGianDangKy: { type: Date, default: Date.now },
    trangThai: { type: String, enum: ['dang_cho', 'da_goi', 'da_kham', 'bo_qua'], default: 'dang_cho', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SoThuTu', SoThuTuSchema);
