const mongoose = require('mongoose');

const LoaiThuocSchema = new mongoose.Schema(
  {
    ten: { type: String, required: true, trim: true, unique: true, index: true },
    mo_ta: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LoaiThuoc', LoaiThuocSchema);
