const mongoose = require('mongoose');

// Chi tiết mô tả sản phẩm thuốc trong kho (text + html)
const ChiTietSchema = new mongoose.Schema(
  {
    thanh_phan: { text: String, html: String },
    cong_dung: { text: String, html: String },
    cach_dung: { text: String, html: String },
    tac_dung_phu: { text: String, html: String },
    luu_y: { text: String, html: String },
    bao_quan: { text: String, html: String },
    anh_san_pham: [String],
  },
  { _id: false }
);

// Mô hình Kho thuốc: lưu thông tin sản phẩm, đơn vị, mô tả, loại thuốc và chi tiết
const ThuocKhoSchema = new mongoose.Schema(
  {
    link: { type: String, required: true, trim: true },
    ten_san_pham: { type: String, required: true, trim: true, index: true },
    gia: { type: Number, default: 0 },
    don_vi: { type: String, trim: true },
    mo_ta: { type: String },
    don_vi_dang_chon: { type: String, trim: true },
    loaiThuoc: { type: mongoose.Schema.Types.ObjectId, ref: 'LoaiThuoc', index: true },
    chi_tiet: { type: ChiTietSchema, default: {} },
  },
  { timestamps: true }
);

// Text index: hỗ trợ tìm kiếm theo tên sản phẩm
ThuocKhoSchema.index({ ten_san_pham: 'text' });

module.exports = mongoose.model('ThuocKho', ThuocKhoSchema);
