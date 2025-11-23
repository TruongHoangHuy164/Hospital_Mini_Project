const mongoose = require('mongoose');

const BacSiSchema = new mongoose.Schema(
  {
    // Mã bác sĩ nội bộ (nếu có)
    maSo: { type: String, trim: true, unique: true, sparse: true, index: true },

    // Họ tên và thông tin cơ bản
    hoTen: { type: String, required: true, trim: true },
    gioiTinh: { type: String, enum: ['nam', 'nu', 'khac'], default: 'khac' },
    ngaySinh: { type: Date },

    // Liên hệ
    soDienThoai: { type: String, index: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    diaChi: { type: String },

    // Chuyên môn & đơn vị công tác
    chuyenKhoa: { type: String, required: true, trim: true, index: true },
    phongKhamId: { type: mongoose.Schema.Types.ObjectId, ref: 'PhongKham', required: true, index: true },

  // Liên kết tài khoản hệ thống (User)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, unique: true, sparse: true },

    // Trình độ & chức danh
    hocVi: { type: String, trim: true }, // ví dụ: BS, BSCKI, BSCKII, ThS, TS, PGS, GS
    chucDanh: { type: String, trim: true }, // ví dụ: Trưởng khoa, Bác sĩ điều trị
    namKinhNghiem: { type: Number, min: 0 },

    // Hiển thị & mô tả
    anhDaiDien: { type: String }, // URL ảnh
    moTa: { type: String }, // giới thiệu ngắn/bio

    // Trạng thái làm việc & tình trạng realtime
    trangThai: { type: String, enum: ['dang_cong_tac', 'tam_nghi', 'da_nghi'], default: 'dang_cong_tac', index: true },
    trangThaiHienTai: { type: String, enum: ['dang_kham','nghi','ban'], default: 'nghi', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BacSi', BacSiSchema);
