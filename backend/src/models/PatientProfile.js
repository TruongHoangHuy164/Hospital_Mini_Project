const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');

const patientProfileSchema = new mongoose.Schema(
  {
    maHoSo: {
      type: String,
      unique: true,
    },
    // Liên kết với tài khoản đã tạo hồ sơ này
    id_nguoiTao: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hoTen: {
      type: String,
      required: [true, 'Họ tên là bắt buộc'],
      trim: true,
    },
    ngaySinh: {
      type: Date,
      required: [true, 'Ngày sinh là bắt buộc'],
    },
    gioiTinh: {
      type: String,
      required: [true, 'Giới tính là bắt buộc'],
      enum: ['Nam', 'Nữ', 'Khác'],
    },
    soDienThoai: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    cccd: {
      type: String,
      trim: true,
    },
    hoChieu: {
      type: String,
      trim: true,
    },
    quocGia: {
      type: String,
      default: 'Việt Nam',
    },
    danToc: {
      type: String,
    },
    ngheNghiep: {
      type: String,
    },
    tinhThanh: {
      type: String,
    },
    quanHuyen: {
      type: String,
    },
    phuongXa: {
      type: String,
    },
    diaChi: {
      type: String,
    },
    quanHe: {
      type: String,
      required: [true, 'Mối quan hệ là bắt buộc'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Middleware để tự động tạo mã hồ sơ trước khi lưu
patientProfileSchema.pre('save', function (next) {
  if (!this.maHoSo) {
    // Tạo mã ngẫu nhiên theo định dạng HSXX-XXXXXXX
    const nanoid = customAlphabet('0123456789', 9);
    const randomPart = nanoid();
    this.maHoSo = `HS${randomPart.substring(0, 2)}-${randomPart.substring(2)}`;
  }
  next();
});

// Unique index cho số điện thoại trong hồ sơ người thân
patientProfileSchema.index({ soDienThoai: 1 }, { unique: true, sparse: true });
const PatientProfile = mongoose.model('PatientProfile', patientProfileSchema);

module.exports = PatientProfile;
