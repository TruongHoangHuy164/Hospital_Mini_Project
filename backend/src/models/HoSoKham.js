const mongoose = require('mongoose');

// Mô hình Hồ sơ khám: lưu thông tin lần khám, chẩn đoán, hướng điều trị và tình trạng
const HoSoKhamSchema = new mongoose.Schema(
  {
    lichKhamId: { type: mongoose.Schema.Types.ObjectId, ref: 'LichKham', required: true, index: true },
    benhNhanId: { type: mongoose.Schema.Types.ObjectId, ref: 'BenhNhan', required: true, index: true },
    bacSiId: { type: mongoose.Schema.Types.ObjectId, ref: 'BacSi', required: true, index: true },
    ngayKham: { type: Date, default: Date.now },
    chanDoan: { type: String },
    huongDieuTri: { type: String, enum: ['ngoai_tru', 'noi_tru', 'chuyen_vien', 'ke_don'], index: true },
    // Bổ sung thông tin lâm sàng
    trieuChung: { type: String },
    khamLamSang: { type: String },
    sinhHieu: {
      huyetAp: { type: String },
      nhipTim: { type: Number },
      nhietDo: { type: Number },
      canNang: { type: Number },
      chieuCao: { type: Number },
    },
    trangThai: { type: String, enum: ['dang_kham', 'cho_ket_qua', 'hoan_tat'], default: 'dang_kham', index: true },
    ketThucLuc: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HoSoKham', HoSoKhamSchema);
