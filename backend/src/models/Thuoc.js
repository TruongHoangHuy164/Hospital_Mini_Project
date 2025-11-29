const mongoose = require('mongoose');

// Mô hình Thuốc: thông tin nhận diện, thành phần, dạng bào chế, chỉ định và quản lý giá
const ThuocSchema = new mongoose.Schema(
  {
    // Định danh & cơ bản
    maThuoc: { type: String, trim: true, unique: true, sparse: true, index: true },
    tenThuoc: { type: String, required: true, trim: true, index: true },
    hoatChat: { type: String, trim: true, index: true }, // hoạt chất chính
    hamLuong: { type: String, trim: true }, // ví dụ: 500mg, 5mg/ml

    // Dạng bào chế & đường dùng
    dangBaoChe: { type: String, trim: true }, // viên nén, viên nang, sirô, dung dịch, tiêm...
    duongDung: { type: String, trim: true }, // uống, tiêm, nhỏ mắt, bôi ngoài da...
    donViTinh: { type: String, required: true, trim: true }, // vỉ, hộp, chai, ống...
    quyCachDongGoi: { type: String, trim: true },

    // Sản xuất & đăng ký
    soDangKy: { type: String, trim: true, unique: true, sparse: true },
    nhaSanXuat: { type: String, trim: true },
    nuocSanXuat: { type: String, trim: true },

    // Phân loại & nhóm
    nhomThuoc: { type: String, trim: true }, // kháng sinh, giảm đau, tim mạch...

    // HDSD & an toàn
    huongDanSuDung: { type: String },
    chiDinh: { type: String },
    chongChiDinh: { type: String },
    tuongTacThuoc: { type: String },
    tacDungPhu: { type: String },
    khuyenCao: { type: String },
    baoQuan: { type: String },
    hanSuDung: { type: Date },

    // Quản lý kê đơn & bảo hiểm
    yeuCauDonThuoc: { type: Boolean, default: true }, // true: thuốc kê đơn
    laThuocKiemSoat: { type: Boolean, default: false },
    laThuocBHYT: { type: Boolean, default: false },
    tyLeThanhToanBHYT: { type: Number, min: 0, max: 100, default: 0 },

    // Giá & mã
    giaNhap: { type: Number, min: 0 },
    giaBan: { type: Number, min: 0 },
    thueVAT: { type: Number, min: 0, max: 100 },
    barcode: { type: String, trim: true },
  },
  { timestamps: true }
);

// Text index: hỗ trợ tìm kiếm theo tên thuốc và hoạt chất
ThuocSchema.index({ tenThuoc: 'text', hoatChat: 'text' });

module.exports = mongoose.model('Thuoc', ThuocSchema);
