const mongoose = require('mongoose');

// Mô hình Bệnh nhân: lưu thông tin cá nhân, liên hệ, ngày sinh và BHYT
const BenhNhanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    hoTen: { type: String, required: true, trim: true },
    ngaySinh: { type: Date },
    gioiTinh: { type: String, enum: ['nam', 'nu', 'khac'], default: 'khac' },
    diaChi: { type: String },
    soDienThoai: { type: String, trim: true },
    maBHYT: { type: String, trim: true },
  },
  { timestamps: true }
);

// Unique index cho số điện thoại bệnh nhân (cho phép null/undefined)
BenhNhanSchema.index({ soDienThoai: 1 }, { unique: true, sparse: true });
module.exports = mongoose.model('BenhNhan', BenhNhanSchema);
