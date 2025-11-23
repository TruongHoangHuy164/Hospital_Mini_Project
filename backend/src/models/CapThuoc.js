const mongoose = require('mongoose');

const CapThuocSchema = new mongoose.Schema(
  {
    donThuocId: { type: mongoose.Schema.Types.ObjectId, ref: 'DonThuoc', required: true, index: true },
    // Đổi tham chiếu từ Thuoc sang ThuocKho để đồng bộ với hệ thống inventory
    thuocId: { type: mongoose.Schema.Types.ObjectId, ref: 'ThuocKho', required: true, index: true },
    soLuong: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CapThuoc', CapThuocSchema);
