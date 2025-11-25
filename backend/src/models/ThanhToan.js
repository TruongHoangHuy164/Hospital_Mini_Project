const mongoose = require('mongoose');

const ThanhToanSchema = new mongoose.Schema(
  {
    hoSoKhamId: { type: mongoose.Schema.Types.ObjectId, ref: 'HoSoKham', required: true, index: true },
    soTien: { type: Number, required: true, min: 0 },
    // hinhThuc: hình thức thanh toán (ví dụ: BHYT, tiền mặt, momo)
    hinhThuc: { type: String, enum: ['BHYT', 'tien_mat', 'momo'], required: true, index: true },
    // trạng thái thanh toán để hỗ trợ cổng thanh toán (PENDING khi tạo request, PAID khi xác nhận)
    status: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING', index: true },
    ngayThanhToan: { type: Date, default: Date.now },
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

module.exports = mongoose.model('ThanhToan', ThanhToanSchema);
