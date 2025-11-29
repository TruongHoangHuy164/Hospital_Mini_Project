const mongoose = require('mongoose');

const ThanhToanSchema = new mongoose.Schema(
  {
    hoSoKhamId: { type: mongoose.Schema.Types.ObjectId, ref: 'HoSoKham', required: true, index: true },
    soTien: { type: Number, required: true, min: 0 },
    // hinhThuc: hình thức thanh toán (chỉ còn: tiền mặt, momo)
    hinhThuc: { type: String, enum: ['tien_mat', 'momo'], required: true, index: true },
    // trạng thái thanh toán (cho_xu_ly khi tạo; da_thanh_toan khi xác nhận; that_bai khi lỗi)
    status: { type: String, enum: ['cho_xu_ly', 'da_thanh_toan', 'that_bai'], default: 'cho_xu_ly', index: true },
    ngayThanhToan: { type: Date, default: Date.now, index: true },
    // Thông tin liên quan tới MoMo (nếu thanh toán bằng MoMo)
    momoTransactionId: { type: String },
    // Lưu phản hồi / raw payload từ MoMo (dùng debug/tracking)
    rawResponse: { type: mongoose.Schema.Types.Mixed },
    // Đối tượng áp dụng thanh toán (ví dụ: cận lâm sàng, đơn thuốc, hồ sơ khám)
    targetType: { type: String, enum: ['canlamsang','donthuoc','hosokham'], default: 'hosokham', index: true },
    orderRefs: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

// Chỉ mục tổng hợp để tăng tốc các truy vấn báo cáo thường gặp
// Lọc theo trạng thái + khoảng thời gian và nhóm theo `targetType`
ThanhToanSchema.index({ status: 1, ngayThanhToan: 1, targetType: 1 });
// Truy vấn theo hình thức thanh toán theo thời gian (dùng cho tương lai nếu cần)
ThanhToanSchema.index({ hinhThuc: 1, ngayThanhToan: 1 });

module.exports = mongoose.model('ThanhToan', ThanhToanSchema);
