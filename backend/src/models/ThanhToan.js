const mongoose = require('mongoose');

const ThanhToanSchema = new mongoose.Schema(
  {
    hoSoKhamId: { type: mongoose.Schema.Types.ObjectId, ref: 'HoSoKham', required: true, index: true },
    soTien: { type: Number, required: true, min: 0 },
    // hinhThuc: hình thức thanh toán (ví dụ: BHYT, tiền mặt, momo, chuyen_khoan)
    hinhThuc: { type: String, enum: ['BHYT', 'tien_mat', 'momo', 'chuyen_khoan'], required: true, index: true },
    // trạng thái thanh toán để hỗ trợ cổng thanh toán (PENDING khi tạo request, PAID khi xác nhận)
    status: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING', index: true },
    ngayThanhToan: { type: Date, default: Date.now, index: true },
    // Thông tin liên quan tới MoMo (nếu thanh toán bằng MoMo)
    momoTransactionId: { type: String },
    // Lưu phản hồi / raw payload từ MoMo (dùng debug/tracking)
    rawResponse: { type: mongoose.Schema.Types.Mixed },
    // Optional: which domain entities this payment covers (e.g. lab orders, prescription)
    targetType: { type: String, enum: ['canlamsang','donthuoc','hosokham'], default: 'hosokham', index: true },
    orderRefs: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

// Compound indexes to accelerate typical reporting queries
// Filter by status + date range and group by targetType
ThanhToanSchema.index({ status: 1, ngayThanhToan: 1, targetType: 1 });
// Queries by method over time (optional future use)
ThanhToanSchema.index({ hinhThuc: 1, ngayThanhToan: 1 });

module.exports = mongoose.model('ThanhToan', ThanhToanSchema);
