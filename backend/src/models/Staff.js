const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema(
  {
    maSo: { type: String, trim: true, unique: true, sparse: true, index: true },
    hoTen: { type: String, required: true, trim: true },
    gioiTinh: { type: String, enum: ['nam', 'nu', 'khac'], default: 'khac' },
    ngaySinh: { type: Date },
    soDienThoai: { type: String, index: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    diaChi: { type: String },
  vaiTro: { type: String, enum: ['reception','lab','cashier','nurse','pharmacy'], required: true, index: true },
    phongKhamId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhongKham', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, unique: true, sparse: true },
    trangThai: { type: String, enum: ['dang_cong_tac', 'tam_nghi', 'da_nghi'], default: 'dang_cong_tac', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', StaffSchema);
